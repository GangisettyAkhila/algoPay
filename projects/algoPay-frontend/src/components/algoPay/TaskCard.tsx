import { Task } from '../../utils/algopayApi'

interface TaskCardProps {
  task: Task
}

const STATUS_CONFIG = {
  pending: {
    color: 'var(--accent-amber)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    dot: 'var(--accent-amber)',
    label: 'Pending',
    pulse: true,
  },
  paid: {
    color: 'var(--accent-emerald)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    dot: 'var(--accent-emerald)',
    label: 'Paid',
    pulse: false,
  },
  rejected: {
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)',
    dot: 'var(--accent-rose)',
    label: 'Rejected',
    pulse: false,
  },
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  if (diff < 0) return 'Overdue'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 24) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function TaskCard({ task }: TaskCardProps) {
  const s = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const explorerUrl = task.txid ? `https://testnet.algoexplorer.io/tx/${task.txid}` : null

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${s.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      transition: 'all var(--transition)',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLDivElement
      el.style.transform = 'translateY(-1px)'
      el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)'
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLDivElement
      el.style.transform = ''
      el.style.boxShadow = ''
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        {/* Left: status + title + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: s.dot, flexShrink: 0,
              boxShadow: s.pulse ? `0 0 8px ${s.dot}` : 'none',
              animation: s.pulse ? 'pulse-dot 1.8s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>
              {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </h3>

          {/* Recipient */}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            To: {task.recipient.slice(0, 10)}…{task.recipient.slice(-6)}
          </p>
        </div>

        {/* Right: amount */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
            {task.amount.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 700, marginTop: '2px' }}>ALGO</div>
        </div>
      </div>

      {/* Bottom divider + detail */}
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
        {task.status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⏱ Executes in</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
              {formatDeadline(task.deadline)}
            </span>
          </div>
        )}

        {task.status === 'paid' && explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>✅ Transaction</span>
            <span style={{
              fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--accent-teal)',
              padding: '2px 8px', background: 'rgba(20,184,166,0.1)', borderRadius: '6px',
              transition: 'background var(--transition)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(20,184,166,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(20,184,166,0.1)')}
            >
              {task.txid?.slice(0, 10)}…{task.txid?.slice(-8)} ↗
            </span>
          </a>
        )}

        {task.status === 'rejected' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>❌ Reason</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.error || 'Rule violation'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}