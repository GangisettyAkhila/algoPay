const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://algopay-backend.onrender.com'

// Status type for type safety
export type TaskStatus = 'pending' | 'executing' | 'paid' | 'failed' | 'rule_blocked'

// Default values for defensive handling
const defaultTask: Task = {
  id: '',
  title: '',
  amount: 0,
  recipient: '',
  deadline: new Date().toISOString(),
  status: 'pending',
  funded: false,
  funding_txid: null,
  funded_at: null,
  locked_amount: 0,
  txid: undefined,
  error: undefined,
  paid_at: undefined,
  created_at: new Date().toISOString(),
  executed_at: undefined,
}

export interface Task {
  id: string
  title: string
  amount: number
  recipient: string
  deadline: string
  status: TaskStatus
  funded: boolean
  funding_txid?: string | null
  funded_at?: string | null
  locked_amount: number
  txid?: string
  error?: string
  paid_at?: string
  created_at: string
  executed_at?: string
}

export interface CreateTaskRequest {
  title: string
  amount: number
  recipient: string
  deadline: string
}

export interface ActivityLog {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error'
}

// Error mapping
const ERROR_MAP: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Not enough balance in agent wallet',
  INVALID_ADDRESS: 'Invalid recipient address',
  ALGOD_ERROR: 'Network issue — please try again',
}

export function mapBackendError(code?: string): string {
  if (!code) return 'Something went wrong'
  return ERROR_MAP[code] ?? 'Something went wrong'
}

// Helper to normalize task data
function normalizeTask(task: Partial<Task> | undefined | null): Task {
  if (!task) return defaultTask
  
  return {
    id: task.id ?? '',
    title: task.title ?? 'Untitled',
    amount: typeof task.amount === 'number' ? task.amount : 0,
    recipient: task.recipient ?? '',
    deadline: task.deadline ?? new Date().toISOString(),
    status: (task.status && ['pending', 'executing', 'paid', 'failed', 'rule_blocked'].includes(task.status)) 
      ? task.status 
      : 'pending',
    funded: task.funded ?? false,
    funding_txid: task.funding_txid ?? null,
    funded_at: task.funded_at ?? null,
    locked_amount: typeof task.locked_amount === 'number' ? task.locked_amount : 0,
    txid: task.txid,
    error: task.error,
    paid_at: task.paid_at,
    created_at: task.created_at ?? new Date().toISOString(),
    executed_at: task.executed_at,
  }
}

// Helper to validate array
function normalizeTasks(data: unknown): Task[] {
  if (!Array.isArray(data)) {
    console.warn('Expected array but got:', typeof data)
    return []
  }
  
  return data
    .map((item) => normalizeTask(item as Partial<Task>))
    .filter((task) => task.id !== '') // Filter out empty tasks
}

// API calls with defensive handling

export async function fetchTasks(): Promise<Task[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    const tasks = normalizeTasks(data)
    console.log('Fetched tasks:', tasks.length)
    return tasks
  } catch (error) {
    console.error('fetchTasks error:', error)
    throw new Error('Failed to fetch tasks')
  }
}

export async function createTask(task: CreateTaskRequest): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })

  const data = await response.json()

  if (!response.ok || data.success === false) {
    const friendlyMsg = mapBackendError(data.error) ?? data.message ?? 'Failed to create task'
    throw new Error(friendlyMsg)
  }

  return normalizeTask(data)
}

export async function retryTask(taskId: string): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/retry`, {
    method: 'POST',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail ?? 'Failed to retry task')
  }

  return normalizeTask(data)
}

export async function fetchWalletBalance(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallet/balance`)
    if (!response.ok) throw new Error('Failed to fetch balance')
    const data = await response.json()
    const balance = typeof data.balance === 'number' ? data.balance : 0
    return balance / 1_000_000
  } catch (error) {
    console.error('fetchWalletBalance error:', error)
    return 0
  }
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/logs`)
    if (!response.ok) throw new Error('Failed to fetch logs')
    const data = await response.json()
    
    if (!Array.isArray(data.logs)) {
      return []
    }
    
    return data.logs.map((log: { timestamp?: string; level?: string; message?: string }, index: number) => ({
      id: String(index),
      timestamp: log.timestamp ?? new Date().toISOString(),
      message: log.message ?? '',
      type: (log.level === 'ERROR' ? 'error' : log.level === 'INFO' ? 'success' : 'info') as ActivityLog['type'],
    }))
  } catch (error) {
    console.error('fetchActivityLogs error:', error)
    return []
  }
}

export async function getAgentAddress(): Promise<{ address: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/agent-address`)
  if (!response.ok) throw new Error('Failed to get agent address')
  return response.json()
}

export async function fundTask(taskId: string, fundingTxid: string): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, funding_txid: fundingTxid }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail ?? 'Failed to fund task')
  }

  return normalizeTask(data)
}