import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { enqueueSnackbar } from 'notistack'

interface CreateTaskFormProps {
  openModal: boolean
  closeModal: () => void
}

export default function CreateTaskForm({ openModal, closeModal }: CreateTaskFormProps) {
  const { activeAddress } = useWallet()
  const [taskId, setTaskId] = useState('')
  const [assignedAgent, setAssignedAgent] = useState('')
  const [description, setDescription] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [recurringDays, setRecurringDays] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!openModal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }

    if (!taskId.trim() || !assignedAgent.trim() || !description.trim()) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' })
      return
    }

    const paymentNum = parseFloat(paymentAmount)
    if (isNaN(paymentNum) || paymentNum <= 0) {
      enqueueSnackbar('Please enter a valid payment amount', { variant: 'error' })
      return
    }

    setIsLoading(true)
    try {
      enqueueSnackbar('Task created! Configure signer for on-chain execution.', { variant: 'info' })
      
      setTaskId('')
      setAssignedAgent('')
      setDescription('')
      setPaymentAmount('')
      setDeadline('')
      setRecurringDays('')
      closeModal()
    } catch (error) {
      console.error('Task creation failed:', error)
      enqueueSnackbar(`Task creation failed: ${(error as Error).message}`, { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📋 Create Task</h3>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-box" style={{ marginBottom: '20px' }}>
              <span>ℹ️</span>
              <div>
                Assign a task to an agent. Payment is released when the agent executes the task.
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Task ID *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="task-001"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Agent *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="X7D2X... (58 chars)"
                  value={assignedAgent}
                  onChange={(e) => setAssignedAgent(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-input"
                placeholder="Task description..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Payment (ALGO) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  step="0.001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deadline (rounds)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1440 (~1 day)"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recurring (days)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0 (one-time)"
                  value={recurringDays}
                  onChange={(e) => setRecurringDays(e.target.value)}
                  disabled={isLoading}
                />
                <p className="form-hint">0 = one-time task</p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isLoading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !taskId.trim() || !assignedAgent.trim() || !description.trim() || !paymentAmount}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
