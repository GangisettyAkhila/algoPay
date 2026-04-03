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
    gtxn,
)


TASK_STATUS_PENDING = UInt64(0)
TASK_STATUS_EXECUTED = UInt64(1)
TASK_STATUS_CANCELLED = UInt64(2)
TASK_STATUS_EXPIRED = UInt64(3)


class TaskManager(ARC4Contract):
    def __init__(self) -> None:
        self.owner = Account()
        self.task_count = UInt64(0)
        self.agents = BoxMap(Account, String, key_prefix="agent_")
        self.approved_executors = BoxMap(Account, bool, key_prefix="exec_")
        self.task_exists = BoxMap(String, bool, key_prefix="texist_")
        self.task_agent = BoxMap(String, Account, key_prefix="tagent_")
        self.task_description = BoxMap(String, String, key_prefix="tdesc_")
        self.task_payment = BoxMap(String, UInt64, key_prefix="tpayment_")
        self.task_deadline = BoxMap(String, UInt64, key_prefix="tdeadline_")
        self.task_recurring = BoxMap(String, UInt64, key_prefix="trecur_")
        self.task_next_due = BoxMap(String, UInt64, key_prefix="tnextdue_")
        self.task_status = BoxMap(String, UInt64, key_prefix="tstatus_")
        self.task_created = BoxMap(String, UInt64, key_prefix="tcreated_")
        self.task_last_exec = BoxMap(String, UInt64, key_prefix="tlastexec_")

    @arc4.abimethod(create="allow")
    def bootstrap(self, owner: Account) -> None:
        self.owner = owner
        self.task_count = UInt64(0)

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
        assert Txn.sender == self.owner, "Only owner can assign tasks"
        assert not self._task_exists(task_id), "Task ID already exists"
        assert payment_amount > UInt64(0), "Payment amount must be positive"

        self.task_exists[task_id] = True
        self.task_agent[task_id] = assigned_agent
        self.task_description[task_id] = description
        self.task_payment[task_id] = payment_amount
        self.task_deadline[task_id] = deadline
        self.task_recurring[task_id] = recurring_interval_days
        self.task_next_due[task_id] = deadline
        self.task_status[task_id] = TASK_STATUS_PENDING
        self.task_created[task_id] = Global.round
        self.task_last_exec[task_id] = UInt64(0)
        self.task_count += UInt64(1)

    def _task_exists(self, task_id: String) -> bool:
        return task_id in self.task_exists and self.task_exists[task_id]

    def _get_status(self, task_id: String) -> UInt64:
        return self.task_status[task_id]

    def _set_status(self, task_id: String, status: UInt64) -> None:
        self.task_status[task_id] = status

    @arc4.abimethod()
    def execute_task(self, task_id: String) -> None:
        assert self._task_exists(task_id), "Task not found"
        assert self._get_status(task_id) == TASK_STATUS_PENDING, "Task not pending"

        agent = self.task_agent[task_id]
        assert Txn.sender == agent or self._is_approved_executor(Txn.sender), (
            "Not authorized"
        )

        deadline = self.task_deadline[task_id]
        assert Global.round <= deadline, "Task deadline passed"

        payment = self.task_payment[task_id]
        min_balance = payment + UInt64(100_000)
        assert Global.current_application_address.balance >= min_balance, (
            "Insufficient balance"
        )

        self._set_status(task_id, TASK_STATUS_EXECUTED)
        self.task_last_exec[task_id] = Global.round

        itxn.Payment(
            receiver=agent,
            amount=payment,
            fee=0,
        ).submit()

        recurring = self.task_recurring[task_id]
        if recurring > UInt64(0):
            rounds_per_day = UInt64(1440)
            next_due = self.task_next_due[task_id] + recurring * rounds_per_day
            self.task_next_due[task_id] = next_due
            self.task_deadline[task_id] = next_due
            self._set_status(task_id, TASK_STATUS_PENDING)

    @arc4.abimethod()
    def mark_task_complete(self, task_id: String) -> None:
        assert self._task_exists(task_id), "Task not found"
        assert Txn.sender == self.owner, "Only owner can mark complete"
        self._set_status(task_id, TASK_STATUS_EXECUTED)
        self.task_last_exec[task_id] = Global.round

    @arc4.abimethod()
    def cancel_task(self, task_id: String) -> None:
        assert self._task_exists(task_id), "Task not found"
        assert Txn.sender == self.owner, "Only owner can cancel tasks"
        assert self._get_status(task_id) == TASK_STATUS_PENDING, "Task already executed"
        self._set_status(task_id, TASK_STATUS_CANCELLED)

    def _is_approved_executor(self, addr: Account) -> bool:
        return addr in self.approved_executors and self.approved_executors[addr]

    @arc4.abimethod()
    def register_agent(self, agent_id: String) -> None:
        self.agents[Txn.sender] = agent_id

    @arc4.abimethod()
    def approve_executor(self, executor: Account) -> None:
        assert Txn.sender == self.owner, "Only owner can approve executors"
        self.approved_executors[executor] = True

    @arc4.abimethod()
    def revoke_executor(self, executor: Account) -> None:
        assert Txn.sender == self.owner, "Only owner can revoke executors"
        if self._is_approved_executor(executor):
            del self.approved_executors[executor]

    @arc4.abimethod(readonly=True)
    def get_task(
        self, task_id: String
    ) -> tuple[Account, String, UInt64, UInt64, UInt64, UInt64, UInt64]:
        assert self._task_exists(task_id), "Task not found"
        return (
            self.task_agent[task_id],
            self.task_description[task_id],
            self.task_payment[task_id],
            self.task_deadline[task_id],
            self.task_recurring[task_id],
            self._get_status(task_id),
            self.task_last_exec[task_id],
        )

    @arc4.abimethod(readonly=True)
    def get_task_count(self) -> UInt64:
        return self.task_count

    @arc4.abimethod(readonly=True)
    def is_registered_agent(self, address: Account) -> bool:
        return address in self.agents

    @arc4.abimethod(readonly=True)
    def is_approved_executor(self, address: Account) -> bool:
        return self._is_approved_executor(address)

    @arc4.abimethod(readonly=True)
    def get_pending_task_count(self, agent: Account) -> UInt64:
        return self.task_count

    @arc4.abimethod()
    def update_task_payment(self, task_id: String, new_payment: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can update payment"
        assert self._task_exists(task_id), "Task not found"
        assert self._get_status(task_id) == TASK_STATUS_PENDING, (
            "Cannot update non-pending task"
        )
        self.task_payment[task_id] = new_payment

    @arc4.abimethod()
    def update_task_deadline(self, task_id: String, new_deadline: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can update deadline"
        assert self._task_exists(task_id), "Task not found"
        assert self._get_status(task_id) == TASK_STATUS_PENDING, (
            "Cannot update non-pending task"
        )
        self.task_deadline[task_id] = new_deadline
        self.task_next_due[task_id] = new_deadline

    @arc4.abimethod()
    def receive_funding(self, payment: gtxn.PaymentTransaction) -> None:
        assert payment.receiver == Global.current_application_address, (
            "Payment must be to this contract"
        )
        assert Txn.sender == self.owner, "Only owner can fund"
