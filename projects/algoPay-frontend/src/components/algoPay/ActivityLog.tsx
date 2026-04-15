import { ActivityLog as ActivityLogType } from '../../utils/algopayApi'

interface ActivityLogProps {
  logs: ActivityLogType[] | undefined | null
  isLoading: boolean
}

const logConfig: Record<string, { icon: string; color: string; bg: string }> = {
  info: { icon: 'ℹ️', color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-secondary)]' },
  success: { icon: '✅', color: 'text-[var(--accent-color)]', bg: 'bg-[var(--accent-color)] bg-opacity-10' },
  error: { icon: '❌', color: 'text-red-500 cursor-help', bg: 'bg-red-500 bg-opacity-10' },
}

export default function ActivityLog({ logs, isLoading }: ActivityLogProps) {
  // Defensive: handle undefined/null
  const safeLogs = Array.isArray(logs) ? logs : []

  return (
    <div className="card slide-up h-full flex flex-col max-h-[800px]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
        <h3 className="section-title text-[var(--text-primary)]">Audit Logs</h3>
        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Real-time</span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-[var(--bg-secondary)] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : safeLogs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-50">
          <span className="text-2xl mb-2">🐚</span>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">No activity yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {safeLogs.map((log) => {
            const config = logConfig[log.type] || logConfig.info
            return (
              <div
                key={log.id}
                className={`p-3 rounded-lg border border-transparent transition-all hover:border-[var(--border-color)] ${config.bg}`}
              >
                <div className="flex gap-3">
                  <span className="text-xs flex-shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter mb-1">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                    <p className={`text-xs font-medium leading-relaxed ${config.color}`}>
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}