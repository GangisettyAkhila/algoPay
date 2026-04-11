import { useState } from 'react'
import { useWallet } from '../../context/WalletContext'
import ConnectWallet from '../ConnectWallet'

export default function Navbar() {
  const { address, balance, isConnected } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">A</div>
          <span className="navbar-name">algoPay</span>
        </div>

        <div className="navbar-actions">
          {isConnected ? (
            <button 
              className="wallet-pill" 
              onClick={() => setShowWalletModal(true)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '6px 14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="dot" />
                {address?.slice(0, 8)}...{address?.slice(-4)}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                {balance.toFixed(4)} ALGO
              </div>
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowWalletModal(true)}
            >
              🦊 Connect Wallet
            </button>
          )}
        </div>
      </nav>

      <ConnectWallet open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </>
  )
}
