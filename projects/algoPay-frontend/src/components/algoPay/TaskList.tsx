import TaskCard from './TaskCard'
import { Task } from '../../utils/algopayApi'

interface TaskListProps {
  tasks: Task[] | undefined | null
  isLoading: boolean
}

export default function TaskList({ tasks, isLoading }: TaskListProps) {
  // Defensive: handle undefined/null tasks
  const safeTasks = Array.isArray(tasks) ? tasks : []
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-zinc-50" />
        ))}
      </div>
    )
  }

  if (safeTasks.length === 0) {
    return (
      <div className="card text-center py-16 bg-zinc-50 border-dashed border-2">
        <div className="text-3xl mb-4">📭</div>
        <h3 className="text-sm font-bold text-zinc-900 uppercase">No Active Tasks</h3>
        <p className="text-xs text-zinc-500 mt-2">
          Your scheduled payments will appear here.
        </p>
      </div>
    )
  }

  // Sort: pending first, then by deadline
  const sortedTasks = [...safeTasks].sort((a, b) => {
    const statusOrder = { pending: 0, executing: 1, paid: 2, failed: 3 }
    const aOrder = statusOrder[a.status] ?? 0
    const bOrder = statusOrder[b.status] ?? 0
    
    if (aOrder !== bOrder) return aOrder - bOrder
    
    const aTime = new Date(a.deadline ?? 0).getTime()
    const bTime = new Date(b.deadline ?? 0).getTime()
    return aTime - bTime
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-zinc-400 uppercase">
          Scheduled Tasks ({safeTasks.length})
        </h3>
        <div className="text-[10px] text-zinc-400">Polling every 5s</div>
      </div>
      
      {sortedTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}