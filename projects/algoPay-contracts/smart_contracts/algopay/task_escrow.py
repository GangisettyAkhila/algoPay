"""
TaskEscrow - Algorand Smart Contract for Autonomous Payment Escrow

Features:
- Users fund specific tasks (not agent wallet)
- Funds locked in contract until release
- Agent can only trigger release, never receives funds
- Prevents double release
- Enforces deadline
"""

from algopy import (
    ARC4Contract,
    Account,
    Application,
    Global,
    itxn,
    gtxn,
    UInt64,
    String,
    Bytes,
    Txn,
    arc4,
)


class TaskStatus:
    """Task status constants"""

    CREATED = 0
    FUNDED = 1
    RELEASED = 2
    REFUNDED = 3
    FAILED = 4


class TaskEscrow(ARC4Contract):
    """
    Escrow contract for task-based payments.

    Flow:
    1. Creator creates task (off-chain or on-chain) - stores ID
    2. Creator funds task via payment transaction to contract
    3. Contract verifies: sender == creator, amount >= required
    4. Funds locked in contract
    5. At deadline, agent calls release_payment()
    6. Contract sends ALGO to recipient directly
    """

    def __init__(self) -> None:
        # Admin (can pause/emergency withdraw)
        self.admin = Account()

        # Task counter
        self.task_count = UInt64(0)

        # Task storage: task_id -> encoded task data
        # Format: creator|recipient|amount|deadline|status|funder
        self.tasks = String()  # Map: task_id -> Bytes

    @arc4.abimethod(create="allow")
    def bootstrap(self, admin: Account) -> None:
        """Initialize escrow contract."""
        self.admin = admin
        self.task_count = UInt64(0)

    @arc4.abimethod()
    def create_task(
        self,
        task_id: String,
        recipient: Account,
        amount: UInt64,
        deadline: UInt64,
    ) -> None:
        """Create a new task (called by creator before funding)."""
        # Verify creator is the sender
        creator = Txn.sender

        # Verify amount is valid (min 0.001 ALGO = 1000 microAlgos)
        assert amount >= UInt64(1000), "Minimum amount is 0.001 ALGO"

        # Verify deadline is in the future
        assert deadline > Global.latest_timestamp, "Deadline must be in the future"

        # Store task data: creator|recipient|amount|deadline|status|funder
        task_data = (
            arc4.arc4_encode(creator, Account).bytes
            + b"|"
            + arc4.arc4_encode(recipient, Account).bytes
            + b"|"
            + arc4.arc4_encode(amount, UInt64).bytes
            + b"|"
            + arc4.arc4_encode(deadline, UInt64).bytes
            + b"|"
            + arc4.arc4_encode(UInt64(TaskStatus.CREATED), UInt64).bytes
            + b"|"
            + b""  # empty funder
        )

        self.tasks[task_id] = task_data

    @arc4.abimethod()
    def fund_task(self, task_id: String, payment: gtxn.PaymentTransaction) -> None:
        """
        Fund a task via payment transaction.

        User sends ALGO to contract with task_id in note field.
        Contract verifies the payment matches the task requirements.
        """
        # Get task data
        task_data = self.tasks[task_id]
        assert task_data != b"", f"Task {task_id} does not exist"

        # Parse task data
        parts = task_data.split(b"|")
        assert len(parts) == 6, "Invalid task data format"

        creator = arc4.arc4_decode(Account, parts[0])
        required_amount = arc4.arc4_decode(UInt64, parts[2])
        status = arc4.arc4_decode(UInt64, parts[4])

        # Verify sender is the task creator
        assert Txn.sender == creator, "Only task creator can fund"

        # Verify task is in CREATED state
        assert status == UInt64(TaskStatus.CREATED), "Task already funded or completed"

        # Verify payment amount is sufficient
        assert payment.amount >= required_amount, (
            f"Insufficient payment: need {required_amount}, got {payment.amount}"
        )

        # Verify payment is to this contract
        assert payment.receiver == Global.current_application_address, (
            "Payment must be to contract"
        )

        # Update task status to FUNDED and record funder
        funded_data = (
            parts[0]  # creator
            + b"|"
            + parts[1]  # recipient
            + b"|"
            + parts[2]  # amount
            + b"|"
            + parts[3]  # deadline
            + b"|"
            + arc4.arc4_encode(
                UInt64(TaskStatus.FUNDED), UInt64
            ).bytes  # status = FUNDED
            + b"|"
            + arc4.arc4_encode(payment.sender, Account).bytes  # funder
        )

        self.tasks[task_id] = funded_data

    @arc4.abimethod()
    def release_payment(self, task_id: String) -> None:
        """
        Release payment to recipient.

        Called by agent/backend after deadline is reached.
        Contract sends funds directly to recipient - agent never handles funds.
        """
        # Verify caller is not the contract itself
        assert Txn.sender != Global.current_application_address, "Invalid caller"

        # Get task data
        task_data = self.tasks[task_id]
        assert task_data != b"", f"Task {task_id} does not exist"

        # Parse task data
        parts = task_data.split(b"|")
        assert len(parts) == 6, "Invalid task data format"

        recipient = arc4.arc4_decode(Account, parts[1])
        amount = arc4.arc4_decode(UInt64, parts[2])
        deadline = arc4.arc4_decode(UInt64, parts[3])
        status = arc4.arc4_decode(UInt64, parts[4])

        # Verify task is FUNDED
        assert status == UInt64(TaskStatus.FUNDED), (
            f"Task not funded (status: {status})"
        )

        # Verify deadline has passed
        assert Global.latest_timestamp >= deadline, "Deadline not reached yet"

        # Get contract balance
        contract_balance = Global.current_application_address.balance

        # Verify sufficient balance
        assert contract_balance >= amount + UInt64(2000), (
            "Insufficient contract balance"
        )

        # Update task status to RELEASED
        released_data = (
            parts[0]  # creator
            + b"|"
            + parts[1]  # recipient
            + b"|"
            + parts[2]  # amount
            + b"|"
            + parts[3]  # deadline
            + b"|"
            + arc4.arc4_encode(
                UInt64(TaskStatus.RELEASED), UInt64
            ).bytes  # status = RELEASED
            + b"|"
            + parts[5]  # funder
        )

        self.tasks[task_id] = released_data

        # Send payment to recipient (funds NEVER go to agent)
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            fee=2000,  # Cover inner transaction fee
        ).submit()

    @arc4.abimethod()
    def refund_task(self, task_id: String) -> None:
        """
        Refund task if deadline passed and not released.

        Only creator can request refund.
        """
        # Get task data
        task_data = self.tasks[task_id]
        assert task_data != b"", f"Task {task_id} does not exist"

        # Parse task data
        parts = task_data.split(b"|")
        creator = arc4.arc4_decode(Account, parts[0])
        amount = arc4.arc4_decode(UInt64, parts[2])
        deadline = arc4.arc4_decode(UInt64, parts[3])
        status = arc4.arc4_decode(UInt64, parts[4])
        funder = arc4.arc4_decode(Account, parts[5])

        # Only creator can request refund
        assert Txn.sender == creator, "Only creator can request refund"

        # Verify task is FUNDED (not already released)
        assert status == UInt64(TaskStatus.FUNDED), "Task already released or refunded"

        # Verify deadline has passed
        assert Global.latest_timestamp >= deadline, "Deadline not reached yet"

        # Get contract balance
        contract_balance = Global.current_application_address.balance

        # Refund to funder
        if contract_balance >= amount + UInt64(2000):
            itxn.Payment(
                receiver=funder,
                amount=amount,
                fee=2000,
            ).submit()

        # Update status to REFUNDED
        refunded_data = (
            parts[0]  # creator
            + b"|"
            + parts[1]  # recipient
            + b"|"
            + parts[2]  # amount
            + b"|"
            + parts[3]  # deadline
            + b"|"
            + arc4.arc4_encode(UInt64(TaskStatus.REFUNDED), UInt64).bytes
            + b"|"
            + parts[5]  # funder
        )

        self.tasks[task_id] = refunded_data

    @arc4.abimethod(readonly=True)
    def get_task(
        self, task_id: String
    ) -> tuple[Account, Account, UInt64, UInt64, UInt64]:
        """
        Get task details.

        Returns: (creator, recipient, amount, deadline, status)
        """
        task_data = self.tasks[task_id]
        assert task_data != b"", f"Task {task_id} does not exist"

        parts = task_data.split(b"|")
        creator = arc4.arc4_decode(Account, parts[0])
        recipient = arc4.arc4_decode(Account, parts[1])
        amount = arc4.arc4_decode(UInt64, parts[2])
        deadline = arc4.arc4_decode(UInt64, parts[3])
        status = arc4.arc4_decode(UInt64, parts[4])

        return (creator, recipient, amount, deadline, status)

    @arc4.abimethod(readonly=True)
    def get_task_count(self) -> UInt64:
        """Get total number of tasks."""
        return self.task_count

    @arc4.abimethod(readonly=True)
    def get_contract_balance(self) -> UInt64:
        """Get contract balance."""
        return Global.current_application_address.balance

    @arc4.abimethod()
    def emergency_withdraw(self, amount: UInt64) -> None:
        """Emergency withdraw - only admin can call."""
        assert Txn.sender == self.admin, "Only admin can emergency withdraw"

        contract_balance = Global.current_application_address.balance
        assert contract_balance >= amount + UInt64(1000), "Insufficient balance"

        itxn.Payment(
            receiver=self.admin,
            amount=amount,
            fee=1000,
        ).submit()
