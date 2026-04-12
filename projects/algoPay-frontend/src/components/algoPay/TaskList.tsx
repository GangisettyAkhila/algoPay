import TaskCard from './TaskCard'
import { Task } from '../../utils/algopayApi'

interface TaskListProps {
  tasks: Task[]
  isLoading: boolean
}

export default function TaskList({ tasks, isLoading }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="card text-center py-16 bg-zinc-50 dark:bg-zinc-900/50 border-dashed border-2">
        <div className="text-3xl mb-4">📭</div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">No Active Tasks</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          Your scheduled payments will appear here once created.
        </p>
      </div>
    )
  }

  // Sort: pending first, then by deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === b.status) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    return a.status === 'pending' ? -1 : 1
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Scheduled Tasks ({tasks.length})
        </h3>
        <div className="text-[10px] text-zinc-400 font-medium">
          Polling every 5s
        </div>
      </div>
      
      {sortedTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}