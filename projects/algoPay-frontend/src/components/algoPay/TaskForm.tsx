import { useState } from 'react'
import { CreateTaskRequest } from '../../utils/algopayApi'

interface TaskFormProps {
  onSubmit: (task: CreateTaskRequest) => Promise<void>
  isSubmitting: boolean
  disabled?: boolean
}

function isValidAlgoAddress(addr: string): boolean {
  return /^[A-Z2-7]{58}$/.test(addr.trim())
}

export default function TaskForm({ onSubmit, isSubmitting, disabled }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const amountNum = parseFloat(amount)
  const amountError = amount && (isNaN(amountNum) || amountNum < 0.001)
    ? 'Minimum 0.001 ALGO'
    : null

  const addressError = recipient && !isValidAlgoAddress(recipient)
    ? 'Invalid Algorand address'
    : null

  const deadlineError = deadline && new Date(deadline).getTime() <= Date.now()
    ? 'Must be in the future'
    : null

  const isValid = title.trim() && amount && !amountError && recipient.trim() && !addressError && deadline && !deadlineError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitError(null)

    try {
      const isoDeadline = new Date(deadline).toISOString()
      await onSubmit({
        title: title.trim(),
        amount: amountNum,
        recipient: recipient.trim(),
        deadline: isoDeadline,
      })

      setTitle('')
      setAmount('')
      setRecipient('')
      setDeadline('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  return (
    <div className="card slide-up shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="section-title text-zinc-900 dark:text-zinc-100">Create Payment Task</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Funds are managed and released based on the deadline.
          </p>
        </div>
        <div className="tag tag-emerald">
          <span className="status-dot bg-emerald-500 mr-2" />
          Autonomous
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Task Description
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Infrastructure Payment"
            className="form-input"
            disabled={disabled || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Amount (ALGO)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`form-input pr-16 ${amountError ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={disabled || isSubmitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ALGO
              </span>
            </div>
            {amountError && <p className="text-[10px] text-red-500 font-bold mt-1.5">{amountError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Execution Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`form-input ${deadlineError ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={disabled || isSubmitting}
            />
            {deadlineError && <p className="text-[10px] text-red-500 font-bold mt-1.5">{deadlineError}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Recipient Wallet
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.toUpperCase())}
            placeholder="58-character Algorand Address"
            className={`form-input font-mono text-xs ${addressError ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={disabled || isSubmitting}
          />
          {addressError && <p className="text-[10px] text-red-500 font-bold mt-1.5">{addressError}</p>}
        </div>

        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-3">
            <span>⚠️</span>
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || !!disabled || isSubmitting}
          className="btn btn-primary w-full h-12 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <span className="spinner border-t-white" />
              Processing Payment...
            </>
          ) : (
            'Schedule Autonomous Payment'
          )}
        </button>
      </form>
    </div>
  )
}