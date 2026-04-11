const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface Task {
  id: string
  title: string
  amount: number
  recipient: string
  deadline: string
  status: 'pending' | 'paid' | 'rejected'
  txid?: string
  error?: string
  paid_at?: string
  created_at: string
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

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`)
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

export async function createTask(task: CreateTaskRequest): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!response.ok) throw new Error('Failed to create task')
  return response.json()
}

export async function fetchWalletBalance(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/wallet/balance`)
  if (!response.ok) throw new Error('Failed to fetch balance')
  const data = await response.json()
  return data.balance / 1_000_000 // Convert microAlgos to ALGO
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const response = await fetch(`${API_BASE_URL}/api/logs`)
  if (!response.ok) throw new Error('Failed to fetch logs')
  const data = await response.json()
  return data.logs.map((log: { timestamp: string; level: string; message: string }, index: number) => ({
    id: String(index),
    timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }),
    message: log.message,
    type: log.level === 'ERROR' ? 'error' : log.level === 'INFO' ? 'success' : 'info',
  }))
}