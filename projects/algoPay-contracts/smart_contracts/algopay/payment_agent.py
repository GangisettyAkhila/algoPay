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
    """Autonomous Payment Agent Smart Contract

    Rules enforced:
    - R01: Min amount 0.001 ALGO (1000 microAlgos)
    - R02: Max amount 10 ALGO (10,000,000 microAlgos)
    - R03: Daily limit 50 ALGO (50,000,000 microAlgos)
    - R08: Balance >= amount + fee
    - R09: Reserve 1 ALGO after payment
    - R15: Max 5 transactions per hour
    - R16: 30 second cooldown between transactions
    - R18: Contract must not be paused
    """

    def __init__(self) -> None:
        # Owner/Agent address (authorized to execute)
        self.owner = Account()

        # Basic tracking
        self.agent_id = String()
        self.total_received = UInt64(0)
        self.total_sent = UInt64(0)
        self.registered = False

        # === GLOBAL STATE (R3, R9) ===
        self.spending_limit = UInt64(0)
        self.daily_limit = UInt64(0)
        self.daily_spent = UInt64(0)

        # === NEW STATE VARIABLES REQUIRED ===
        self.is_paused = UInt64(0)  # R18: pause state
        self.last_tx_time = UInt64(0)  # R16: last transaction timestamp
        self.tx_count_hour = UInt64(0)  # R15: hourly transaction count
        self.last_reset = UInt64(0)  # R3: daily reset timestamp
        self.tx_window_start = UInt64(0)  # R15: hourly window start

    @arc4.abimethod(create="allow")
    def bootstrap(self, owner: Account, agent_id: String) -> None:
        """Initialize the agent with owner and agent ID."""
        self.owner = owner
        self.agent_id = agent_id
        self.registered = False

        # Initialize limits
        self.spending_limit = UInt64(0)
        self.daily_limit = UInt64(0)
        self.daily_spent = UInt64(0)

        # Initialize new state variables
        self.is_paused = UInt64(0)
        self.last_tx_time = UInt64(0)
        self.tx_count_hour = UInt64(0)
        self.last_reset = Global.latest_timestamp
        self.tx_window_start = Global.latest_timestamp

    @arc4.abimethod()
    def execute(self, amount: UInt64, recipient: Account) -> None:
        """
        Execute a payment from the agent to a recipient.

        Enforces all rules before execution:
        - R01: Minimum amount check
        - R02: Maximum amount check
        - R03: Daily spending limit
        - R08: Balance sufficiency
        - R09: Reserve maintenance
        - R15: Hourly transaction limit
        - R16: Cooldown period
        - R18: Pause state check
        """
        # R18: Check if contract is paused
        assert self.is_paused == UInt64(0), "Contract is paused"

        # Security: Only owner can execute
        assert Txn.sender == self.owner, "Only owner can execute payments"

        # Get current timestamp
        current_time = Global.latest_timestamp

        # R01: Minimum amount check (0.001 ALGO = 1000 microAlgos)
        assert amount >= UInt64(1000), "Amount below minimum 0.001 ALGO"

        # R02: Maximum amount check (10 ALGO = 10,000,000 microAlgos)
        assert amount <= UInt64(10_000_000), "Amount exceeds maximum 10 ALGO"

        # Get contract balance
        contract_balance = Global.current_application_address.balance

        # R08: Balance must cover amount + fee (fee = 1000 microAlgos)
        assert contract_balance >= amount + UInt64(1000), (
            "Insufficient balance for amount + fee"
        )

        # R09: Must maintain 1 ALGO reserve after payment
        assert contract_balance - amount >= UInt64(1_000_000), (
            "Insufficient reserve after payment"
        )

        # === DAILY LIMIT CHECK (R3 & R03) ===
        self._check_and_reset_daily(current_time)
        if self.daily_limit > UInt64(0):
            # Custom daily limit set
            assert self.daily_spent + amount <= self.daily_limit, "Exceeds daily limit"
        else:
            # Default daily limit: 50 ALGO
            assert self.daily_spent + amount <= UInt64(50_000_000), (
                "Exceeds daily limit of 50 ALGO"
            )

        # === HOURLY TRANSACTION LIMIT (R15) ===
        # Reset hourly counter if 1 hour passed
        if current_time - self.tx_window_start >= UInt64(3600):
            self.tx_count_hour = UInt64(0)
            self.tx_window_start = current_time

        # Check max 5 transactions per hour
        assert self.tx_count_hour < UInt64(5), (
            "Maximum 5 transactions per hour exceeded"
        )

        # === COOLDOWN CHECK (R16) ===
        if self.last_tx_time > UInt64(0):
            assert current_time - self.last_tx_time >= UInt64(30), (
                "30 second cooldown required"
            )

        # === EXECUTE PAYMENT ===
        # Update state BEFORE payment
        self.daily_spent += amount
        self.total_sent += amount
        self.tx_count_hour += 1
        self.last_tx_time = current_time

        # Send payment via inner transaction
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            fee=1000,  # Include fee for inner transaction
        ).submit()

    @arc4.abimethod()
    def pause(self) -> None:
        """Pause the agent - prevents execute() from working."""
        assert Txn.sender == self.owner, "Only owner can pause"
        self.is_paused = UInt64(1)

    @arc4.abimethod()
    def resume(self) -> None:
        """Resume the agent - allows execute() to work again."""
        assert Txn.sender == self.owner, "Only owner can resume"
        self.is_paused = UInt64(0)

    @arc4.abimethod()
    def set_spending_limit(self, limit: UInt64) -> None:
        """Set custom per-transaction limit."""
        assert Txn.sender == self.owner, "Only owner can set limits"
        self.spending_limit = limit

    @arc4.abimethod()
    def set_daily_limit(self, limit: UInt64) -> None:
        """Set custom daily spending limit."""
        assert Txn.sender == self.owner, "Only owner can set limits"
        self.daily_limit = limit

    @arc4.abimethod()
    def register_as_agent(
        self, registry_app: Application, metadata_uri: String
    ) -> None:
        """Register this agent with the AgentRegistry."""
        assert Txn.sender == self.owner, "Only owner can register"
        assert not self.registered, "Already registered as agent"

        itxn.ApplicationCall(
            app_id=registry_app,
            app_args=(
                arc4.arc4_signature("register(string,string)void"),
                self.agent_id,
                metadata_uri,
            ),
            fee=1000,
        ).submit()

        self.registered = True

    @arc4.abimethod()
    def withdraw_to_owner(self, amount: UInt64) -> None:
        """Withdraw funds back to owner (maintains 1 ALGO reserve)."""
        assert Txn.sender == self.owner, "Only owner can withdraw"
        assert amount > UInt64(0), "Amount must be positive"

        contract_balance = Global.current_application_address.balance
        assert contract_balance - amount >= UInt64(1_000_000), (
            "Cannot withdraw below 1 ALGO reserve"
        )

        itxn.Payment(
            receiver=self.owner,
            amount=amount,
            fee=1000,
        ).submit()

    @arc4.abimethod(readonly=True)
    def get_balance(self) -> UInt64:
        """Get contract balance."""
        return Global.current_application_address.balance

    @arc4.abimethod(readonly=True)
    def get_stats(self) -> tuple[UInt64, UInt64, bool, String]:
        """Get agent statistics."""
        return (
            self.total_received,
            self.total_sent,
            self.registered,
            self.agent_id,
        )

    @arc4.abimethod(readonly=True)
    def get_owner(self) -> Account:
        """Get owner address."""
        return self.owner

    @arc4.abimethod(readonly=True)
    def get_limits(self) -> tuple[UInt64, UInt64, UInt64]:
        """Get spending limit, daily limit, and daily spent."""
        current_time = Global.latest_timestamp
        self._check_and_reset_daily(current_time)
        return (self.spending_limit, self.daily_limit, self.daily_spent)

    @arc4.abimethod(readonly=True)
    def get_status(self) -> tuple[UInt64, UInt64, UInt64, UInt64]:
        """Get agent status: is_paused, last_tx_time, tx_count_hour, daily_spent."""
        current_time = Global.latest_timestamp
        self._check_and_reset_daily(current_time)

        # Reset hourly counter if needed
        if current_time - self.tx_window_start >= UInt64(3600):
            return (self.is_paused, self.last_tx_time, UInt64(0), self.daily_spent)

        return (self.is_paused, self.last_tx_time, self.tx_count_hour, self.daily_spent)

    @arc4.abimethod()
    def receive_payment(self, payment: gtxn.PaymentTransaction) -> None:
        """Receive incoming payments (only from owner)."""
        assert payment.receiver == Global.current_application_address, (
            "Payment must be to this contract"
        )
        assert payment.sender == self.owner, "Payments only from owner"
        self.total_received += payment.amount

    def _check_and_reset_daily(self, current_time: UInt64) -> None:
        """Reset daily spent if 24 hours passed."""
        # 86400 seconds = 24 hours
        if current_time - self.last_reset >= UInt64(86400):
            self.daily_spent = UInt64(0)
            self.last_reset = current_time
