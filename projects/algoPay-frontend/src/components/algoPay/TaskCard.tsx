import { Task } from '../../utils/algopayApi'

interface TaskCardProps {
  task: Task
}

const statusConfig: Record<string, { label: string; color: string; icon: string; className: string }> = {
  pending: { label: 'Pending', color: 'emerald', icon: '⏳', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  executing: { label: 'Processing...', color: 'amber', icon: '⚡', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  paid: { label: 'Paid', color: 'emerald', icon: '✅', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  failed: { label: 'Failed', color: 'red', icon: '❌', className: 'bg-red-50 text-red-700 border-red-100' },
  rule_blocked: { label: 'Blocked by Agent', color: 'orange', icon: '🚫', className: 'bg-orange-50 text-orange-700 border-orange-100' },
}

const defaultStatus = { label: 'Unknown', color: 'zinc', icon: '❓', className: 'bg-zinc-50 text-zinc-400 border-zinc-100' }

function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return 'N/A'
  try {
    return new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  } catch { return 'Invalid' }
}

function formatDeadline(deadline: string | undefined): string {
  if (!deadline) return 'N/A'
  try {
    const date = new Date(deadline)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    if (diff < 0) return 'Due'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) return formatDate(deadline)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  } catch { return 'Invalid' }
}

function formatAddress(address: string | undefined, chars: number = 6): string {
  if (!address || address.length < chars * 2) return 'N/A'
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

const EXPLORER_URL = 'https://testnet.algoexplorer.io'

export default function TaskCard({ task }: TaskCardProps) {
  if (!task) {
    return (
      <div className="card">
        <p className="text-zinc-400 text-sm">Loading task...</p>
      </div>
    )
  }

  const safeTask = {
    id: task.id ?? 'unknown',
    title: task.title ?? 'Untitled',
    amount: task.amount ?? 0,
    recipient: task.recipient ?? '',
    deadline: task.deadline ?? new Date().toISOString(),
    status: task.status ?? 'pending',
    txid: task.txid ?? null,
    error: task.error ?? null,
    created_at: task.created_at ?? new Date().toISOString(),
    paid_at: task.paid_at ?? null,
  }

  const config = statusConfig[safeTask.status] || defaultStatus
  const explorerUrl = safeTask.txid ? `${EXPLORER_URL}/tx/${safeTask.txid}` : null

  // Show executing animation for executing status
  const isExecuting = safeTask.status === 'executing'

  return (
    <div className={`card fade-in ${isExecuting ? 'ring-2 ring-amber-300' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`tag ${config.className}`}>
              {isExecuting ? (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-1" />
              ) : (
                config.icon
              )}
              {config.label}
            </span>
            <span className="text-[10px] font-medium text-zinc-400">
              {safeTask.id}
            </span>
          </div>
          
          <h4 className="text-base font-semibold text-zinc-900">
            {safeTask.title}
          </h4>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
            <span>
              <span className="font-medium">To:</span> {formatAddress(safeTask.recipient)}
            </span>
            <span>
              <span className="font-medium">Created:</span> {formatDate(safeTask.created_at)}
            </span>
            {safeTask.paid_at && (
              <span>
                <span className="font-medium">Paid:</span> {formatDate(safeTask.paid_at)}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-zinc-100 pt-3 md:pt-0 md:pl-4 min-w-[120px]">
          <div className="text-lg font-bold text-zinc-900">
            {safeTask.amount.toFixed(3)} <span className="text-xs text-zinc-400">ALGO</span>
          </div>
          
          {/* Status-specific UI */}
          {safeTask.status === 'pending' && (
            <div className="text-right">
              <span className="text-[10px] font-medium text-zinc-400 block">Due in</span>
              <span className="text-sm font-semibold text-emerald-600">
                {formatDeadline(safeTask.deadline)}
              </span>
            </div>
          )}
          
          {safeTask.status === 'executing' && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Processing on blockchain...
              </span>
            </div>
          )}
          
          {safeTask.status === 'paid' && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
            >
              Verify on Blockchain ↗
            </a>
          )}
          
          {safeTask.status === 'failed' && (
            <div className="text-right max-w-[200px]">
              <span className="text-xs font-medium text-red-500 block" title={safeTask.error ?? undefined}>
                {safeTask.error?.slice(0, 50) ?? 'Transaction failed'}
              </span>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] text-amber-600 hover:underline mt-1 block"
              >
                Retry (reload to retry)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}