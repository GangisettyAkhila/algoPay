"""
Agent Executor - Orchestrates the complete payment flow

Flow:
1. Validate input
2. Check rules (Rule Engine)
3. Execute payment (Payment Executor)
4. Log result (Audit Logger)
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from app.core.rule_engine import rule_engine, ValidationResult
from app.services.payment_executor import payment_executor, PaymentResult


@dataclass
class AgentExecutionResult:
    """Result of agent execution"""

    status: str  # "success" or "rejected"
    txid: Optional[str]
    reason: Optional[str]
    message: str
    logs: list[dict]
    timestamp: str
    rules_checked: list[str]


class AuditLogger:
    """Simple in-memory audit logger"""

    def __init__(self):
        self._logs: list[dict] = []
        self._max_logs = 1000

    def log(self, level: str, message: str, details: dict = None) -> None:
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "details": details or {},
        }
        self._logs.append(entry)

        # Keep only last N logs
        if len(self._logs) > self._max_logs:
            self._logs = self._logs[-self._max_logs :]

        # Print to console for MVP
        print(f"[{level.upper()}] {message}")

    def get_logs(self, limit: int = 100) -> list[dict]:
        return self._logs[-limit:]


class AgentExecutor:
    """
    Agent Executor - The core payment orchestration layer.

    This is the heart of the agent payment system.

    Flow:
    -----
    1. Receive payment request
    2. Validate input format
    3. Check rules (Rule Engine)
    4. If rejected → return rejection
    5. If approved → execute payment (Payment Executor)
    6. Record result in Audit Logger
    7. Return structured response
    """

    def __init__(self):
        self.audit_logger = AuditLogger()

    def execute(
        self, sender: str, receiver: str, amount_algo: float
    ) -> AgentExecutionResult:
        """
        Execute a payment through the agent.

        Args:
            sender: Sender's wallet address
            receiver: Receiver's wallet address
            amount_algo: Amount in ALGO (will be converted to microAlgos)

        Returns:
            AgentExecutionResult with status, txid, and logs
        """
        logs: list[dict] = []
        timestamp = datetime.utcnow().isoformat()

        # Step 1: Log incoming request
        self.audit_logger.log(
            "INFO", f"Payment request: {sender} → {receiver}, {amount_algo} ALGO"
        )
        logs.append(
            {
                "step": "REQUEST_RECEIVED",
                "timestamp": timestamp,
                "status": "received",
                "message": f"Payment request received for {amount_algo} ALGO",
            }
        )

        # Step 2: Validate input format
        self.audit_logger.log("INFO", "Validating input format...")
        logs.append(
            {
                "step": "VALIDATING_INPUT",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "processing",
                "message": "Validating input format...",
            }
        )

        if not self._validate_address(sender):
            return self._build_error_result(
                logs,
                timestamp,
                "rejected",
                reason="INVALID_SENDER",
                message=f"Invalid sender address format: {sender}",
            )

        if not self._validate_address(receiver):
            return self._build_error_result(
                logs,
                timestamp,
                "rejected",
                reason="INVALID_RECEIVER",
                message=f"Invalid receiver address format: {receiver}",
            )

        if amount_algo <= 0:
            return self._build_error_result(
                logs,
                timestamp,
                "rejected",
                reason="INVALID_AMOUNT",
                message=f"Amount must be positive: {amount_algo}",
            )

        self.audit_logger.log("INFO", "Input validation passed")
        logs.append(
            {
                "step": "VALIDATING_INPUT",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success",
                "message": "Input validation passed",
            }
        )

        # Step 3: Check rules
        self.audit_logger.log("INFO", "Checking rules...")
        logs.append(
            {
                "step": "CHECKING_RULES",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "processing",
                "message": "Checking rule engine...",
            }
        )

        validation: ValidationResult = rule_engine.validate(
            sender, receiver, amount_algo
        )

        rules_checked = ["MAX_PER_TRANSACTION", "MAX_DAILY_LIMIT", "ALLOWED_RECIPIENTS"]

        if not validation.approved:
            self.audit_logger.log("WARN", f"Payment rejected: {validation.message}")
            logs.append(
                {
                    "step": "CHECKING_RULES",
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "rejected",
                    "message": validation.message,
                    "violations": [v.__dict__ for v in validation.violations],
                }
            )

            return AgentExecutionResult(
                status="rejected",
                txid=None,
                reason="RULE_VIOLATION",
                message=validation.message,
                logs=logs,
                timestamp=timestamp,
                rules_checked=rules_checked,
            )

        self.audit_logger.log("INFO", "All rules passed ✓")
        logs.append(
            {
                "step": "CHECKING_RULES",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success",
                "message": "All rules passed",
            }
        )

        # Step 4: Execute payment
        self.audit_logger.log("INFO", f"Executing payment of {amount_algo} ALGO...")
        logs.append(
            {
                "step": "EXECUTING_PAYMENT",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "processing",
                "message": f"Sending {amount_algo} ALGO to {receiver[:10]}...",
            }
        )

        amount_micro_algos = int(amount_algo * 1_000_000)
        payment_result: PaymentResult = payment_executor.execute_payment(
            sender=sender,
            receiver=receiver,
            amount_micro_algos=amount_micro_algos,
            note=f"algoPay Agent Payment: {amount_algo} ALGO",
        )

        if not payment_result.success:
            self.audit_logger.log("ERROR", f"Payment failed: {payment_result.message}")
            logs.append(
                {
                    "step": "EXECUTING_PAYMENT",
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "error",
                    "message": f"Payment failed: {payment_result.message}",
                }
            )

            return AgentExecutionResult(
                status="rejected",
                txid=None,
                reason=payment_result.error,
                message=payment_result.message,
                logs=logs,
                timestamp=timestamp,
                rules_checked=rules_checked,
            )

        # Step 5: Record success
        self.audit_logger.log("INFO", f"Payment successful: {payment_result.txid}")
        logs.append(
            {
                "step": "EXECUTING_PAYMENT",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success",
                "message": f"Payment confirmed: {payment_result.txid}",
            }
        )

        # Record in rule engine for daily tracking
        rule_engine.record_payment(sender, amount_algo)

        # Log completion
        self.audit_logger.log("INFO", "Payment execution completed")
        logs.append(
            {
                "step": "COMPLETED",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success",
                "message": "Payment execution completed successfully",
            }
        )

        return AgentExecutionResult(
            status="success",
            txid=payment_result.txid,
            reason=None,
            message=payment_result.message,
            logs=logs,
            timestamp=timestamp,
            rules_checked=rules_checked,
        )

    def _validate_address(self, address: str) -> bool:
        """Validate Algorand address format"""
        if not address:
            return False
        # Algorand addresses are 58 characters, base32
        if len(address) != 58:
            return False
        # Basic character check (Algorand uses base32)
        try:
            import base64

            base64.b32decode(address + "=" * (8 - len(address) % 8))
            return True
        except Exception:
            return False

    def _build_error_result(
        self, logs: list[dict], timestamp: str, status: str, reason: str, message: str
    ) -> AgentExecutionResult:
        logs.append(
            {
                "step": "ERROR",
                "timestamp": datetime.utcnow().isoformat(),
                "status": "error",
                "message": message,
            }
        )

        return AgentExecutionResult(
            status=status,
            txid=None,
            reason=reason,
            message=message,
            logs=logs,
            timestamp=timestamp,
            rules_checked=[],
        )

    def get_logs(self, limit: int = 100) -> list[dict]:
        """Get audit logs"""
        return self.audit_logger.get_logs(limit)

    def get_status(self) -> dict:
        """Get agent status"""
        return {
            "status": "online",
            "rules": {
                "max_per_transaction": rule_engine.max_per_transaction,
                "max_daily": rule_engine.max_daily,
                "min_transaction": rule_engine.min_transaction,
                "allowed_recipients_count": len(rule_engine.allowed_recipients),
            },
        }


# Global agent executor instance
agent_executor = AgentExecutor()
