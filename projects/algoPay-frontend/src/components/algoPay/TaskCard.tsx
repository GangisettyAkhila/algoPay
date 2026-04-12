import { Task } from '../../utils/algopayApi'

interface TaskCardProps {
  task: Task
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'emerald',
    icon: '⏳',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
  },
  paid: {
    label: 'Executed',
    color: 'zinc',
    icon: '✅',
    className: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800'
  },
  rejected: {
    label: 'Failed',
    color: 'red',
    icon: '❌',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/50'
  },
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff < 0) return 'Executing...'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) return formatDate(deadline)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function TaskCard({ task }: TaskCardProps) {
  const explorerUrl = task.txid ? `https://lora.algokit.io/testnet/tx/${task.txid}` : null
  const createdLocal = formatDate(task.created_at)
  const isExecuting = task.status === 'pending' && new Date(task.deadline).getTime() <= Date.now()
  const currentStatus = isExecuting ? { ...statusConfig.pending, label: 'Executing...' } : statusConfig[task.status]

  return (
    <div className={`card fade-in ${task.status === 'pending' ? 'border-l-2 border-l-emerald-500' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <span className={`tag ${currentStatus.className}`}>
              {currentStatus.icon} {currentStatus.label}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              ID: {task.id.slice(0, 8)}
            </span>
          </div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {task.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Recipient:</span>
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {task.recipient.slice(0, 6)}…{task.recipient.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Created:</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{createdLocal}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-8 min-w-[140px]">
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {task.amount.toFixed(3)} <span className="text-xs text-zinc-400 font-medium">ALGO</span>
          </div>
          
          {task.status === 'pending' ? (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Due in</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatDeadline(task.deadline)}
              </span>
            </div>
          ) : explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View Transaction ↗
            </a>
          ) : (
            <span className="text-[10px] font-bold text-zinc-400 italic">Processing...</span>
          )}
        </div>
      </div>
    </div>
  )
}