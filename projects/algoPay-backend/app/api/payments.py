"""
Payment API Routes with Agent Loop
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import asyncio
import threading
from app.core.agent_executor import agent_executor
from app.services.payment_executor import payment_executor


router = APIRouter(prefix="/api", tags=["payments"])

# ============== TASK MODEL ==============


class CreateTaskRequest(BaseModel):
    title: str
    amount: float
    recipient: str
    deadline: str


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


# In-memory task store (use database in production)
tasks_db: List[Task] = []

# Backend wallet address (used as sender)
BACKEND_SENDER = ""  # Will be set on startup


def get_backend_sender() -> str:
    """Get backend wallet address"""
    global BACKEND_SENDER
    if not BACKEND_SENDER:
        BACKEND_SENDER = payment_executor._get_backend_address()
    return BACKEND_SENDER


# ============== AGENT LOOP ==============


async def agent_loop():
    """
    Background loop that checks for due tasks and executes them.
    Runs every 10 seconds.
    """
    print("[AGENT] Agent loop started")

    while True:
        try:
            print("[AGENT] Checking tasks...")

            current_time = datetime.utcnow()

            for task in tasks_db:
                # Only process pending tasks
                if task.status != "pending":
                    continue

                # Parse deadline
                try:
                    deadline = datetime.fromisoformat(
                        task.deadline.replace("Z", "+00:00")
                    )
                except:
                    print(f"[AGENT] Invalid deadline format for {task.id}")
                    continue

                # Check if deadline has passed
                if current_time >= deadline:
                    print(f"[AGENT] Task {task.id} is due, executing...")
                    await execute_task(task.id)
                else:
                    remaining = (deadline - current_time).total_seconds()
                    print(f"[AGENT] Task {task.id} due in {remaining:.0f}s")

        except Exception as e:
            print(f"[AGENT] Error in agent loop: {e}")

        # Wait 10 seconds before next check
        await asyncio.sleep(10)


async def execute_task(task_id: str) -> Optional[Task]:
    """
    Execute a single task by calling the smart contract.
    """
    # Find task
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        print(f"[AGENT] Task {task_id} not found")
        return None

    print(f"[AGENT] Executing task {task_id}: {task.title}")
    print(f"[AGENT] Amount: {task.amount} ALGO, Recipient: {task.recipient[:10]}...")

    try:
        # Get backend sender
        sender = get_backend_sender()

        # Execute payment via agent_executor
        result = agent_executor.execute(
            sender=sender, receiver=task.recipient, amount_algo=task.amount
        )

        # Check result
        if result.status == "success":
            task.status = "paid"
            task.txid = result.txid
            task.paid_at = datetime.utcnow().isoformat()
            print(f"[AGENT] ✅ Task {task_id} PAID")
            print(f"[AGENT] TX ID: {result.txid}")
        else:
            task.status = "rejected"
            task.error = result.reason or result.message
            print(f"[AGENT] ❌ Task {task_id} REJECTED: {task.error}")

        return task

    except Exception as e:
        task.status = "rejected"
        task.error = str(e)
        print(f"[AGENT] ❌ Task {task_id} FAILED: {e}")
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
        created_at=datetime.utcnow().isoformat(),
    )
    tasks_db.append(task)

    # Log the task creation
    print(f"[AGENT] Task {task.id} created: {task.title}")
    agent_executor.audit_logger.log("INFO", f"Task {task.id} created: {task.title}")

    return task


@router.get("/tasks")
async def get_tasks() -> List[Task]:
    """Get all tasks"""
    return tasks_db


@router.post("/tasks/{task_id}/execute")
async def execute_task_manual(task_id: str) -> Task:
    """Manually execute a task (for testing)"""
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
    sender: str = Field(..., description="Sender wallet address")
    receiver: str = Field(..., description="Receiver wallet address")
    amount: float = Field(..., gt=0, description="Amount in ALGO")


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
    """Execute a payment through the agent."""
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
    """Get wallet balance"""
    backend_address = get_backend_sender()
    balance = payment_executor.get_balance(backend_address)
    return {"balance": balance}


# ============== LOGS & STATUS ==============


@router.get("/logs")
async def get_logs(limit: int = 100) -> dict:
    """Get audit logs"""
    return {"logs": agent_executor.get_logs(limit)}


@router.get("/status")
async def get_status() -> dict:
    """Get agent status and configuration"""
    return agent_executor.get_status()


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint"""
    return {"status": "healthy", "service": "algoPay-agent"}
