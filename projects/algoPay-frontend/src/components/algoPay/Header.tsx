import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'

export default function Header() {
  const { address, balance, isConnected, connect, disconnect, isConnecting } = useWallet()
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode)

  return (
    <header className="navbar">
      <div className="flex items-center gap-10">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 bg-[var(--accent-color)] rounded-lg flex items-center justify-center font-bold text-white text-sm tracking-tight transition-transform group-hover:scale-105" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            A
          </div>
          <span className="text-[var(--text-primary)] font-bold text-lg tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            AlgoPay
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/dashboard"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-emerald-50 text-[var(--accent-color)] dark:bg-emerald-900/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dashboard
          </Link>
          <a
            href="https://lora.algokit.io/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Explorer ↗
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? '🌞' : '🌙'}
        </button>

        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">Balance</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{balance.toFixed(2)} ALGO</span>
            </div>
            
            <a 
              href={`https://lora.algokit.io/testnet/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="wallet-pill group hover:border-emerald-500/30 transition-colors no-underline"
            >
              <span className="status-dot bg-emerald-500 group-hover:animate-pulse" />
              <span className="font-mono">
                {address?.slice(0, 4)}…{address?.slice(-4)}
              </span>
            </a>

            <button
              onClick={disconnect}
              className="btn btn-ghost px-2 text-xs font-bold uppercase tracking-widest hover:text-[var(--accent-color)]"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect('pera')}
            disabled={isConnecting}
            className="btn btn-primary px-5"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  )
}