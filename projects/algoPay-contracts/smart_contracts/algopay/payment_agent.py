from algopy import (
    ARC4Contract,
    Account,
    Application,
    Global,
    itxn,
    gtxn,
    UInt64,
    String,
    Txn,
    arc4,
)


class PaymentAgent(ARC4Contract):
    def __init__(self) -> None:
        self.owner = Account()
        self.total_received = UInt64(0)
        self.total_sent = UInt64(0)
        self.registered = False
        self.agent_id = String()
        self.spending_limit = UInt64(0)
        self.daily_limit = UInt64(0)
        self.daily_spent = UInt64(0)
        self.last_reset_round = UInt64(0)

    @arc4.abimethod(create="allow")
    def bootstrap(self, owner: Account, agent_id: String) -> None:
        self.owner = owner
        self.agent_id = agent_id
        self.registered = False
        self.spending_limit = UInt64(0)
        self.daily_limit = UInt64(0)
        self.daily_spent = UInt64(0)
        self.last_reset_round = Global.round

    @arc4.abimethod()
    def send_payment(self, receiver: Account, amount: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can send payments"
        assert amount > UInt64(0), "Amount must be positive"
        assert amount <= Global.current_application_address.balance, (
            "Insufficient balance"
        )

        if self.spending_limit > UInt64(0):
            assert amount <= self.spending_limit, "Exceeds single transaction limit"

        self._check_and_reset_daily()
        if self.daily_limit > UInt64(0):
            assert self.daily_spent + amount <= self.daily_limit, "Exceeds daily limit"

        self.daily_spent += amount
        self.total_sent += amount

        itxn.Payment(
            receiver=receiver,
            amount=amount,
            fee=0,
        ).submit()

    @arc4.abimethod()
    def set_spending_limit(self, limit: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can set limits"
        self.spending_limit = limit

    @arc4.abimethod()
    def set_daily_limit(self, limit: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can set limits"
        self.daily_limit = limit

    @arc4.abimethod()
    def register_as_agent(
        self, registry_app: Application, metadata_uri: String
    ) -> None:
        assert Txn.sender == self.owner, "Only owner can register"
        assert not self.registered, "Already registered as agent"

        itxn.ApplicationCall(
            app_id=registry_app,
            app_args=(
                arc4.arc4_signature("register(string,string)void"),
                self.agent_id,
                metadata_uri,
            ),
            fee=0,
        ).submit()

        self.registered = True

    @arc4.abimethod()
    def withdraw_to_owner(self, amount: UInt64) -> None:
        assert Txn.sender == self.owner, "Only owner can withdraw"
        assert amount > UInt64(0), "Amount must be positive"
        assert amount <= Global.current_application_address.balance - UInt64(100_000), (
            "Insufficient balance"
        )

        itxn.Payment(
            receiver=self.owner,
            amount=amount,
            fee=0,
        ).submit()

    @arc4.abimethod(readonly=True)
    def get_balance(self) -> UInt64:
        return Global.current_application_address.balance

    @arc4.abimethod(readonly=True)
    def get_stats(self) -> tuple[UInt64, UInt64, bool, String]:
        return (
            self.total_received,
            self.total_sent,
            self.registered,
            self.agent_id,
        )

    @arc4.abimethod(readonly=True)
    def get_owner(self) -> Account:
        return self.owner

    @arc4.abimethod(readonly=True)
    def get_limits(self) -> tuple[UInt64, UInt64, UInt64]:
        self._check_and_reset_daily()
        return (self.spending_limit, self.daily_limit, self.daily_spent)

    @arc4.abimethod()
    def receive_payment(self, payment: gtxn.PaymentTransaction) -> None:
        assert payment.receiver == Global.current_application_address, (
            "Payment must be to this contract"
        )
        assert payment.sender == self.owner, "Payments only from owner"
        self.total_received += payment.amount

    def _check_and_reset_daily(self) -> None:
        current_round = Global.round
        if current_round - self.last_reset_round >= UInt64(1000):
            self.daily_spent = UInt64(0)
            self.last_reset_round = current_round
