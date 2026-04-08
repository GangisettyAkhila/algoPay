import { useWallet } from '@txnlab/use-wallet-react'
import { formatAddress } from '../../utils/format'
import ConnectWallet from '../ConnectWallet'
import { useState } from 'react'

interface NavbarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { activeAddress, wallets } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)

  const disconnect = async () => {
    const active = wallets?.find((w) => w.isActive)
    if (active) {
      await active.disconnect()
    }
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'payments', label: 'Payments', icon: '💸' },
    { id: 'tasks', label: 'Tasks', icon: '📋' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
          <div className="navbar-logo">A</div>
          <span className="navbar-name">algoPay</span>
        </div>

        <div className="navbar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span style={{ marginRight: '6px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="navbar-actions">
          {activeAddress ? (
            <button className="wallet-pill" onClick={disconnect}>
              <span className="dot" />
              {formatAddress(activeAddress)}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowWalletModal(true)}
            >
              🔗 Connect Wallet
            </button>
          )}
        </div>
      </nav>

      <ConnectWallet open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </>
  )
}
