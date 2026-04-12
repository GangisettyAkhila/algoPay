import { ActivityLog as ActivityLogType } from '../../utils/algopayApi'

interface ActivityLogProps {
  logs: ActivityLogType[]
  isLoading: boolean
}

const logConfig = {
  info: { icon: 'ℹ️', color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-900' },
  success: { icon: '✅', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
  error: { icon: '❌', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10' },
}

export default function ActivityLog({ logs, isLoading }: ActivityLogProps) {
  return (
    <div className="card slide-up h-full flex flex-col max-h-[800px]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="section-title text-zinc-900 dark:text-zinc-100">Audit Logs</h3>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Real-time</span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-zinc-50 dark:bg-zinc-900 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-50">
          <span className="text-2xl mb-2">🐚</span>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">No activity yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {logs.map((log) => {
            const config = logConfig[log.type] || logConfig.info
            return (
              <div
                key={log.id}
                className={`p-3 rounded-lg border border-transparent transition-all hover:border-zinc-100 dark:hover:border-zinc-800 ${config.bg}`}
              >
                <div className="flex gap-3">
                  <span className="text-xs flex-shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">
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