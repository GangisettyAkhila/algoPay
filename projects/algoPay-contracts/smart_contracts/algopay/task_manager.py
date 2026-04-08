from algopy import (
    ARC4Contract,
    Account,
    BoxMap,
    Global,
    UInt64,
    String,
    Txn,
    arc4,
    itxn,
)


class TaskManager(ARC4Contract):
    """
    TaskManager: Assigns and tracks agent tasks with optional recurring schedules.

    Status values:
      0 = pending
      1 = complete
      2 = cancelled
    """

    def __init__(self) -> None:
        self.owner = Account()
        self.task_count = UInt64(0)

        # Task storage - keyed by task_id (String)
        self.task_agent = BoxMap(String, Account, key_prefix="a_")
        self.task_description = BoxMap(String, String, key_prefix="d_")
        self.task_payment = BoxMap(String, UInt64, key_prefix="p_")
        self.task_deadline = BoxMap(String, UInt64, key_prefix="dl_")
        self.task_recurring = BoxMap(String, UInt64, key_prefix="r_")
        self.task_status = BoxMap(String, UInt64, key_prefix="s_")
        self.task_next_due = BoxMap(String, UInt64, key_prefix="nd_")

    # ------------------------------------------------------------------ #
    #  Lifecycle                                                           #
    # ------------------------------------------------------------------ #

    @arc4.abimethod(create="allow")
    def bootstrap(self, owner: Account) -> None:
        """Initialize contract with an owner address."""
        self.owner = owner
        self.task_count = UInt64(0)

    # ------------------------------------------------------------------ #
    #  Task Management                                                     #
    # ------------------------------------------------------------------ #

    @arc4.abimethod()
    def assign_task(
        self,
        task_id: String,
        assigned_agent: Account,
        description: String,
        payment_amount: UInt64,
        deadline: UInt64,
        recurring_interval_days: UInt64,
    ) -> None:
        """
        Assign a new task. Only the owner can call this.
        payment_amount must be > 0 (in microALGO).
        deadline is an Algorand round number.
        recurring_interval_days = 0 means one-shot; > 0 means recurring.
        """
        assert Txn.sender == self.owner, "Only owner can assign tasks"
        assert task_id not in self.task_agent, "Task ID already exists"
        assert payment_amount > UInt64(0), "Payment must be positive"

        self.task_agent[task_id] = assigned_agent
        self.task_description[task_id] = description
        self.task_payment[task_id] = payment_amount
        self.task_deadline[task_id] = deadline
        self.task_recurring[task_id] = recurring_interval_days
        self.task_status[task_id] = UInt64(0)
        self.task_next_due[task_id] = deadline
        self.task_count += UInt64(1)

    @arc4.abimethod()
    def execute_task(self, task_id: String) -> None:
        """
        Execute a pending task. Only the assigned agent can call this.
        Sends payment to the agent. For recurring tasks, resets to pending
        with the next deadline.
        """
        assert task_id in self.task_agent, "Task not found"
        assert self.task_status[task_id] == UInt64(0), "Task not pending"

        agent = self.task_agent[task_id]
        assert Txn.sender == agent, "Not authorized: must be assigned agent"

        deadline = self.task_deadline[task_id]
        assert Global.round <= deadline, "Task deadline has passed"

        payment = self.task_payment[task_id]
        assert (
            Global.current_application_address.balance >= payment + UInt64(100_000)
        ), "Insufficient contract balance"

        # Pay the agent
        itxn.Payment(
            receiver=agent,
            amount=payment,
            fee=0,
        ).submit()

        # Handle recurring vs one-shot
        recurring = self.task_recurring[task_id]
        if recurring > UInt64(0):
            # ~1440 rounds per day on Algorand (4.5s block time)
            rounds_per_day = UInt64(1440)
            next_due = self.task_next_due[task_id] + recurring * rounds_per_day
            self.task_next_due[task_id] = next_due
            self.task_deadline[task_id] = next_due
            self.task_status[task_id] = UInt64(0)  # back to pending
        else:
            self.task_status[task_id] = UInt64(1)  # complete

    @arc4.abimethod()
    def mark_task_complete(self, task_id: String) -> None:
        """Mark a task complete without payment. Owner only."""
        assert task_id in self.task_agent, "Task not found"
        assert Txn.sender == self.owner, "Only owner can mark complete"
        self.task_status[task_id] = UInt64(1)

    @arc4.abimethod()
    def cancel_task(self, task_id: String) -> None:
        """Cancel a pending task. Owner only."""
        assert task_id in self.task_agent, "Task not found"
        assert Txn.sender == self.owner, "Only owner can cancel"
        assert self.task_status[task_id] == UInt64(0), "Task is not pending"
        self.task_status[task_id] = UInt64(2)

    # ------------------------------------------------------------------ #
    #  Read-only queries                                                   #
    # ------------------------------------------------------------------ #

    @arc4.abimethod(readonly=True)
    def get_task(
        self, task_id: String
    ) -> tuple[Account, String, UInt64, UInt64, UInt64, UInt64, UInt64]:
        """
        Return full task details:
        (agent, description, payment, deadline, recurring, status, next_due)
        """
        assert task_id in self.task_agent, "Task not found"
        return (
            self.task_agent[task_id],
            self.task_description[task_id],
            self.task_payment[task_id],
            self.task_deadline[task_id],
            self.task_recurring[task_id],
            self.task_status[task_id],
            self.task_next_due[task_id],
        )

    @arc4.abimethod(readonly=True)
    def get_task_count(self) -> UInt64:
        """Return total number of tasks assigned."""
        return self.task_count

    @arc4.abimethod()
    def update_task_payment(self, task_id: String, new_payment: UInt64) -> None:
        """Update payment amount for a pending task. Owner only."""
        assert Txn.sender == self.owner, "Only owner can update payment"
        assert task_id in self.task_agent, "Task not found"
        assert self.task_status[task_id] == UInt64(0), "Cannot update non-pending task"
        self.task_payment[task_id] = new_payment

    @arc4.abimethod()
    def update_task_deadline(self, task_id: String, new_deadline: UInt64) -> None:
        """Update deadline for a pending task. Owner only."""
        assert Txn.sender == self.owner, "Only owner can update deadline"
        assert task_id in self.task_agent, "Task not found"
        assert self.task_status[task_id] == UInt64(0), "Cannot update non-pending task"
        self.task_deadline[task_id] = new_deadline
        self.task_next_due[task_id] = new_deadline
