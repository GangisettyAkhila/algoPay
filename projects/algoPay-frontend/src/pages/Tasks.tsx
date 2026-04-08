import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import CreateTaskForm from '../components/Tasks/CreateTaskForm'
import { enqueueSnackbar } from 'notistack'

interface Task {
  id: string
  description: string
  agent: string
  payment: string
  deadline: string
  status: 'pending' | 'executed' | 'cancelled'
  recurring: boolean
}

const mockTasks: Task[] = [
  { id: 'task-001', description: 'Daily market report generation', agent: 'X7D2X...BOBY', payment: '1.0', deadline: '2 hours', status: 'pending', recurring: true },
  { id: 'task-002', description: 'Portfolio rebalancing', agent: 'X7D2X...ALPHA', payment: '2.5', deadline: '1 day', status: 'pending', recurring: false },
  { id: 'task-003', description: 'Price alert monitoring', agent: 'X7D2X...GAMMA', payment: '0.5', deadline: '3 days', status: 'executed', recurring: false },
]

export default function Tasks() {
  const { activeAddress } = useWallet()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'executed' | 'cancelled'>('all')

  const filteredTasks = mockTasks.filter(task => {
    if (activeTab === 'pending') return task.status === 'pending'
    if (activeTab === 'executed') return task.status === 'executed'
    if (activeTab === 'cancelled') return task.status === 'cancelled'
    return true
  })

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'badge-registered'
      case 'executed': return 'tag-teal'
      case 'cancelled': return 'badge-unregistered'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.75rem' }}>📋 Task Management</h1>
          <p className="section-subtitle">Create and manage autonomous agent tasks</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => activeAddress ? setShowCreateModal(true) : enqueueSnackbar('Connect wallet first', { variant: 'warning' })}
        >
          + Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-rose))' }}>
              ⏳
            </div>
            <div>
              <div className="stat-value">{mockTasks.filter(t => t.status === 'pending').length}</div>
              <div className="stat-label">Pending Tasks</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-emerald))' }}>
              ✓
            </div>
            <div>
              <div className="stat-value">{mockTasks.filter(t => t.status === 'executed').length}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="agent-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
              🔄
            </div>
            <div>
              <div className="stat-value">{mockTasks.filter(t => t.recurring).length}</div>
              <div className="stat-label">Recurring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px', maxWidth: '500px' }}>
        {(['all', 'pending', 'executed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== 'all' && (
              <span style={{ 
                marginLeft: '6px', 
                fontSize: '0.75rem',
                opacity: 0.7 
              }}>
                ({mockTasks.filter(t => t.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No tasks found</h3>
          <p>Create your first task to get started</p>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredTasks.map((task) => (
            <div key={task.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ marginBottom: '4px' }}>{task.id}</h4>
                  {task.recurring && (
                    <span className="tag tag-teal" style={{ fontSize: '0.7rem' }}>
                      🔄 Recurring
                    </span>
                  )}
                </div>
                <span className={`agent-badge ${getStatusColor(task.status)}`}>
                  {task.status === 'pending' ? '⏳ ' : task.status === 'executed' ? '✓ ' : '✗ '}
                  {task.status}
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {task.description}
              </p>

              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Agent:</span> {task.agent}
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Deadline:</span> {task.deadline}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                  {task.payment} ALGO
                </div>

                {task.status === 'pending' && activeAddress && (
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => enqueueSnackbar('Task executed!', { variant: 'success' })}
                  >
                    Execute
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTaskForm openModal={showCreateModal} closeModal={() => setShowCreateModal(false)} />
    </div>
  )
}
