# Aglopay Frontend Implementation Plan

## Overview
Build a full-featured Algorand autonomous agent payment platform frontend with dark theme.

## Tech Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS (via CDN for simplicity)
- use-wallet (Pera, Defly, Exodus)
- algokit-utils for contract interactions

## App IDs (to be configured)
- AgentRegistry: 1006
- PaymentAgent: 1008
- TaskManager: 1010 (to be deployed)

## Pages & Features

### 1. Home/Dashboard
- Hero section with platform tagline
- Stats cards (Total Agents, Active Tasks, Total Payments)
- Quick actions (Register Agent, Make Payment, Create Task)
- Recent activity feed

### 2. Agent Registration
- Form: Agent ID, Metadata URI
- Register with AgentRegistry contract
- Auto-deploy PaymentAgent for new agents

### 3. Agent Directory
- List all registered agents
- Search by agent ID
- View agent details and stats
- Connect with agent for payments

### 4. A2A Payments
- Select sender agent
- Enter receiver address
- Enter amount (microAlgos)
- Add notes
- Submit transaction

### 5. Task Management
- Create task form
- Task list with status
- Execute task (for agents)
- Cancel/complete task

## Component Structure
```
src/
├── components/
│   ├── Layout/
│   │   ├── Navbar.tsx
│   │   └── PageLayout.tsx
│   ├── Wallet/
│   │   └── WalletButton.tsx
│   ├── Agents/
│   │   ├── AgentCard.tsx
│   │   └── RegisterAgentForm.tsx
│   ├── Payments/
│   │   └── PaymentForm.tsx
│   └── Tasks/
│       ├── TaskCard.tsx
│       └── CreateTaskForm.tsx
├── pages/
│   ├── Home.tsx
│   ├── Agents.tsx
│   ├── Payments.tsx
│   └── Tasks.tsx
├── hooks/
│   └── useAlgorand.ts
├── utils/
│   └── format.ts
└── App.tsx
```

## Key Implementation Details

### Wallet Connection
- Use use-wallet-react with Pera, Defly, Exodus
- Show wallet address in navbar when connected
- Prompt to connect before any action

### Contract Interactions
- Use typed clients from generated TS code
- App IDs from environment variables
- Loading states during transactions
- Success/error toasts

### Styling
- Use existing dark theme CSS variables
- Tailwind utilities where helpful
- Consistent spacing and typography
