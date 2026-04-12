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

function getISTDateTimeLocal(): string {
  // Get current time in IST and format for datetime-local input
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // 5:30 hours in ms
  const istTime = new Date(now.getTime() + istOffset)
  
  const year = istTime.getFullYear()
  const month = String(istTime.getMonth() + 1).padStart(2, '0')
  const day = String(istTime.getDate()).padStart(2, '0')
  const hours = String(istTime.getHours()).padStart(2, '0')
  const minutes = String(istTime.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function TaskForm({ onSubmit, isSubmitting, disabled }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deadline, setDeadline] = useState(getISTDateTimeLocal())
  const [submitError, setSubmitError] = useState<string | null>(null)

  const amountNum = parseFloat(amount)
  const amountError = amount && (isNaN(amountNum) || amountNum < 0.001)
    ? 'Min 0.001 ALGO'
    : null

  const addressError = recipient && !isValidAlgoAddress(recipient)
    ? 'Invalid address'
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
      // Convert to ISO format with IST offset
      const deadlineISO = new Date(deadline).toISOString()
      
      await onSubmit({
        title: title.trim(),
        amount: amountNum,
        recipient: recipient.trim(),
        deadline: deadlineISO,
      })

      setTitle('')
      setAmount('')
      setRecipient('')
      setDeadline(getISTDateTimeLocal())
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="card shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Schedule Payment</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Funds will be released at the scheduled time.
          </p>
        </div>
        <div className="tag tag-emerald bg-emerald-50 text-emerald-700">
          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
          IST Timezone
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Description</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Payment"
            className="form-input"
            disabled={disabled || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Amount (ALGO)</label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="form-input pr-12"
                disabled={disabled || isSubmitting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">ALGO</span>
            </div>
            {amountError && <p className="text-[10px] text-red-500 mt-1">{amountError}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Execution Time (IST)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="form-input"
              disabled={disabled || isSubmitting}
            />
            {deadlineError && <p className="text-[10px] text-red-500 mt-1">{deadlineError}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.toUpperCase())}
            placeholder="57-character Algorand address"
            className="form-input font-mono text-xs"
            disabled={disabled || isSubmitting}
          />
          {addressError && <p className="text-[10px] text-red-500 mt-1">{addressError}</p>}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{submitError}</div>
        )}

        <button
          type="submit"
          disabled={!isValid || !!disabled || isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? 'Processing...' : 'Schedule Payment'}
        </button>
      </form>
    </div>
  )
}