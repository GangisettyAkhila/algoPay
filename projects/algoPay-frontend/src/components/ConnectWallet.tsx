import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { useMemo } from 'react'

interface ConnectWalletProps {
  open: boolean
  onClose: () => void
}

const ConnectWallet = ({ open, onClose }: ConnectWalletProps) => {
  const { wallets, activeAddress } = useWallet()
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const networkName = useMemo(
    () => (algodConfig.network === '' ? 'localnet' : algodConfig.network.toLowerCase()),
    [algodConfig.network],
  )

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {activeAddress ? '👤 Wallet Connected' : '🔗 Connect Wallet'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} id="close-wallet-modal">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {activeAddress ? (
            /* Connected View */
            <div>
              <div className="card card-elevated" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                  }}>
                    🦊
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Connected on
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tag tag-teal">{networkName}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-label">Address</div>
                  <div className="address-chip">
                    {activeAddress}
                  </div>
                </div>
              </div>

              <a
                className="btn btn-ghost btn-sm"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}
                style={{ marginBottom: '4px', display: 'inline-flex' }}
              >
                🔍 View on Explorer
              </a>
            </div>
          ) : (
            /* Not Connected View */
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                Choose a wallet to connect and start using algoPay's agent payment network.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {wallets?.map((wallet) => (
                  <button
                    id={`${wallet.id}-connect`}
                    key={`provider-${wallet.id}`}
                    className="wallet-option"
                    onClick={() => {
                      wallet.connect()
                      onClose()
                    }}
                  >
                    {!isKmd(wallet) ? (
                      <img alt={`wallet_icon_${wallet.id}`} src={wallet.metadata.icon} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>🔐</span>
                    )}
                    <span>{isKmd(wallet) ? 'LocalNet KMD Wallet' : wallet.metadata.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: activeAddress ? 'space-between' : 'flex-end' }}>
          {activeAddress && (
            <LogoutButton />
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const LogoutButton = () => {
  const { wallets, activeAddress } = useWallet()
  const handleLogout = async () => {
    if (!wallets) return
    const active = wallets.find((w) => w.isActive)
    if (active) {
      await active.disconnect()
    } else {
      localStorage.removeItem('@txnlab/use-wallet:v3')
      window.location.reload()
    }
  }
  if (!activeAddress) return null
  return (
    <button id="logout-btn" className="btn btn-danger btn-sm" onClick={handleLogout}>
      🚪 Disconnect
    </button>
  )
}

export default ConnectWallet
