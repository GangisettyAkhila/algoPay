export const APP_IDS = {
  agentRegistry: import.meta.env.VITE_AGENT_REGISTRY_APP_ID || '1006',
  paymentAgent: import.meta.env.VITE_PAYMENT_AGENT_APP_ID || '1008',
  taskManager: import.meta.env.VITE_TASK_MANAGER_APP_ID || '1010',
} as const

export const ALGO_DECIMALS = 6

export function algoToMicroAlgo(algo: number): bigint {
  return BigInt(Math.round(algo * 1e6))
}

export function microAlgoToAlgo(microAlgo: bigint | number): number {
  return Number(microAlgo) / 1e6
}

export function formatAddress(address: string, chars = 6): string {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatAmount(amount: bigint | number, decimals = 6): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount
  const formatted = (num / Math.pow(10, decimals)).toFixed(4)
  return `${Number(formatted).toLocaleString()} ALGO`
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
