import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { enqueueSnackbar } from 'notistack'

interface PaymentFormProps {
  openModal: boolean
  closeModal: () => void
}

export default function PaymentForm({ openModal, closeModal }: PaymentFormProps) {
  const { activeAddress } = useWallet()
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!openModal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }

    if (!receiver.trim()) {
      enqueueSnackbar('Receiver address is required', { variant: 'error' })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar('Please enter a valid amount', { variant: 'error' })
      return
    }

    setIsLoading(true)
    try {
      enqueueSnackbar('Payment ready! Configure signer for transactions.', { variant: 'info' })
      
      setReceiver('')
      setAmount('')
      setNote('')
      closeModal()
    } catch (error) {
      console.error('Payment failed:', error)
      enqueueSnackbar(`Payment failed: ${(error as Error).message}`, { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💸 A2A Payment</h3>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-box" style={{ marginBottom: '20px' }}>
              <span>ℹ️</span>
              <div>
                Send A2A payment through your registered agent.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Receiver Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="X7D2X... (58 characters)"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (ALGO) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
              <p className="form-hint">
                ≈ {amount ? (parseFloat(amount) * 1e6).toLocaleString() : '0'} microAlgos
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <textarea
                className="form-input"
                placeholder="Payment description..."
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isLoading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={isLoading || !receiver.trim() || !amount}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Sending...
                </>
              ) : (
                '💸 Send Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
