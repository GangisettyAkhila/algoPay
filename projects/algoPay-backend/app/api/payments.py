"""
Payment API Routes with Agent Loop
All time handling is in IST (Asia/Kolkata)
Safe, idempotent execution with double-execution prevention
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from zoneinfo import ZoneInfo
import asyncio
import threading
from app.core.agent_executor import agent_executor
from app.services.payment_executor import payment_executor


router = APIRouter(prefix="/api", tags=["payments"])

# ============== IST TIMEZONE ==============
IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return datetime.now(IST)


def parse_deadline(deadline_str: str) -> datetime:
    dt = datetime.fromisoformat(deadline_str.replace("Z", "+05:30"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt


def format_ist(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")


# ============== STRICT STATUS TYPE ==============
TaskStatus = Literal["pending", "executing", "paid", "failed"]


def validate_status(status: str) -> str:
    """Validate status is one of allowed values, fail loudly if invalid"""
    valid = ["pending", "executing", "paid", "failed"]
    if status not in valid:
        raise ValueError(f"Invalid task status: '{status}'. Must be one of: {valid}")
    return status


# ============== PYDANTIC MODELS ==============


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Task description")
    amount: float = Field(..., gt=0, description="Amount in ALGO")
    recipient: str = Field(
        ..., min_length=58, max_length=58, description="Algorand address"
    )
    deadline: str = Field(..., description="ISO 8601 deadline")


class Task(BaseModel):
    """Strict task model - all fields required"""

    id: str
    title: str
    amount: float
    recipient: str
    deadline: str
    status: str = "pending"
    txid: Optional[str] = None
    error: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str
    executed_at: Optional[str] = None


# ============== IN-MEMORY STORE WITH LOCKING ==============
tasks_db: List[Task] = []
task_locks: dict[str, asyncio.Lock] = {}

# Lock for thread-safe task operations
db_lock = asyncio.Lock()


def get_task_lock(task_id: str) -> asyncio.Lock:
    """Get or create a lock for a specific task"""
    if task_id not in task_locks:
        task_locks[task_id] = asyncio.Lock()
    return task_locks[task_id]


def get_backend_sender() -> str:
    """Get backend agent wallet address"""
    return payment_executor._get_backend_address()


# ============== AGENT LOOP ==============


async def agent_loop():
    """Background loop that checks for due tasks and executes them safely."""
    print("[AGENT] Agent loop started")

    while True:
        try:
            current_time = now_ist()

            for task in tasks_db:
                # Skip non-pending tasks - prevents double execution
                if task.status != "pending":
                    # Log status of non-pending tasks
                    if task.status == "paid":
                        print(
                            f"[AGENT] Task {task.id} already paid (txid: {task.txid})"
                        )
                    elif task.status == "failed":
                        print(f"[AGENT] Task {task.id} failed: {task.error}")
                    continue

                try:
                    deadline = parse_deadline(task.deadline)
                except Exception as e:
                    print(f"[AGENT] Invalid deadline for {task.id}: {e}")
                    continue

                # Check if deadline passed
                if current_time >= deadline:
                    print(f"[AGENT] Task {task.id} is due! Scheduling execution...")
                    # Execute in a safe, idempotent way
                    await execute_task_safe(task.id)
                else:
                    remaining = (deadline - current_time).total_seconds()
                    if remaining < 60:
                        print(f"[AGENT] Task {task.id} due in {remaining:.0f}s")

        except Exception as e:
            print(f"[AGENT] Error in agent loop: {e}")

        await asyncio.sleep(10)


async def execute_task_safe(task_id: str) -> Optional[Task]:
    """Execute a task SAFELY - prevents double execution"""
    # Get task-specific lock for atomic operations
    task_lock = get_task_lock(task_id)

    async with task_lock:
        # Find the task
        task = next((t for t in tasks_db if t.id == task_id), None)

        if not task:
            print(f"[TASK] Task {task_id} not found - skipping")
            return None

        # ===== SAFETY CHECK: PREVENT DOUBLE EXECUTION =====
        # If task already has txid, it's already been paid - skip
        if task.txid is not None and task.status == "paid":
            print(f"[TASK] SKIPPED: Task {task_id} already has txid - already paid")
            return task

        # If task is already executing or done, skip
        if task.status != "pending":
            print(
                f"[TASK] SKIPPED: Task {task_id} status is '{task.status}' - not pending"
            )
            return task

        # ===== ATOMIC STATUS UPDATE =====
        print(f"[TASK] Acquiring task lock for {task_id}")
        task.status = "executing"
        task.executed_at = format_ist(now_ist())
        print(f"[TASK] Marked {task_id} as 'executing' (atomic)")

        # ===== PRE-EXECUTION SAFETY CHECKS =====
        agent_address = get_backend_sender()

        # Check balance
        balance_before = payment_executor.get_balance(agent_address)
        amount_micro = int(task.amount * 1_000_000)

        print(
            f"[TASK] Balance check: {balance_before} microAlgo available, need {amount_micro}"
        )

        if balance_before < amount_micro:
            task.status = "failed"
            task.error = (
                f"Insufficient funds: need {amount_micro}, have {balance_before}"
            )
            print(f"[TASK] FAILED: Insufficient funds for {task_id}")
            return task

        # Validate recipient address
        if not task.recipient or len(task.recipient) != 58:
            task.status = "failed"
            task.error = "Invalid recipient address"
            print(f"[TASK] FAILED: Invalid recipient for {task_id}")
            return task

        # Validate amount
        if task.amount <= 0:
            task.status = "failed"
            task.error = "Invalid amount"
            print(f"[TASK] FAILED: Invalid amount for {task_id}")
            return task

        print(f"[TASK] All safety checks passed for {task_id}")
        print(
            f"[TASK] Executing payment: {task.amount} ALGO → {task.recipient[:10]}..."
        )

        # ===== EXECUTE PAYMENT =====
        try:
            result = agent_executor.execute(
                sender=agent_address, receiver=task.recipient, amount_algo=task.amount
            )

            if result.status == "success":
                # ===== VERIFY TXID EXISTS =====
                if not result.txid:
                    task.status = "failed"
                    task.error = "Transaction sent but no TXID returned"
                    print(f"[TX ERROR] No TXID returned for {task_id}")
                    return task

                # Check if this TXID was already used (idempotency)
                existing_task = next(
                    (t for t in tasks_db if t.txid == result.txid and t.id != task_id),
                    None,
                )
                if existing_task:
                    task.status = "failed"
                    task.error = f"Duplicate TXID detected: {result.txid}"
                    print(f"[TX ERROR] Duplicate TXID for {task_id}: {result.txid}")
                    return task

                # ===== SUCCESS =====
                task.status = "paid"
                task.txid = result.txid
                task.paid_at = format_ist(now_ist())

                balance_after = payment_executor.get_balance(agent_address)

                print(f"[TX SUCCESS] ✅ Task {task_id} PAID!")
                print(f"[TX SUCCESS] TXID: {result.txid}")
                print(
                    f"[TX SUCCESS] Balance: {balance_before} → {balance_after} microAlgo"
                )
            else:
                # ===== EXECUTION FAILED =====
                task.status = "failed"
                task.error = result.reason or result.message
                print(f"[TX FAILED] Task {task_id}: {task.error}")

            return task

        except Exception as e:
            # ===== EXCEPTION DURING EXECUTION =====
            # Do NOT retry automatically - prevents double payment
            task.status = "failed"
            task.error = str(e)
            print(f"[TX ERROR] Exception during {task_id}: {e}")
            print(
                f"[TX ERROR] NOT retrying - task marked as failed to prevent double payment"
            )
            return task


# ============== MANUAL RETRY ENDPOINT ==============


async def retry_task(task_id: str) -> Optional[Task]:
    """Manually retry a failed task"""
    task = next((t for t in tasks_db if t.id == task_id), None)

    if not task:
        return None

    if task.status != "failed":
        return None

    # Reset to pending for retry
    task.status = "pending"
    task.error = None
    task.txid = None
    task.paid_at = None

    print(f"[TASK] Resetting task {task_id} for manual retry")

    # Execute immediately
    return await execute_task_safe(task_id)


# ============== API ROUTES ==============


@router.post("/tasks", response_model=Task)
async def create_task(request: CreateTaskRequest) -> Task:
    """Create a new task with strict validation"""
    # Validate recipient is a valid Algorand address
    if not request.recipient.startswith("X") and not request.recipient.startswith("7"):
        raise HTTPException(status_code=400, detail="Invalid Algorand address format")

    # Validate deadline is in the future
    try:
        deadline_dt = parse_deadline(request.deadline)
        if deadline_dt <= now_ist():
            raise HTTPException(
                status_code=400, detail="Deadline must be in the future"
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    task = Task(
        id=f"T-{len(tasks_db) + 1:03d}",
        title=request.title,
        amount=request.amount,
        recipient=request.recipient,
        deadline=request.deadline,
        status="pending",
        created_at=format_ist(now_ist()),
    )
    tasks_db.append(task)

    print(f"[API] Task created: {task.id} - {task.title}")
    return task


@router.get("/tasks", response_model=List[Task])
async def get_tasks() -> List[Task]:
    """Get all tasks"""
    return tasks_db


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str) -> Task:
    """Get a specific task"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/execute")
async def execute_task_manual(task_id: str) -> Task:
    """Manually execute a task (for testing)"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "pending":
        raise HTTPException(status_code=400, detail=f"Task already {task.status}")

    result = await execute_task_safe(task_id)
    return result


@router.post("/tasks/{task_id}/retry")
async def retry_task_manual(task_id: str) -> Task:
    """Manually retry a failed task"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "failed":
        raise HTTPException(
            status_code=400, detail=f"Cannot retry task with status '{task.status}'"
        )

    result = await retry_task(task_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to retry task")
    return result


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str) -> dict:
    """Delete a task"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    tasks_db.remove(task)
    return {"message": f"Task {task_id} deleted"}


# ============== PAYMENTS ==============


class PaymentRequest(BaseModel):
    sender: str
    receiver: str
    amount: float = Field(..., gt=0)


class PaymentResponse(BaseModel):
    status: str
    txid: Optional[str] = None
    reason: Optional[str] = None
    message: str
    logs: list[dict]
    timestamp: str
    rules_checked: list[str]


@router.post("/pay", response_model=PaymentResponse)
async def execute_payment(request: PaymentRequest) -> PaymentResponse:
    """Execute a payment through the agent"""
    result = agent_executor.execute(
        sender=request.sender, receiver=request.receiver, amount_algo=request.amount
    )

    return PaymentResponse(
        status=result.status,
        txid=result.txid,
        reason=result.reason,
        message=result.message,
        logs=result.logs,
        timestamp=result.timestamp,
        rules_checked=result.rules_checked,
    )


# ============== WALLET ==============


@router.get("/wallet/balance")
async def get_wallet_balance() -> dict:
    """Get agent wallet balance"""
    backend_address = get_backend_sender()
    balance = payment_executor.get_balance(backend_address)
    return {"balance": balance, "address": backend_address}


# ============== LOGS & STATUS ==============


@router.get("/logs")
async def get_logs(limit: int = 100) -> dict:
    """Get audit logs"""
    return {"logs": agent_executor.get_logs(limit)}


@router.get("/status")
async def get_status() -> dict:
    """Get agent status"""
    return agent_executor.get_status()


@router.get("/health")
async def health_check() -> dict:
    """Health check"""
    return {"status": "healthy", "service": "algoPay-agent", "timezone": "IST"}


# ============== DEBUG ENDPOINTS ==============


@router.get("/debug/tasks")
async def debug_tasks() -> dict:
    """Debug: Get all tasks with full details"""
    return {
        "tasks": [t.model_dump() for t in tasks_db],
        "count": len(tasks_db),
        "current_time_ist": format_ist(now_ist()),
    }


@router.get("/debug/agent-balance")
async def debug_agent_balance() -> dict:
    """Debug: Get agent balance details"""
    address = get_backend_sender()
    balance = payment_executor.get_balance(address)
    return {
        "address": address,
        "balance_micro": balance,
        "balance_algo": balance / 1_000_000,
    }


@router.get("/debug/verify/{task_id}")
async def verify_task(task_id: str) -> dict:
    """Debug: Verify a task's execution status"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    agent_address = get_backend_sender()
    agent_balance = payment_executor.get_balance(agent_address)

    return {
        "task": task.model_dump(),
        "task_status": task.status,
        "txid": task.txid,
        "error": task.error,
        "agent_balance_micro": agent_balance,
        "agent_balance_algo": agent_balance / 1_000_000,
        "verified": task.status == "paid" and task.txid is not None,
    }
