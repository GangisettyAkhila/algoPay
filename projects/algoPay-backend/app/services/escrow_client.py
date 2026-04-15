"""
TaskEscrow Backend Integration

Handles the scheduler and release logic for the escrow contract.
"""

import os
import asyncio
from datetime import datetime
from algosdk import mnemonic
from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import ApplicationCallTxn, PaymentTxn
from algosdk.transaction import wait_for_confirmation
import requests


# Escrow contract configuration
ESCROW_APP_ID = int(os.getenv("ESCROW_APP_ID", "0"))
AGENT_MNEMONIC = os.getenv("BACKEND_MNEMONIC", "")

# Algorand network
ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")


class EscrowClient:
    """Client for interacting with TaskEscrow contract."""

    def __init__(self):
        self.client = AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
        self.agent_private_key = mnemonic.to_private_key(AGENT_MNEMONIC)
        self.agent_address = mnemonic.from_private_key(self.agent_private_key)

    def get_agent_address(self) -> str:
        return self.agent_address

    def call_release(self, task_id: str) -> dict:
        """
        Call release_payment on the escrow contract.

        This is called by the agent when the task deadline is reached.
        The contract will send funds directly to the recipient.
        """
        print(f"[ESCROW] Calling release_payment for task: {task_id}")

        # Get suggested params
        params = self.client.suggested_params()

        # Build application call transaction
        # Method: release_payment(task_id: arc4.String)
        txn = ApplicationCallTxn(
            sender=self.agent_address,
            sp=params,
            index=ESCROW_APP_ID,
            on_complete=0,  # NoOp
            app_args=[
                b"release_payment",  # Method selector
                task_id.encode("utf-8"),  # task_id parameter
            ],
            fee=2000,  # Cover inner transaction fee
        )

        # Sign with agent key
        signed_txn = txn.sign(self.agent_private_key)

        # Submit to network
        txid = self.client.send_transaction(signed_txn)
        print(f"[ESCROW] Transaction submitted: {txid}")

        # Wait for confirmation
        confirmed = wait_for_confirmation(self.client, txid, timeout=30)

        print(
            f"[ESCROW] Confirmed in round: {confirmed.get('confirmed-round', 'unknown')}"
        )

        return {
            "success": True,
            "txid": txid,
            "task_id": task_id,
            "message": f"Payment released for task {task_id}",
        }

    def call_refund(self, task_id: str) -> dict:
        """Call refund_task on the escrow contract."""
        print(f"[ESCROW] Calling refund_task for task: {task_id}")

        params = self.client.suggested_params()

        txn = ApplicationCallTxn(
            sender=self.agent_address,
            sp=params,
            index=ESCROW_APP_ID,
            on_complete=0,
            app_args=[
                b"refund_task",
                task_id.encode("utf-8"),
            ],
            fee=2000,
        )

        signed_txn = txn.sign(self.agent_private_key)
        txid = self.client.send_transaction(signed_txn)
        confirmed = wait_for_confirmation(self.client, txid, timeout=30)

        return {
            "success": True,
            "txid": txid,
            "task_id": task_id,
        }

    def get_task_status(self, task_id: str) -> dict:
        """
        Query contract for task status.

        Uses indexer for efficient state queries.
        """
        # Get application state from indexer
        try:
            app_info = self.client.account_info(self.client.algod_address).get(
                f"applications/{ESCROW_APP_ID}", {}
            )

            # For now, we rely on backend task storage
            # The contract state would need indexer to query properly

            return {
                "task_id": task_id,
                "status": "unknown",
                "note": "Use backend API for task status",
            }
        except Exception as e:
            print(f"[ESCROW] Error querying task: {e}")
            return {"error": str(e)}


class EscrowScheduler:
    """
    Scheduler that monitors tasks and triggers releases at deadline.
    """

    def __init__(self, escrow_client: EscrowClient):
        self.escrow = escrow_client
        self.tasks = []  # In-memory task storage

    def add_task(self, task_id: str, deadline: int):
        """Add task to monitor."""
        self.tasks.append(
            {
                "task_id": task_id,
                "deadline": deadline,
                "released": False,
            }
        )
        print(f"[SCHEDULER] Added task {task_id}, deadline: {deadline}")

    async def run(self):
        """Run scheduler loop."""
        print("[SCHEDULER] Started")

        while True:
            current_time = int(datetime.now().timestamp())

            for task in self.tasks:
                if task["released"]:
                    continue

                if current_time >= task["deadline"]:
                    print(f"[SCHEDULER] Deadline reached for {task['task_id']}")

                    try:
                        result = self.escrow.call_release(task["task_id"])
                        task["released"] = True
                        print(f"[SCHEDULER] Release successful: {result}")
                    except Exception as e:
                        print(f"[SCHEDULER] Release failed: {e}")

            await asyncio.sleep(10)  # Check every 10 seconds


# API Routes for Escrow
ESCROW_ROUTES = """
# Add to your FastAPI app:

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/escrow", tags=["escrow"])

@router.get("/agent-address")
async def get_agent_address():
    \"\"\"Get agent address for display.\"\"\"
    return {"address": escrow_client.get_agent_address()}


@router.post("/tasks/{task_id}/release")
async def release_task(task_id: str):
    \"\"\"Manually trigger release (for testing or admin).\"\"\"
    try:
        result = escrow_client.call_release(task_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/{task_id}/refund")
async def refund_task(task_id: str):
    \"\"\"Trigger refund for expired unfilled task.\"\"\"
    try:
        result = escrow_client.call_refund(task_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    \"\"\"Get task status from contract.\"\"\"
    return escrow_client.get_task_status(task_id)
"""


# Global client
escrow_client = EscrowClient()

if __name__ == "__main__":
    print(f"Agent address: {escrow_client.get_agent_address()}")
    print(f"Escrow App ID: {ESCROW_APP_ID}")
    print(f"Contract address: {algosdk.getApplicationAddress(ESCROW_APP_ID)}")
