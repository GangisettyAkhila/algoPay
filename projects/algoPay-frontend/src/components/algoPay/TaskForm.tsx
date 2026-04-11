import { useState } from 'react'
import { CreateTaskRequest } from '../../utils/algopayApi'

interface TaskFormProps {
  onSubmit: (task: CreateTaskRequest) => Promise<void>
  isSubmitting: boolean
  disabled?: boolean
}

export default function TaskForm({ onSubmit, isSubmitting, disabled }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deadline, setDeadline] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !amount || !recipient || !deadline) return

    await onSubmit({
      title,
      amount: parseFloat(amount),
      recipient,
      deadline: new Date(deadline).toISOString(),
    })

    setTitle('')
    setAmount('')
    setRecipient('')
    setDeadline('')
  }

  const isValid = title && amount && recipient && deadline

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-teal))',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
            Create Payment Task
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Auto-executes when deadline arrives · On-chain Algorand transfer
          </p>
        </div>
        <div className="tag tag-primary">
          ⚡ Auto-Execute
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Weekly vendor payment"
            className="form-input"
            disabled={disabled || isSubmitting}
          />
        </div>

        {/* Amount + Deadline row */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount (ALGO)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="form-input"
                style={{ paddingRight: '52px' }}
                disabled={disabled || isSubmitting}
              />
              <span style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.75rem', color: 'var(--accent-teal)', fontWeight: 700,
              }}>
                ALGO
              </span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="form-input"
              disabled={disabled || isSubmitting}
            />
          </div>
        </div>

        {/* Recipient */}
        <div className="form-group">
          <label className="form-label">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="ALGO address (58 characters)"
            className="form-input"
            style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            disabled={disabled || isSubmitting}
          />
          <p className="form-hint">Algorand Testnet address of the payment recipient</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || !!disabled || isSubmitting}
          className={`btn btn-full ${isValid && !disabled ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginTop: '4px', padding: '13px 20px' }}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              Scheduling Payment…
            </>
          ) : (
            <>🚀 Schedule Payment</>
          )}
        </button>
      </form>
    </div>
  )
}