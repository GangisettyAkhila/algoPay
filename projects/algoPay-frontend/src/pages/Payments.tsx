import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import PaymentForm from '../components/Payments/PaymentForm'
import { enqueueSnackbar } from 'notistack'

interface Transaction {
  id: string
  type: 'payment' | 'receive'
  amount: string
  receiver: string
  sender: string
  timestamp: string
  status: 'pending' | 'confirmed'
}

const mockTransactions: Transaction[] = [
  { id: 'tx1', type: 'payment', amount: '1.5', receiver: 'X7D2X...BOBY', sender: 'You', timestamp: '2 min ago', status: 'confirmed' },
  { id: 'tx2', type: 'receive', amount: '0.5', receiver: 'You', sender: 'X7D2X...ALPHA', timestamp: '15 min ago', status: 'confirmed' },
  { id: 'tx3', type: 'payment', amount: '2.0', receiver: 'X7D2X...GAMMA', sender: 'You', timestamp: '1 hour ago', status: 'confirmed' },
]

export default function Payments() {
  const { activeAddress } = useWallet()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all')

  const filteredTransactions = mockTransactions.filter(tx => {
    if (activeTab === 'sent') return tx.type === 'payment'
    if (activeTab === 'received') return tx.type === 'receive'
    return true
  })

  const totalSent = mockTransactions
    .filter(t => t.type === 'payment')
    .reduce((acc, t) => acc + parseFloat(t.amount), 0)

  const totalReceived = mockTransactions
    .filter(t => t.type === 'receive')
    .reduce((acc, t) => acc + parseFloat(t.amount), 0)

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.75rem' }}>💸 Payments</h1>
          <p className="section-subtitle">Manage your A2A transactions</p>
        </div>
        <button 
          className="btn btn-success"
          onClick={() => activeAddress ? setShowPaymentModal(true) : enqueueSnackbar('Connect wallet first', { variant: 'warning' })}
        >
          💸 New Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-emerald))' }}>
              ↑
            </div>
            <div>
              <div className="stat-value">{totalSent.toFixed(2)} ALGO</div>
              <div className="stat-label">Total Sent</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
              ↓
            </div>
            <div>
              <div className="stat-value">{totalReceived.toFixed(2)} ALGO</div>
              <div className="stat-label">Total Received</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar">
              #
            </div>
            <div>
              <div className="stat-value">{mockTransactions.length}</div>
              <div className="stat-label">Transactions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px', maxWidth: '400px' }}>
        {(['all', 'sent', 'received'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <h3>No transactions yet</h3>
          <p>Start by making a payment</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                className="agent-avatar" 
                style={{ 
                  background: tx.type === 'payment' 
                    ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-emerald))'
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  fontSize: '1.2rem',
                }}
              >
                {tx.type === 'payment' ? '↑' : '↓'}
              </div>
              
              <div className="agent-info">
                <div className="agent-name">
                  {tx.type === 'payment' ? `To ${tx.receiver}` : `From ${tx.sender}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {tx.timestamp}
                </div>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: '700',
                  color: tx.type === 'payment' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                }}>
                  {tx.type === 'payment' ? '-' : '+'}{tx.amount} ALGO
                </div>
                <span className="agent-badge badge-registered">
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaymentForm openModal={showPaymentModal} closeModal={() => setShowPaymentModal(false)} />
    </div>
  )
}
