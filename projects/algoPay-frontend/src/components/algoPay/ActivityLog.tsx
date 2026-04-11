import type { ActivityLog as ActivityLogType } from '../../utils/algopayApi'

interface ActivityLogProps {
  logs: ActivityLogType[]
  isLoading: boolean
}

const TYPE_CONFIG = {
  success: {
    color: 'var(--accent-emerald)',
    bg: 'rgba(16,185,129,0.08)',
    icon: '✅',
  },
  error: {
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.08)',
    icon: '❌',
  },
  info: {
    color: 'var(--text-secondary)',
    bg: 'rgba(148,163,184,0.06)',
    icon: '🔵',
  },
}

export default function ActivityLog({ logs, isLoading }: ActivityLogProps) {
  const reversedLogs = [...logs].reverse().slice(0, 60)

  return (
    <div className="card" style={{ position: 'sticky', top: '84px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '2px' }}>Activity</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time blockchain events</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-emerald)',
            boxShadow: '0 0 8px var(--accent-emerald)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Live
          </span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              height: '52px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              opacity: 0.4,
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : reversedLogs.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="empty-icon" style={{ fontSize: '2rem' }}>⚡</div>
          <h3 style={{ fontSize: '0.95rem' }}>No activity yet</h3>
          <p style={{ fontSize: '0.8rem' }}>Events appear as tasks execute</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
          {reversedLogs.map((log) => {
            const config = TYPE_CONFIG[log.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info
            return (
              <div key={log.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: config.bg,
                border: '1px solid transparent',
                transition: 'border-color var(--transition)',
              }}>
                <span style={{ fontSize: '0.75rem', flexShrink: 0, marginTop: '1px' }}>{config.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '2px' }}>
                    {log.timestamp}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: config.color, wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {log.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}