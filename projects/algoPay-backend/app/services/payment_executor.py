"""
Payment Executor - Executes payments on Algorand Testnet
"""

from dataclasses import dataclass
from typing import Optional
import os
import logging
from algosdk import account, mnemonic
from algosdk.transaction import PaymentTxn, wait_for_confirmation
from algosdk.v2client.algod import AlgodClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    """Result of a payment execution"""

    success: bool
    txid: Optional[str]
    error: Optional[str]
    message: str


class PaymentExecutor:
    """
    Executes payments on Algorand Testnet.

    Uses backend wallet's mnemonic for signing.
    """

    def __init__(self):
        # Algod configuration - Testnet only
        self.algod_token = os.getenv("ALGOD_TOKEN", "")
        self.algod_server = os.getenv(
            "ALGOD_SERVER", "https://testnet-api.algonode.cloud"
        )
        self.algod_port = os.getenv("ALGOD_PORT", "")

        logger.info(f"🚀 Connecting to Algorand Testnet: {self.algod_server}")

        # Initialize Algod client
        self._client: Optional[AlgodClient] = None
        self._backend_address: Optional[str] = None

        # Backend wallet mnemonic (for signing transactions)
        self.backend_mnemonic = os.getenv("BACKEND_MNEMONIC", "")

        if not self.backend_mnemonic:
            logger.error("❌ BACKEND_MNEMONIC not configured in .env")
        else:
            addr = self._get_backend_address()
            logger.info(f"✅ Backend wallet configured: {addr}")

    @property
    def client(self) -> AlgodClient:
        """Lazy initialization of Algod client"""
        if self._client is None:
            self._client = AlgodClient(
                self.algod_token, self.algod_server, self.algod_port
            )
            logger.info("📡 Algod client connected to Testnet")
        return self._client

    def _get_backend_private_key(self) -> str:
        """Get backend private key from mnemonic"""
        if not self.backend_mnemonic:
            raise ValueError("BACKEND_MNEMONIC not configured in .env file")
        return mnemonic.to_private_key(self.backend_mnemonic)

    def _get_backend_address(self) -> str:
        """Get backend address"""
        if self._backend_address is None:
            private_key = self._get_backend_private_key()
            self._backend_address = account.address_from_private_key(private_key)
        return self._backend_address

    def get_backend_address(self) -> str:
        """Public method to get backend address for display"""
        return self._get_backend_address()

    def execute_payment(
        self,
        sender: str,
        receiver: str,
        amount_micro_algos: int,
        note: str = "algoPay Agent Payment",
    ) -> PaymentResult:
        """
        Execute a payment transaction on Testnet.

        Args:
            sender: Sender address (must match backend wallet)
            receiver: Receiver address
            amount_micro_algos: Amount in microAlgos
            note: Transaction note

        Returns:
            PaymentResult with txid or error
        """
        try:
            backend_address = self._get_backend_address()

            logger.info(
                f"💳 Payment request: {amount_micro_algos} microAlgos to {receiver}"
            )
            logger.info(f"📤 From: {backend_address}")

            # Verify sender matches backend wallet
            if sender.lower() != backend_address.lower():
                logger.error(f"❌ Sender mismatch: {sender} != {backend_address}")
                return PaymentResult(
                    success=False,
                    txid=None,
                    error="SENDER_MISMATCH",
                    message="Sender address does not match backend wallet",
                )

            # Get private key
            private_key = self._get_backend_private_key()

            # Get transaction params
            logger.info("⏳ Getting transaction params...")
            params = self.client.suggested_params()

            # Create payment transaction
            logger.info("📝 Building payment transaction...")
            txn = PaymentTxn(
                sender=backend_address,
                sp=params,
                receiver=receiver,
                amt=amount_micro_algos,
                note=note.encode(),
            )

            # Sign and send
            logger.info("✍️ Signing transaction...")
            signed_txn = txn.sign(private_key)

            logger.info("📤 Sending to network...")
            txid = self.client.send_transaction(signed_txn)
            logger.info(f"✅ Transaction sent! TXID: {txid}")

            # Wait for confirmation
            logger.info("⏳ Waiting for confirmation...")
            confirmed_txn = wait_for_confirmation(self.client, txid, timeout=30)

            round_num = confirmed_txn.get("confirmed-round", "unknown")
            logger.info(f"🎉 Transaction confirmed in round {round_num}")

            return PaymentResult(
                success=True,
                txid=txid,
                error=None,
                message=f"Payment confirmed in round {round_num}",
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Payment failed: {error_msg}")
            if "HTTP" in error_msg:
                return PaymentResult(
                    success=False, txid=None, error="ALGOD_ERROR", message=error_msg
                )
            return PaymentResult(
                success=False, txid=None, error="UNKNOWN_ERROR", message=error_msg
            )

    def get_balance(self, address: str) -> int:
        """Get account balance in microAlgos"""
        try:
            account_info = self.client.account_info(address)
            balance = account_info.get("amount", 0)
            logger.info(f"💰 Balance for {address[:10]}...: {balance} microAlgos")
            return balance
        except Exception as e:
            logger.error(f"❌ Failed to get balance: {e}")
            return 0


# Global payment executor instance
payment_executor = PaymentExecutor()
