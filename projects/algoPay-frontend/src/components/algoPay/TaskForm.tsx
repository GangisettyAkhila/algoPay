import { useState } from 'react'
import { CreateTaskRequest } from '../../utils/algopayApi'

interface TaskFormProps {
  onSubmit: (task: CreateTaskRequest) => Promise<void>
  isSubmitting: boolean
  disabled?: boolean
}

// Backend contract - exact field names
interface TaskPayload {
  title: string
  amount: number
  recipient: string
  deadline: string // ISO 8601 with IST timezone
}

function isValidAlgoAddress(addr: string): boolean {
  return /^[A-Z2-7]{58}$/.test(addr.trim())
}

function getISTDateTimeLocal(): string {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istTime = new Date(now.getTime() + istOffset)
  
  const year = istTime.getFullYear()
  const month = String(istTime.getMonth() + 1).padStart(2, '0')
  const day = String(istTime.getDate()).padStart(2, '0')
  const hours = String(istTime.getHours()).padStart(2, '0')
  const minutes = String(istTime.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Convert datetime-local input to IST ISO string
function toISTISOString(localDateTime: string): string {
  // Parse the local datetime
  const date = new Date(localDateTime)
  
  // Add IST offset manually to get correct IST time
  const istOffsetMinutes = 330 // +05:30
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000)
  const istTime = new Date(utcTime + (istOffsetMinutes * 60000))
  
  // Format as ISO with IST offset
  const iso = istTime.toISOString()
  return iso.replace('Z', '+05:30')
}

export default function TaskForm({ onSubmit, isSubmitting, disabled }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deadline, setDeadline] = useState(getISTDateTimeLocal())
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Validation
  const amountNum = parseFloat(amount)
  const amountError = amount && (isNaN(amountNum) || amountNum < 0.001)
    ? 'Min 0.001 ALGO'
    : null

  const addressError = recipient && !isValidAlgoAddress(recipient)
    ? 'Invalid address (must be 58 chars)'
    : null

  // Check if deadline is in the future (IST)
  const deadlineDate = new Date(deadline)
  const deadlineIST = new Date(deadlineDate.getTime() + (5.5 * 60 * 60 * 1000))
  const deadlineError = deadline && deadlineIST.getTime() <= Date.now()
    ? 'Must be in the future'
    : null

  const isValid = 
    title.trim().length > 0 && 
    amount && 
    !amountError && 
    recipient.trim().length === 58 && 
    !addressError && 
    deadline && 
    !deadlineError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitError(null)

    // Build payload matching EXACT backend schema
    const payload: TaskPayload = {
      title: title.trim(),
      amount: Number(amountNum),
      recipient: recipient.trim().toUpperCase(),
      deadline: toISTISOString(deadline), // Convert to IST ISO format
    }

    console.log('[TaskForm] Sending payload:', JSON.stringify(payload, null, 2))

    try {
      await onSubmit(payload)
      
      // Reset form on success
      setTitle('')
      setAmount('')
      setRecipient('')
      setDeadline(getISTDateTimeLocal())
    } catch (err) {
      console.error('[TaskForm] Error:', err)
      
      // Extract detailed error message
      let errorMessage = 'Failed to create task'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // @ts-ignore
        errorMessage = err.message || err.detail || JSON.stringify(err)
      }
      
      setSubmitError(errorMessage)
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
        {/* Title */}
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
          {!title.trim() && (
            <p className="text-[10px] text-zinc-400 mt-1">Required</p>
          )}
        </div>

        {/* Amount & Deadline */}
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

        {/* Recipient */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.toUpperCase())}
            placeholder="X7D2XPLG6MIXNCB7UJOEK6JV5YYNLFHWMXRDGXS5L5MGG6XZH7ILXQBOBY"
            className={`form-input font-mono text-xs ${addressError ? 'border-red-500' : ''}`}
            disabled={disabled || isSubmitting}
            maxLength={58}
          />
          {addressError && <p className="text-[10px] text-red-500 mt-1">{addressError}</p>}
          <p className="text-[10px] text-zinc-400 mt-1">{recipient.length}/58 characters</p>
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            <strong>Error:</strong> {submitError}
          </div>
        )}

        {/* Submit */}
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