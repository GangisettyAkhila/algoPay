import { Task } from '../../utils/algopayApi'
import TaskCard from './TaskCard'

interface TaskListProps {
  tasks: Task[]
  isLoading: boolean
}

export default function TaskList({ tasks, isLoading }: TaskListProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const paidCount = tasks.filter(t => t.status === 'paid').length
  const rejectedCount = tasks.filter(t => t.status === 'rejected').length

  if (isLoading) {
    return (
      <div className="card">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Payment Tasks</h2>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: '108px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
              opacity: 0.5,
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Payment Tasks</h2>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Create a task above to schedule an autonomous payment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '2px' }}>Payment Tasks</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Auto-polled every 5s · Sorted by priority</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {pendingCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: '50px',
              background: 'rgba(245,158,11,0.12)', color: 'var(--accent-amber)',
              fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(245,158,11,0.25)',
            }}>
              {pendingCount} pending
            </span>
          )}
          {paidCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: '50px',
              background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)',
              fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(16,185,129,0.25)',
            }}>
              {paidCount} paid
            </span>
          )}
          {rejectedCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: '50px',
              background: 'rgba(244,63,94,0.12)', color: 'var(--accent-rose)',
              fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(244,63,94,0.25)',
            }}>
              {rejectedCount} rejected
            </span>
          )}
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}