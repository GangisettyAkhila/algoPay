"""
Rule Engine - Validates payments against configured rules
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta
import os


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
    1. Per-transaction limit
    2. Daily spending limit
    3. Allowed recipient addresses (whitelist)
    """

    def __init__(self):
        # Load rules from environment (for MVP, use env vars)
        self.max_per_transaction = self._get_limit("MAX_PER_TRANSACTION", 1000)  # ALGO
        self.max_daily = self._get_limit("MAX_DAILY", 10000)  # ALGO
        self.min_transaction = 0.001  # ALGO (minimum 1 milliAlgo)

        # Allowed recipients whitelist (empty = allow all)
        whitelist = os.getenv("ALLOWED_RECIPIENTS", "")
        self.allowed_recipients = set(
            w.strip() for w in whitelist.split(",") if w.strip()
        )

        # Track daily spending in memory (use Redis/DB in production)
        self._daily_spent: dict[str, float] = {}
        self._last_reset: dict[str, datetime] = {}

    def _get_limit(self, key: str, default: float) -> float:
        """Get limit from environment variable"""
        val = os.getenv(key)
        if val:
            try:
                return float(val)
            except ValueError:
                pass
        return default

    def _reset_daily_if_needed(self, wallet_address: str) -> None:
        """Reset daily counter if it's a new day"""
        today = datetime.now().date()
        last = self._last_reset.get(wallet_address)

        if last is None or last.date() < today:
            self._daily_spent[wallet_address] = 0.0
            self._last_reset[wallet_address] = datetime.now()

    def validate(self, sender: str, receiver: str, amount: float) -> ValidationResult:
        """
        Validate a payment against all rules.

        Args:
            sender: Sender's wallet address
            receiver: Receiver's wallet address
            amount: Amount in ALGO

        Returns:
            ValidationResult with approval status and any violations
        """
        violations: list[RuleViolation] = []

        # Rule 1: Minimum amount check
        if amount < self.min_transaction:
            violations.append(
                RuleViolation(
                    rule_name="MIN_AMOUNT",
                    reason=f"Amount {amount} ALGO is below minimum {self.min_transaction} ALGO",
                )
            )

        # Rule 2: Per-transaction limit
        if amount > self.max_per_transaction:
            violations.append(
                RuleViolation(
                    rule_name="MAX_PER_TRANSACTION",
                    reason=f"Amount {amount} ALGO exceeds per-transaction limit of {self.max_per_transaction} ALGO",
                )
            )

        # Rule 3: Daily spending limit
        self._reset_daily_if_needed(sender)
        current_daily = self._daily_spent.get(sender, 0.0)
        projected_daily = current_daily + amount

        if projected_daily > self.max_daily:
            violations.append(
                RuleViolation(
                    rule_name="MAX_DAILY_LIMIT",
                    reason=f"Daily limit exceeded. Current: {current_daily:.3f} ALGO, Requested: {amount} ALGO, Limit: {self.max_daily} ALGO",
                )
            )

        # Rule 4: Allowed recipients (whitelist)
        if self.allowed_recipients and receiver not in self.allowed_recipients:
            violations.append(
                RuleViolation(
                    rule_name="ALLOWED_RECIPIENTS",
                    reason=f"Receiver {receiver[:10]}... is not in allowed recipients list",
                )
            )

        # Build result
        if violations:
            violation_msgs = "; ".join(v.reason for v in violations)
            return ValidationResult(
                approved=False,
                violations=violations,
                message=f"Payment rejected: {violation_msgs}",
            )

        return ValidationResult(
            approved=True, violations=[], message="All rules passed"
        )

    def record_payment(self, sender: str, amount: float) -> None:
        """Record a successful payment for daily tracking"""
        self._reset_daily_if_needed(sender)
        self._daily_spent[sender] = self._daily_spent.get(sender, 0.0) + amount

    def get_daily_spent(self, sender: str) -> float:
        """Get current daily spending for a sender"""
        self._reset_daily_if_needed(sender)
        return self._daily_spent.get(sender, 0.0)


# Global rule engine instance
rule_engine = RuleEngine()
