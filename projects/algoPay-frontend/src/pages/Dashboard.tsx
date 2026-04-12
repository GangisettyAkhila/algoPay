import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import TaskForm from '../components/algoPay/TaskForm'
import TaskList from '../components/algoPay/TaskList'
import ActivityLog from '../components/algoPay/ActivityLog'
import {
  fetchTasks,
  createTask,
  fetchWalletBalance,
  fetchActivityLogs,
  Task,
  CreateTaskRequest,
  ActivityLog as ActivityLogType
} from '../utils/algopayApi'

export default function Dashboard() {
  const { address, balance, isConnected } = useWallet()

  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ActivityLogType[]>([])
  const [backendBalance, setBackendBalance] = useState(0)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (isInitial = false) => {
    try {
      const [tasksData, logsData, balanceData] = await Promise.all([
        fetchTasks(),
        fetchActivityLogs(),
        fetchWalletBalance(),
      ])
      setTasks(tasksData)
      setLogs(logsData)
      setBackendBalance(balanceData)
      setError(null)
    } catch (err) {
      console.error('Failed to load data:', err)
      if (isInitial) {
        setError('Cannot reach backend. Make sure the Python server is running on port 8000.')
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

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const paidCount = tasks.filter(t => t.status === 'paid').length

  if (error && !isLoadingTasks) {
    return (
      <div className="app-layout pt-12">
        <div className="bg-red-50 border border-red-100 dark:bg-red-900/10 dark:border-red-900/30 rounded-xl p-8 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
          <div className="text-3xl">⚠️</div>
          <h3 className="font-bold text-red-800 dark:text-red-400">Backend Unreachable</h3>
          <p className="text-sm text-red-700/70 dark:text-red-400/60 leading-relaxed">{error}</p>
          <button className="btn btn-secondary mt-2" onClick={() => loadData(true)}>
            ↺ Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="app-layout fade-in">
      {/* Dashboard header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Payment Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Autonomous Algorand payments · Live status polling
          </p>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 min-w-[300px]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Agent</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Running</span>
            </div>
          </div>
          <div className="text-sm font-mono text-zinc-900 dark:text-zinc-200 mb-3 truncate">
            {address}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Wallet</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{balance.toFixed(3)} ALGO</span>
            </div>
            <div className="flex flex-col border-l border-zinc-200 dark:border-zinc-700 pl-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Agent Fund</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{backendBalance.toFixed(3)} ALGO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Tasks', value: tasks.length, icon: '📋' },
          { label: 'Pending', value: pendingCount, icon: '⏳' },
          { label: 'Executed', value: paidCount, icon: '✅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
              {icon}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
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
