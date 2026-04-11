import { API_BASE_URL } from './wallet'

export interface PaymentRequest {
  sender: string
  receiver: string
  amount: number
}

export interface LogEntry {
  step: string
  timestamp: string
  status: string
  message: string
  violations?: Array<{ rule_name: string; reason: string }>
}

export interface PaymentResponse {
  status: 'success' | 'rejected'
  txid: string | null
  reason: string | null
  message: string
  logs: LogEntry[]
  timestamp: string
  rules_checked: string[]
}

export async function executePayment(
  sender: string,
  receiver: string,
  amount: number
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      receiver,
      amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function getAgentStatus(): Promise<{
  status: string
  rules: {
    max_per_transaction: number
    max_daily: number
    min_transaction: number
    allowed_recipients_count: number
  }
}> {
  const response = await fetch(`${API_BASE_URL}/api/status`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

export async function healthCheck(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error(`Backend offline (HTTP ${response.status})`)
  }
  return response.json()
}
