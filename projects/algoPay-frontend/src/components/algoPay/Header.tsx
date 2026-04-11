import { useWallet } from '../../context/WalletContext'

export default function Header() {
  const { address, balance, isConnected, connect, disconnect, isConnecting } = useWallet()

  return (
    <header className="navbar">
      {/* Brand */}
      <a href="#" className="navbar-brand">
        <div className="navbar-logo">A</div>
        <span className="navbar-name">AlgoPay</span>
      </a>

      {/* Center Nav */}
      <nav className="navbar-nav">
        <span className="nav-link active">Dashboard</span>
        <a
          href="https://testnet.algoexplorer.io"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          Explorer ↗
        </a>
      </nav>

      {/* Wallet Actions */}
      <div className="navbar-actions">
        {isConnected ? (
          <>
            {/* Backend balance chip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.2)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--accent-teal)',
              fontWeight: 600,
            }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>ALGO</span>
              <span>{balance.toFixed(3)}</span>
            </div>

            {/* Address pill */}
            <div className="wallet-pill">
              <span className="dot" />
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''}
              </span>
            </div>

            {/* Disconnect */}
            <button className="btn btn-ghost btn-sm" onClick={disconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Connecting…
              </>
            ) : (
              <>⚡ Connect Wallet</>
            )}
          </button>
        )}
      </div>
    </header>
  )
}