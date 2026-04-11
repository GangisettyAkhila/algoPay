

## Goal

Build a clean, modern UI for AlgoPay that connects to backend and shows real autonomous payments on Algorand Testnet.

---

## Planning

* [x] Read designated skills (ui-ux-pro-max, frontend-design, frontend-ui-dark-ts, tailwind-design-system, blockchain-developer)
* [x] Understand backend API (/api/tasks)
* [x] (Optional) Read backend TS clients (AgentRegistry.ts, PaymentAgent.ts) for reference only
* [x] Design simple SaaS-style dashboard UI

---

## Execution

### 1. Layout

* [x] Header with:

  * App name: AlgoPay
  * Headline: Automate Payments on Algorand
  * Tagline: Create payment tasks that execute automatically on-chain
* [x] Centered container (max-w-6xl mx-auto px-6 py-6)

---

### 2. Wallet Integration

* [x] Connect Wallet (Pera)
* [x] Display wallet address (shortened)
* [x] Add Disconnect button
* [x] Allow reconnect via QR code
* [x] Prevent forced auto-connect on load

---

### 3. Task Form

* [x] Create form:

  * Title
  * Amount
  * Recipient
  * Deadline
* [x] Validate inputs
* [x] POST to /api/tasks
* [x] Show loading + success states

---

### 4. Task List

* [x] Fetch tasks from /api/tasks
* [x] Display:

  * Title
  * Amount
  * Status (pending / paid / rejected)
  * Deadline
  * TX ID (if available)
* [x] Sort tasks (pending first)

---

### 5. Transaction Display

* [x] Make TX ID clickable
* [x] Link to:
  https://testnet.algoexplorer.io/tx/{tx_id}

---

### 6. Auto Updates

* [x] Poll backend every 5 seconds
* [x] Update UI automatically
* [x] Handle loading and error states

---

### 7. Activity Log

* [x] Show recent events:

  * Task created
  * Task executed
  * Payment success/failure
* [x] Newest events first

---

## Verification

* [ ] Walkthrough testing (create → execute → verify TX)
* [ ] Verify responsive design (mobile + desktop)
* [x] Verify dark/light mode works correctly
* [ ] Confirm wallet connect/disconnect/reconnect works
* [ ] Confirm TX opens correctly in AlgoExplorer

---

## IMPORTANT RULES

* NO mock data
* DO NOT implement Agent Registry or extra features
* DO NOT redesign backend logic
* FOCUS on working demo flow

---

## FINAL SUCCESS

User can:

1. Connect wallet
2. Create task
3. Wait for execution
4. See status change to "paid"
5. Click TX and verify on AlgoExplorer

UI must clearly demonstrate automation and real blockchain execution.
