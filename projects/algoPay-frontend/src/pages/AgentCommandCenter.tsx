import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import ConnectWallet from '../components/ConnectWallet'
import { executePayment, healthCheck } from '../utils/api'

export interface LogEntry {
  step: string
  timestamp: string
  status: 'received' | 'processing' | 'success' | 'rejected' | 'error'
  message: string
}

export default function AgentCommandCenter() {
  const { address, balance, isConnected } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const checkBackend = async () => {
    try {
      await healthCheck()
      setBackendOnline(true)
    } catch {
      setBackendOnline(false)
    }
  }

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, {
      ...entry,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address) {
      addLog({ step: 'ERROR', status: 'error', message: 'Please connect your wallet first' })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      addLog({ step: 'ERROR', status: 'error', message: 'Invalid amount' })
      return
    }

    setLogs([])
    setIsExecuting(true)

    try {
      addLog({ step: 'REQUEST', status: 'processing', message: 'Sending payment request to agent...' })

      const response = await executePayment(address, receiver.trim(), amountNum)
      
      for (const log of response.logs) {
        addLog({
          step: log.step,
          status: log.status as LogEntry['status'],
          message: log.message
        })
      }
    } catch (error: unknown) {
      addLog({ 
        step: 'ERROR', 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to connect to backend' 
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleReset = () => {
    setReceiver('')
    setAmount('')
    setLogs([])
  }

  const getLogColor = (status: string) => {
    switch (status) {
      case 'success': return 'var(--accent-emerald)'
      case 'rejected': return 'var(--accent-rose)'
      case 'processing': return 'var(--accent-amber)'
      case 'error': return 'var(--accent-rose)'
      default: return 'var(--text-secondary)'
    }
  }

  const getLastLog = () => logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <div className="command-center">
      {/* Header */}
      <div className="cc-header">
        <div>
          <h1 className="cc-title">🤖 Agent Command Center</h1>
          <p className="cc-subtitle">Execute payments through autonomous agents</p>
        </div>
        {isConnected && (
          <div className="cc-wallet-info">
            <span className="cc-address">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
            <span className="cc-balance">{balance.toFixed(4)} ALGO</span>
          </div>
        )}
      </div>

      {/* Backend Status */}
      <div className="cc-panel" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Backend:</span>
          {backendOnline === null ? (
            <button 
              onClick={checkBackend}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-primary)', 
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Check Status
            </button>
          ) : backendOnline ? (
            <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>🟢 Online</span>
          ) : (
            <span style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>🔴 Offline (run `npm run dev:backend`)</span>
          )}
        </div>
      </div>

      <div className="cc-content">
        {/* Input Section */}
        <div className="cc-panel cc-input-panel">
          <h3 className="cc-panel-title">📥 Payment Instruction</h3>
          
          {!isConnected ? (
            <div className="cc-connect-prompt">
              <div className="cc-connect-icon">🦊</div>
              <p>Connect your wallet to execute payments</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="cc-form-group">
                <label className="cc-label">Sender (You)</label>
                <input
                  type="text"
                  className="cc-input"
                  value={address || ''}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div className="cc-form-group">
                <label className="cc-label">Receiver Address</label>
                <input
                  type="text"
                  className="cc-input"
                  placeholder="X7D2XPLG6MIXNCB7UJOEK6JV5YYNLFHWMXRDGXS5L5MGG6XZH7ILXQBOBY"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  disabled={isExecuting}
                />
              </div>

              <div className="cc-form-group">
                <label className="cc-label">Amount (ALGO)</label>
                <input
                  type="number"
                  className="cc-input"
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isExecuting}
                />
                <span className="cc-hint">
                  {amount ? `${(parseFloat(amount) * 1e6).toLocaleString()} microAlgos` : 'Enter amount in ALGO'}
                </span>
              </div>

              <div className="cc-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleReset}
                  disabled={isExecuting}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isExecuting || !receiver.trim() || !amount || parseFloat(amount) <= 0}
                >
                  {isExecuting ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />
                      Processing...
                    </>
                  ) : (
                    '🚀 Execute Payment'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Output Section - Logs */}
        <div className="cc-panel cc-logs-panel">
          <div className="cc-panel-header">
            <h3 className="cc-panel-title">📜 Processing Logs</h3>
            {logs.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setLogs([])}>
                Clear
              </button>
            )}
          </div>
          
          <div className="cc-logs">
            {logs.length === 0 ? (
              <div className="cc-logs-empty">
                <span>⬆️ Enter payment details and click Execute</span>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="cc-log-entry" style={{ color: getLogColor(log.status) }}>
                  <span className="cc-log-time">[{log.timestamp}]</span>
                  <span className="cc-log-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Result Section */}
        {logs.length > 0 && (
          <div className={`cc-panel cc-result-panel ${getLastLog()?.status === 'success' ? 'success' : 'error'}`}>
            <h3 className="cc-panel-title">
              {getLastLog()?.status === 'success' ? '✅ Payment Successful' : 
               getLastLog()?.status === 'rejected' ? '❌ Payment Rejected' :
               getLastLog()?.status === 'error' ? '❌ Error' : '⏳ Processing...'}
            </h3>
            {getLastLog()?.message && (
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                {getLastLog()?.message}
              </p>
            )}
          </div>
        )}
      </div>

      <ConnectWallet open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  )
}
