"""
Payment API Routes with Agent Loop
All time handling is in IST (Asia/Kolkata)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import pytz
import asyncio
from app.core.agent_executor import agent_executor
from app.services.payment_executor import payment_executor


router = APIRouter(prefix="/api", tags=["payments"])

# ============== IST TIMEZONE ==============
IST = pytz.timezone("Asia/Kolkata")


def now_ist() -> datetime:
    """Get current time in IST"""
    return datetime.now(IST)


def to_ist(dt: datetime) -> datetime:
    """Convert any datetime to IST"""
    if dt.tzinfo is None:
        return IST.localize(dt)
    return dt.astimezone(IST)


def parse_deadline(deadline_str: str) -> datetime:
    """Parse deadline string to IST datetime"""
    try:
        # Try parsing as ISO format
        dt = datetime.fromisoformat(deadline_str.replace("Z", "+05:30"))
        if dt.tzinfo is None:
            dt = IST.localize(dt)
        return dt
    except:
        raise ValueError(f"Invalid deadline format: {deadline_str}")


def format_ist(dt: datetime) -> str:
    """Format datetime as IST string"""
    if dt.tzinfo is None:
        dt = IST.localize(dt)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")


# ============== TASK MODEL ==============


class CreateTaskRequest(BaseModel):
    title: str
    amount: float
    recipient: str
    deadline: str  # ISO format with IST


class Task(BaseModel):
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


# In-memory task store
tasks_db: List[Task] = []

# Backend agent wallet address
BACKEND_AGENT_ADDRESS = ""


def get_backend_sender() -> str:
    """Get backend agent wallet address"""
    global BACKEND_AGENT_ADDRESS
    if not BACKEND_AGENT_ADDRESS:
        BACKEND_AGENT_ADDRESS = payment_executor._get_backend_address()
    return BACKEND_AGENT_ADDRESS


# ============== AGENT LOOP ==============


async def agent_loop():
    """Background loop that checks for due tasks and executes them."""
    print("[AGENT] Agent loop started")

    while True:
        try:
            current_time = now_ist()
            print(f"[AGENT] Checking tasks at {current_time.strftime('%H:%M:%S IST')}")

            for task in tasks_db:
                if task.status != "pending":
                    continue

                try:
                    deadline = parse_deadline(task.deadline)
                except:
                    print(f"[AGENT] Invalid deadline for {task.id}")
                    continue

                # Check if deadline passed (in IST)
                if current_time >= deadline:
                    print(f"[AGENT] Task {task.id} is due! Executing...")
                    await execute_task(task.id)
                else:
                    remaining = (deadline - current_time).total_seconds()
                    if remaining < 60:
                        print(f"[AGENT] Task {task.id} due in {remaining:.0f}s")

        except Exception as e:
            print(f"[AGENT] Error in agent loop: {e}")

        await asyncio.sleep(10)


async def execute_task(task_id: str) -> Optional[Task]:
    """Execute a single task"""
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        print(f"[AGENT] Task {task_id} not found")
        return None

    print(f"[AGENT] Executing: {task.title}")
    print(f"[AGENT] Amount: {task.amount} ALGO → {task.recipient[:10]}...")

    # Set status to executing
    task.status = "executing"
    task.executed_at = format_ist(now_ist())

    try:
        sender = get_backend_sender()

        print(f"[AGENT] Using agent wallet: {sender[:10]}...")
        print(f"[AGENT] Checking agent balance...")

        # Check agent balance first
        agent_balance = payment_executor.get_balance(sender)
        amount_micro = int(task.amount * 1_000_000)

        print(f"[AGENT] Agent balance: {agent_balance} microAlgo")

        if agent_balance < amount_micro:
            task.status = "failed"
            task.error = (
                f"Insufficient funds: need {amount_micro}, have {agent_balance}"
            )
            print(f"[AGENT] ❌ FAILED: Insufficient funds")
            return task

        # Execute payment
        result = agent_executor.execute(
            sender=sender, receiver=task.recipient, amount_algo=task.amount
        )

        if result.status == "success":
            task.status = "paid"
            task.txid = result.txid
            task.paid_at = format_ist(now_ist())
            print(f"[AGENT] ✅ SUCCESS: {result.txid}")
        else:
            task.status = "failed"
            task.error = result.reason or result.message
            print(f"[AGENT] ❌ FAILED: {task.error}")

        return task

    except Exception as e:
        task.status = "failed"
        task.error = str(e)
        print(f"[AGENT] ❌ EXCEPTION: {e}")
        return task


# ============== TASK ROUTES ==============


@router.post("/tasks", response_model=Task)
async def create_task(request: CreateTaskRequest) -> Task:
    """Create a new task"""
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

    print(f"[API] Task created: {task.id}")
    return task


@router.get("/tasks")
async def get_tasks() -> List[Task]:
    """Get all tasks"""
    return tasks_db


@router.post("/tasks/{task_id}/execute")
async def execute_task_manual(task_id: str) -> Task:
    """Manually execute a task"""
    task = next((t for t in tasks_db if t.id == task_id), None)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "pending":
        raise HTTPException(status_code=400, detail=f"Task already {task.status}")

    result = await execute_task(task_id)
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
    txid: Optional[str]
    reason: Optional[str]
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
