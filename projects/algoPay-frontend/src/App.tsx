import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './context/WalletContext'
import Header from './components/algoPay/Header'
import TaskForm from './components/algoPay/TaskForm'
import TaskList from './components/algoPay/TaskList'
import ActivityLog from './components/algoPay/ActivityLog'
import {
  fetchTasks,
  createTask,
  fetchWalletBalance,
  fetchActivityLogs,
  Task,
  CreateTaskRequest,
  ActivityLog as ActivityLogType
} from './utils/algopayApi'

export default function App() {
  const { address, balance, isConnected, connect, isConnecting } = useWallet()

  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ActivityLogType[]>([])
  const [backendBalance, setBackendBalance] = useState(0)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [tasksData, logsData, balanceData] = await Promise.all([
        fetchTasks(),
        fetchActivityLogs(),
        fetchWalletBalance(),
      ])
      setTasks(tasksData)
      setLogs(logsData)
      setBackendBalance(balanceData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to connect to backend. Make sure the Python server is running on port 8000.')
    } finally {
      setIsLoadingTasks(false)
      setIsLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    if (!isConnected) return
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [isConnected, loadData])

  const handleCreateTask = async (task: CreateTaskRequest) => {
    setIsSubmitting(true)
    try {
      await createTask(task)
      await loadData()
    } catch (err) {
      console.error('Failed to create task:', err)
      alert('Failed to create task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const paidCount = tasks.filter(t => t.status === 'paid').length

  // ---- Landing page (not connected) ----
  if (!isConnected) {
    return (
      <>
        <div className="app-bg" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Header />
          <div className="app-layout">
            <section className="hero-section">
              {/* Badge */}
              <div className="hero-badge">
                <span>⚡</span>
                <span>Algorand Testnet · Agent-to-Agent Payments</span>
              </div>

              {/* Title */}
              <h1 className="hero-title">
                Automate Payments<br />on Algorand
              </h1>

              {/* Subtitle */}
              <p className="hero-sub">
                Create payment tasks that execute automatically on-chain.
                Schedule deadlines, set recipients, and let the blockchain do the rest.
              </p>

              {/* CTA */}
              <div className="hero-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <span className="spinner" />
                      Connecting…
                    </>
                  ) : (
                    <>🔗 Connect Pera Wallet</>
                  )}
                </button>
                <a
                  href="https://testnet.algoexplorer.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-lg"
                >
                  View Explorer ↗
                </a>
              </div>

              {/* Stats row */}
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-value">~4s</div>
                  <div className="stat-label">Block Time</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">0.001</div>
                  <div className="stat-label">Min Fee (ALGO)</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">Auto</div>
                  <div className="stat-label">Execution</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">5s</div>
                  <div className="stat-label">Poll Interval</div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section style={{ paddingBottom: '80px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 className="section-title" style={{ fontSize: '1.4rem' }}>How it works</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>
                  Three steps to autonomous on-chain payments
                </p>
              </div>
              <div className="grid-3">
                {[
                  { step: '01', title: 'Connect Wallet', desc: 'Authenticate with Pera Wallet to access the agent payment dashboard.' },
                  { step: '02', title: 'Schedule Task', desc: 'Set title, amount, recipient address, and execution deadline.' },
                  { step: '03', title: 'Auto-Execute', desc: 'The backend agent executes the payment when the deadline arrives.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="card" style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '48px', height: '48px',
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      borderRadius: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 800, fontSize: '0.9rem', color: 'white',
                    }}>
                      {step}
                    </div>
                    <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '1rem' }}>{title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </>
    )
  }

  // ---- Error state ----
  if (error && !isLoadingTasks) {
    return (
      <>
        <div className="app-bg" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Header />
          <div className="app-layout" style={{ paddingTop: '48px' }}>
            <div className="info-box info-box-warn" style={{ maxWidth: '560px', margin: '0 auto', flexDirection: 'column', gap: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--accent-amber)' }}>Backend Unreachable</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadData}>
                ↺ Retry Connection
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ---- Main dashboard ----
  return (
    <>
      <div className="app-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header />

        <div className="app-layout">
          {/* Dashboard command center header */}
          <div className="command-center">
            <div className="cc-header">
              <div>
                <h1 className="cc-title">Payment Dashboard</h1>
                <p className="cc-subtitle">
                  Autonomous Algorand payments · polling every 5s
                </p>
              </div>
              <div className="cc-wallet-info">
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Wallet
                </div>
                <div className="cc-address">
                  {address ? `${address.slice(0, 12)}…${address.slice(-6)}` : ''}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Wallet: <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>{balance.toFixed(3)} ALGO</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Agent: <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{backendBalance.toFixed(3)} ALGO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid-3" style={{ marginBottom: '32px', gap: '12px' }}>
              {[
                { label: 'Total Tasks', value: tasks.length, icon: '📋', color: 'var(--accent-primary)' },
                { label: 'Pending', value: pendingCount, icon: '⏳', color: 'var(--accent-amber)' },
                { label: 'Executed', value: paidCount, icon: '✅', color: 'var(--accent-emerald)' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="card card-elevated" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color, lineHeight: 1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main 2-col layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'flex-start' }}>
              {/* Left: form + task list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <TaskForm
                  onSubmit={handleCreateTask}
                  isSubmitting={isSubmitting}
                  disabled={!isConnected}
                />
                <TaskList
                  tasks={tasks}
                  isLoading={isLoadingTasks}
                />
              </div>

              {/* Right: activity log */}
              <ActivityLog
                logs={logs}
                isLoading={isLoadingLogs}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}