# algoPay - Agent Development Guide

## Project Overview

algoPay is a full-stack Algorand dApp for enabling agent-to-agent payments on the Algorand blockchain. The project consists of:

- **algoPay-contracts/**: Algorand smart contracts written in Python (PuyaPy)
- **algoPay-frontend/**: React + TypeScript frontend with wallet integration

### Implemented Contracts

| Contract | Description |
|----------|-------------|
| `Algopay` | Original starter contract with hello method |
| `PaymentAgent` | Agent payment contract with spending limits |
| `AgentRegistry` | Agent discovery and registration |

### Tech Stack
- **Smart Contracts**: Python (PuyaPy/Algorand Python), algokit-utils
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS
- **Blockchain**: Algorand AVM, ARC-4 ABI, ARC-56 app specs
- **Wallets**: use-wallet (Pera, Defly, Exodus, KMD)
- **Package Managers**: Poetry (Python), npm (Node.js)

---

## Development Commands

### Workspace Commands (root)
```bash
# Build all projects
algokit project run build

# Bootstrap dependencies
algokit project bootstrap all

# Deploy to localnet
algokit project deploy localnet
```

### Smart Contract Commands (algoPay-contracts)
```bash
cd projects/algoPay-contracts

# Build all contracts
poetry run python -m smart_contracts build

# Build specific contract
poetry run python -m smart_contracts build algopay
poetry run python -m smart_contracts build algopay_payment_agent
poetry run python -m smart_contracts build algopay_agent_registry

# Deploy contracts
poetry run python -m smart_contracts deploy

# Audit TEAL
algokit task analyze smart_contracts/artifacts --recursive --force
```

### Frontend Commands (algoPay-frontend)
```bash
cd projects/algoPay-frontend

# Development server
npm run dev

# Build for production
npm run build

# Generate app clients from contracts
npm run generate:app-clients
```

### LocalNet
```bash
algokit localnet start
algokit localnet reset
algokit localnet status
```

---

## Smart Contract Reference

### PaymentAgent Contract

```python
class PaymentAgent(ARC4Contract):
    @abimethod(create="allow")
    def bootstrap(self, owner: Account, agent_id: String) -> None:
        """Initialize agent with owner and agent ID."""

    @abimethod()
    def send_payment(self, receiver: Account, amount: UInt64) -> None:
        """Send payment from contract to receiver."""

    @abimethod()
    def receive_payment(self, payment: gtxn.PaymentTransaction) -> None:
        """Track incoming payments with group transaction."""

    @abimethod()
    def set_spending_limit(self, limit: UInt64) -> None:
        """Set maximum per-transaction limit."""

    @abimethod()
    def set_daily_limit(self, limit: UInt64) -> None:
        """Set maximum daily spending limit."""

    @abimethod()
    def register_as_agent(self, registry_app: Application, metadata_uri: String) -> None:
        """Register this agent with the agent registry."""

    @abimethod()
    def withdraw_to_owner(self, amount: UInt64) -> None:
        """Withdraw funds back to owner."""

    @abimethod(readonly=True)
    def get_balance(self) -> UInt64:
        """Get contract balance."""

    @abimethod(readonly=True)
    def get_stats(self) -> tuple[UInt64, UInt64, bool, String]:
        """Get total received, sent, registered status, agent ID."""

    @abimethod(readonly=True)
    def get_limits(self) -> tuple[UInt64, UInt64, UInt64]:
        """Get spending limit, daily limit, daily spent."""
```

### AgentRegistry Contract

```python
class AgentRegistry(ARC4Contract):
    @abimethod(create="allow")
    def bootstrap(self, admin: Account) -> None:
        """Initialize registry with admin."""

    @abimethod()
    def register(self, agent_id: String, metadata_uri: String) -> None:
        """Register a new agent."""

    @abimethod()
    def update_metadata(self, agent_id: String, metadata_uri: String) -> None:
        """Update agent metadata."""

    @abimethod()
    def unregister(self, agent_id: String) -> None:
        """Unregister an agent."""

    @abimethod(readonly=True)
    def lookup(self, agent_id: String) -> Account:
        """Look up agent by ID."""

    @abimethod(readonly=True)
    def get_metadata(self, agent_id: String) -> String:
        """Get agent metadata URI."""

    @abimethod(readonly=True)
    def is_registered(self, agent_id: String) -> bool:
        """Check if agent ID is registered."""

    @abimethod(readonly=True)
    def get_count(self) -> UInt64:
        """Get total registered agents."""

    @abimethod(readonly=True)
    def is_agent(self, address: Account) -> bool:
        """Check if address is a registered agent."""
```

---

## Code Style Guidelines

### Python (Smart Contracts)

**Imports**
```python
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
```

**Important Syntax Rules**
- Use `UInt64`, `String`, `Bytes` from algopy (not Python builtins)
- Division: use `//` not `/`
- Length: use `.length` not `len()`
- Inner transaction fees: always `fee=0` (caller covers via fee pooling)
- Readonly methods: `@arc4.abimethod(readonly=True)` not `readable=True`

### TypeScript (Frontend)

**Naming Conventions**
- Components: `PascalCase` (e.g., `PaymentModal`)
- Hooks: `camelCase` with `use` prefix
- Variables: `camelCase`
- Interfaces: `PascalCase` (e.g., `WalletState`)

**Formatting**
- Use ESLint and Prettier
- Single quotes for strings
- Semicolons required
- 2-space indentation

---

## Project Structure

```
algoPay/
├── projects/
│   ├── algoPay-contracts/
│   │   ├── smart_contracts/
│   │   │   ├── algopay/
│   │   │   │   ├── contract.py
│   │   │   │   ├── payment_agent.py      # Agent payment contract
│   │   │   │   ├── agent_registry.py      # Agent registry
│   │   │   │   └── *_deploy.py           # Deploy configs
│   │   │   └── artifacts/                # Compiled contracts
│   │   └── pyproject.toml
│   └── algoPay-frontend/
│       ├── src/
│       │   ├── contracts/                 # Generated TS clients
│       │   │   ├── Algopay.ts
│       │   │   ├── PaymentAgent.ts
│       │   │   └── AgentRegistry.ts
│       │   └── components/
│       └── package.json
└── .algokit.toml
```

---

## Next Steps for Agent-to-Agent Payments

### Phase 1: Frontend UI (COMPLETED CONTRACTS)
- [x] PaymentAgent contract with spending limits
- [x] AgentRegistry for agent discovery
- [x] TypeScript clients generated

### Phase 2: Frontend Integration (TODO)
- [ ] Agent registration UI
- [ ] Payment form with recipient lookup
- [ ] Transaction history display
- [ ] Agent directory browser

### Phase 3: Advanced Features (TODO)
- [ ] Payment channels for off-chain scaling
- [ ] Rekeying for secure contract accounts
- [ ] Multi-asset payment support
- [ ] Agent SDK for programmatic agent communication

---

## Resources

- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Puya (Algorand Python)](https://github.com/algorandfoundation/puya)
- [Algorand Developer Portal](https://developer.algorand.org/)
- [ARC-4 ABI Specification](https://github.com/algorandfoundation/ARCs/blob/main/ARC-0004.md)
- [use-wallet React Hook](https://github.com/txnlab/use-wallet)
