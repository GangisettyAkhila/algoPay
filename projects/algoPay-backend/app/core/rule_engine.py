"""
Rule Engine - Validates payments against configured rules
Enforces financial constraints for autonomous agent
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


IST = ZoneInfo("Asia/Kolkata")


@dataclass
class RuleViolation:
    """Represents a rule that was violated"""

    rule_name: str
    reason: str


@dataclass
class ValidationResult:
    """Result of rule validation"""

    approved: bool
    violations: list[RuleViolation]
    message: str


class RuleEngine:
    """
    Rule Engine validates payments before execution.

    Rules checked (in order):
    1. Per-transaction limit (MAX 5 ALGO)
    2. Daily spending limit (MAX 10 ALGO/day)
    3. Max transactions per day (MAX 5)
    4. Allowed recipients (whitelist)
    5. Self-transfer prevention
    6. Minimum agent balance (reserve 1 ALGO)
    """

    # Demo limits - can be overridden via environment
    MAX_TX_AMOUNT = 5.0  # ALGO per transaction
    MAX_DAILY_SPEND = 10.0  # ALGO per day
    MAX_TX_PER_DAY = 5  # transactions per day
    MIN_AGENT_BALANCE = 1.0  # ALGO reserve (don't drain wallet)

    def __init__(self):
        # Track daily spending: { "YYYY-MM-DD": amount }
        self._daily_spent: dict[str, float] = {}

        # Track daily transaction count: { "YYYY-MM-DD": count }
        self._daily_tx_count: dict[str, int] = {}

        # Allow all recipients by default for demo flexibility
        self._allowed_recipients: set[str] = set()

    def _get_today_ist(self) -> str:
        """Get today's date in IST"""
        return datetime.now(IST).strftime("%Y-%m-%d")

    def _reset_daily_if_needed(self) -> None:
        """Reset counters if it's a new day"""
        today = self._get_today_ist()
        if today not in self._daily_spent:
            self._daily_spent[today] = 0.0
            self._daily_tx_count[today] = 0

    def set_allowed_recipients(self, recipients: set[str]) -> None:
        """Set allowed recipient addresses"""
        self._allowed_recipients = recipients

    def validate(
        self, sender: str, receiver: str, amount: float, agent_balance: float = 0.0
    ) -> ValidationResult:
        """
        Validate a payment against all rules.

        Args:
            sender: Sender's wallet address
            receiver: Receiver's wallet address
            amount: Amount in ALGO
            agent_balance: Current agent wallet balance (optional)

        Returns:
            ValidationResult with approval status and any violations
        """
        print(f"[RULE] Validating payment: {amount} ALGO to {receiver[:10]}...")

        self._reset_daily_if_needed()

        violations: list[RuleViolation] = []
        today = self._get_today_ist()

        # Get current daily stats
        current_daily_spent = self._daily_spent.get(today, 0.0)
        current_tx_count = self._daily_tx_count.get(today, 0)

        print(
            f"[RULE] Daily stats: {current_daily_spent} ALGO spent, {current_tx_count} tx today"
        )

        # Rule 1: Per-transaction limit
        if amount > self.MAX_TX_AMOUNT:
            violation = RuleViolation(
                rule_name="MAX_TX_AMOUNT",
                reason=f"Exceeds max per transaction limit ({self.MAX_TX_AMOUNT} ALGO). Requested: {amount} ALGO",
            )
            violations.append(violation)
            print(f"[RULE BLOCKED] {violation.reason}")

        # Rule 2: Daily spending limit
        projected_daily = current_daily_spent + amount
        if projected_daily > self.MAX_DAILY_SPEND:
            violation = RuleViolation(
                rule_name="MAX_DAILY_SPEND",
                reason=f"Daily spending limit exceeded. Today: {current_daily_spent:.3f} ALGO, Adding: {amount} ALGO, Limit: {self.MAX_DAILY_SPEND} ALGO",
            )
            violations.append(violation)
            print(f"[RULE BLOCKED] {violation.reason}")

        # Rule 3: Max transactions per day
        if current_tx_count >= self.MAX_TX_PER_DAY:
            violation = RuleViolation(
                rule_name="MAX_TX_PER_DAY",
                reason=f"Max transactions per day exceeded. Today: {current_tx_count}, Limit: {self.MAX_TX_PER_DAY}",
            )
            violations.append(violation)
            print(f"[RULE BLOCKED] {violation.reason}")

        # Rule 4: Allowed recipients (whitelist) - only if set
        if self._allowed_recipients and receiver not in self._allowed_recipients:
            violation = RuleViolation(
                rule_name="ALLOWED_RECIPIENTS", reason=f"Recipient not in allowed list"
            )
            violations.append(violation)
            print(f"[RULE BLOCKED] {violation.reason}")

        # Rule 5: Self-transfer prevention
        if sender.lower() == receiver.lower():
            violation = RuleViolation(
                rule_name="NO_SELF_TRANSFER", reason="Self-transfer blocked"
            )
            violations.append(violation)
            print(f"[RULE BLOCKED] {violation.reason}")

        # Rule 6: Minimum agent balance (reserve)
        if agent_balance > 0:
            remaining_balance = agent_balance - amount
            if remaining_balance < self.MIN_AGENT_BALANCE:
                violation = RuleViolation(
                    rule_name="MIN_AGENT_BALANCE",
                    reason=f"Would leave insufficient agent balance. Have: {agent_balance:.3f} ALGO, Sending: {amount} ALGO, Reserve needed: {self.MIN_AGENT_BALANCE} ALGO",
                )
                violations.append(violation)
                print(f"[RULE BLOCKED] {violation.reason}")

        # Build result
        if violations:
            violation_msgs = "; ".join(v.reason for v in violations)
            print(f"[RULE] Payment BLOCKED: {violation_msgs}")
            return ValidationResult(
                approved=False,
                violations=violations,
                message=f"Payment rejected: {violation_msgs}",
            )

        print(f"[RULE] ✅ All rules passed - payment allowed")
        return ValidationResult(
            approved=True, violations=[], message="All rules passed"
        )

    def record_payment(self, amount: float) -> None:
        """Record a successful payment for daily tracking"""
        self._reset_daily_if_needed()
        today = self._get_today_ist()

        self._daily_spent[today] = self._daily_spent.get(today, 0.0) + amount
        self._daily_tx_count[today] = self._daily_tx_count.get(today, 0) + 1

        print(
            f"[RULE] Recorded payment: {amount} ALGO. Today: {self._daily_spent[today]} ALGO, {self._daily_tx_count[today]} tx"
        )

    def get_daily_stats(self) -> dict:
        """Get current daily statistics"""
        self._reset_daily_if_needed()
        today = self._get_today_ist()
        return {
            "date": today,
            "spent_algo": self._daily_spent.get(today, 0.0),
            "tx_count": self._daily_tx_count.get(today, 0),
            "max_daily": self.MAX_DAILY_SPEND,
            "max_per_tx": self.MAX_TX_AMOUNT,
            "max_tx_per_day": self.MAX_TX_PER_DAY,
            "min_reserve": self.MIN_AGENT_BALANCE,
        }


# Global rule engine instance
rule_engine = RuleEngine()
