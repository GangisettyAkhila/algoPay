import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import TaskForm from '../components/algoPay/TaskForm'
import TaskList from '../components/algoPay/TaskList'
import ActivityLog from '../components/algoPay/ActivityLog'
import {
  fetchTasks,
  createTask,
  fetchActivityLogs,
  Task,
  TaskStatus,
  CreateTaskRequest,
  ActivityLog as ActivityLogType
} from '../utils/algopayApi'

export default function Dashboard() {
  const { address, balance, isConnected } = useWallet()

  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ActivityLogType[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (isInitial = false) => {
    try {
      console.log('Loading data...')
      const [tasksData, logsData] = await Promise.all([
        fetchTasks(),
        fetchActivityLogs(),
      ])
      
      // Defensive: ensure arrays
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setLogs(Array.isArray(logsData) ? logsData : [])
      setError(null)
      console.log('Data loaded:', tasksData?.length ?? 0, 'tasks')
    } catch (err) {
      console.error('Failed to load data:', err)
      if (isInitial) {
        setError('Cannot reach backend')
      }
    } finally {
      setIsLoadingTasks(false)
      setIsLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    if (!isConnected) return
    loadData(true)
    const interval = setInterval(() => loadData(false), 5000)
    return () => clearInterval(interval)
  }, [isConnected, loadData])

  const handleCreateTask = async (task: CreateTaskRequest) => {
    setIsSubmitting(true)
    try {
      await createTask(task)
      await loadData(false)
    } catch (err) {
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // Safe task counts with fallbacks
  const pendingCount = tasks.filter(t => (t.status ?? 'pending') === 'pending').length
  const paidCount = tasks.filter(t => (t.status ?? 'pending') === 'paid').length
  const failedCount = tasks.filter(t => (t.status ?? 'pending') === 'failed').length

  if (error && !isLoadingTasks) {
    return (
      <div className="app-layout pt-12">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 max-w-lg mx-auto text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <h3 className="font-bold text-[var(--accent-color)]">Backend Unreachable</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{error}</p>
          <button className="btn btn-secondary mt-4" onClick={() => loadData(true)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="app-layout fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Payment Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Autonomous payments on Algorand · Time in IST
          </p>
        </div>
        
        {/* User wallet only */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 min-w-[280px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Your Wallet</span>
          </div>
          <div className="text-xs font-mono text-[var(--text-secondary)] mb-2 truncate">
            {address ?? 'Not connected'}
          </div>
          <div className="text-lg font-bold text-[var(--accent-color)]">
            {typeof balance === 'number' ? balance.toFixed(3) : '0.000'} ALGO
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Tasks', value: tasks.length },
          { label: 'Pending', value: pendingCount },
          { label: 'Executed', value: paidCount },
        ].map(({ label, value }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-lg">
              {label === 'Total Tasks' ? '📋' : label === 'Pending' ? '⏳' : '✅'}
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">{label}</div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-8">
          <TaskForm
            onSubmit={handleCreateTask}
            isSubmitting={isSubmitting}
            disabled={!isConnected}
          />
          <TaskList
            tasks={tasks}
            isLoading={isLoadingTasks}
          />
        </div>
        
        <ActivityLog
          logs={logs}
          isLoading={isLoadingLogs}
        />
      </div>
    </main>
  )
}