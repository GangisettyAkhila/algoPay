import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react'
import ConnectWallet from '../components/ConnectWallet'
import RegisterAgentForm from '../components/Agents/RegisterAgentForm'
import PaymentForm from '../components/Payments/PaymentForm'
import CreateTaskForm from '../components/Tasks/CreateTaskForm'

interface HomeProps {
  setActiveTab: (tab: string) => void
}

export default function Home({ setActiveTab }: HomeProps) {
  const { activeAddress } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const quickActions = [
    {
      id: 'register',
      title: 'Register Agent',
      description: 'Register as an autonomous payment agent',
      icon: '🤖',
      color: 'primary',
      action: () => activeAddress ? setShowRegisterModal(true) : setShowWalletModal(true),
    },
    {
      id: 'pay',
      title: 'Make Payment',
      description: 'Send A2A payment through an agent',
      icon: '💸',
      color: 'teal',
      action: () => activeAddress ? setShowPaymentModal(true) : setShowWalletModal(true),
    },
    {
      id: 'task',
      title: 'Create Task',
      description: 'Assign a task to an agent',
      icon: '📋',
      color: 'secondary',
      action: () => activeAddress ? setShowTaskModal(true) : setShowWalletModal(true),
    },
    {
      id: 'agents',
      title: 'Browse Agents',
      description: 'View registered agents directory',
      icon: '🔍',
      color: 'ghost',
      action: () => setActiveTab('agents'),
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>🚀</span> Autonomous Agent Payments on Algorand
        </div>
        
        <h1 className="hero-title">
          Agent-to-Agent<br />Payments Made Simple
        </h1>
        
        <p className="hero-sub">
          Deploy autonomous payment agents, assign tasks, and automate 
          blockchain transactions with ease.
        </p>

        <div className="hero-actions">
          {!activeAddress && (
            <button className="btn btn-primary btn-lg" onClick={() => setShowWalletModal(true)}>
              🔗 Connect Wallet
            </button>
          )}
          <button className="btn btn-secondary btn-lg" onClick={() => setActiveTab('agents')}>
            Explore Agents
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="hero-stats">
        <div className="stat-item">
          <div className="stat-value">24</div>
          <div className="stat-label">Active Agents</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">156</div>
          <div className="stat-label">Tasks Completed</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">$12.5K</div>
          <div className="stat-label">Volume (30d)</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">Get started with algoPay</p>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '20px' }}>
          {quickActions.map((action) => (
            <button
              key={action.id}
              className={`card agent-card ${action.color === 'primary' ? 'card-hover-primary' : ''}`}
              onClick={action.action}
              style={{ textAlign: 'left', cursor: 'pointer', border: 'none' }}
            >
              <div 
                className="agent-avatar" 
                style={{ 
                  background: action.color === 'primary' 
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : action.color === 'teal'
                    ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-emerald))'
                    : 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                  fontSize: '1.5rem',
                  width: '56px',
                  height: '56px',
                }}
              >
                {action.icon}
              </div>
              <div className="agent-info">
                <div className="agent-name" style={{ fontSize: '1rem' }}>{action.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {action.description}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</div>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple 3-step process</p>
          </div>
        </div>

        <div className="grid-3" style={{ gap: '24px' }}>
          <div className="step-row" style={{ flexDirection: 'column', textAlign: 'center' }}>
            <div className="step-num" style={{ margin: '0 auto 16px' }}>1</div>
            <h4 style={{ marginBottom: '8px' }}>Register Agent</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Register your autonomous agent on the blockchain with spending limits and permissions.
            </p>
          </div>
          <div className="step-row" style={{ flexDirection: 'column', textAlign: 'center' }}>
            <div className="step-num" style={{ margin: '0 auto 16px' }}>2</div>
            <h4 style={{ marginBottom: '8px' }}>Assign Tasks</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Create tasks with payment amounts and deadlines. Agents execute when conditions are met.
            </p>
          </div>
          <div className="step-row" style={{ flexDirection: 'column', textAlign: 'center' }}>
            <div className="step-num" style={{ margin: '0 auto 16px' }}>3</div>
            <h4 style={{ marginBottom: '8px' }}>Auto Payments</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Agents autonomously trigger payments upon task execution. No manual intervention needed.
            </p>
          </div>
        </div>
      </section>

      {/* Modals */}
      <ConnectWallet open={showWalletModal} onClose={() => setShowWalletModal(false)} />
      <RegisterAgentForm openModal={showRegisterModal} closeModal={() => setShowRegisterModal(false)} />
      <PaymentForm openModal={showPaymentModal} closeModal={() => setShowPaymentModal(false)} />
      <CreateTaskForm openModal={showTaskModal} closeModal={() => setShowTaskModal(false)} />
    </div>
  )
}
