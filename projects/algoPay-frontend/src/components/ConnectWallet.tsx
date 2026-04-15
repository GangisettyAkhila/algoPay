import { useWallet } from '../context/WalletContext'
import { formatAddress } from '../utils/format'

interface ConnectWalletProps {
  open?: boolean
  onClose?: () => void
}

export default function ConnectWallet({ open = true, onClose }: ConnectWalletProps) {
  const { address, balance, isConnected, isConnecting, connect, disconnect } = useWallet()

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isConnected ? '👤 Wallet Connected' : '🔗 Connect Wallet'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isConnected ? (
            <div>
              <div className="card card-elevated" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-color), #059669)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.5rem'
                  }}>
                    🦊
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Connected with
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tag tag-teal">Pera Wallet</span>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <div className="form-label">Address</div>
                  <div className="address-chip">
                    {formatAddress(address!, 12)}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label">Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-color)' }}>
                    {balance.toFixed(4)} ALGO
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  className="btn btn-ghost btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://testnet.algoexplorer.io/address/${address}`}
                >
                  🔍 View on Explorer
                </a>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px', textAlign: 'center' }}>
                Connect your wallet using Pera Wallet to access AlgoPay Agent features.
              </p>
              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => connect('pera')}
                  disabled={isConnecting}
                  style={{ minWidth: '200px' }}
                >
                  {isConnecting ? (
                    <>
                      <span className="spinner" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      🦊 Connect with Pera Wallet
                    </>
                  )}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                  Scan QR code with Pera Wallet mobile app
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: isConnected ? 'space-between' : 'flex-end' }}>
          {isConnected && (
            <button className="btn btn-danger btn-sm" onClick={disconnect}>
              🚪 Disconnect
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            {isConnected ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
