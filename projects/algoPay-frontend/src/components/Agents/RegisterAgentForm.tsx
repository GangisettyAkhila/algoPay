import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { enqueueSnackbar } from 'notistack'
import { APP_IDS } from '../../utils/format'

interface RegisterAgentFormProps {
  openModal: boolean
  closeModal: () => void
}

export default function RegisterAgentForm({ openModal, closeModal }: RegisterAgentFormProps) {
  const { activeAddress } = useWallet()
  const [agentId, setAgentId] = useState('')
  const [metadataUri, setMetadataUri] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!openModal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAddress) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'warning' })
      return
    }

    if (!agentId.trim()) {
      enqueueSnackbar('Agent ID is required', { variant: 'error' })
      return
    }

    setIsLoading(true)
    try {
      // Get network config from environment
      const network = import.meta.env.VITE_ALGOD_NETWORK || 'localnet'
      const server = import.meta.env.VITE_ALGOD_SERVER || 'http://localhost'
      const port = import.meta.env.VITE_ALGOD_PORT || '4001'
      const token = import.meta.env.VITE_ALGOD_TOKEN || 'a'.repeat(64)

      // For now, show a success message (actual contract call would require proper signer setup)
      enqueueSnackbar('Agent registration ready! Configure signer for transactions.', { variant: 'info' })
      
      // In production, this would use the wallet's transactionSigner:
      // const registryClient = algorand.appClient.getById({
      //   appId: BigInt(APP_IDS.agentRegistry),
      //   defaultSender: activeAddress,
      //   signer: activeWallet.transactionSigner,
      // })
      // await registryClient.send.register({...})

      setAgentId('')
      setMetadataUri('')
      closeModal()
    } catch (error) {
      console.error('Registration failed:', error)
      enqueueSnackbar(`Registration failed: ${(error as Error).message}`, { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🤖 Register Agent</h3>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-box" style={{ marginBottom: '20px' }}>
              <span>ℹ️</span>
              <div>
                Register your autonomous agent to receive payments and execute tasks.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Agent ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., my-agent-001"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={isLoading}
              />
              <p className="form-hint">Unique identifier for your agent</p>
            </div>

            <div className="form-group">
              <label className="form-label">Metadata URI</label>
              <input
                type="text"
                className="form-input"
                placeholder="ipfs://Qm... (optional)"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
                disabled={isLoading}
              />
              <p className="form-hint">Link to agent metadata (IPFS, HTTPS)</p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !agentId.trim()}>
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Registering...
                </>
              ) : (
                'Register Agent'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
