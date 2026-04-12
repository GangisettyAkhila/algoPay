import { PeraWalletConnect } from '@perawallet/connect'

export const peraWallet = new PeraWalletConnect()

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const EXPLORER_BASE_URL = import.meta.env.VITE_EXPLORER_BASE_URL || 'https://lora.algokit.io/testnet'

export function getExplorerUrl(txId: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txId}`
}

export function getAccountUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/account/${address}`
}

function getIndexerUrl(): string {
  // Default to Testnet
  return 'https://testnet-idx.algonode.cloud/v2'
}

export async function fetchBalance(address: string): Promise<number> {
  try {
    const indexerUrl = getIndexerUrl()
    const response = await fetch(`${indexerUrl}/accounts/${address}`)
    
    if (!response.ok) {
      console.error(`Indexer returned ${response.status}`)
      return 0
    }
    
    const data = await response.json()
    
    if (data.account) {
      const balance = data.account.amount || data.account.balance || 0
      return balance / 1_000_000
    }
    
    return 0
  } catch (error) {
    console.error('Error fetching balance:', error)
    return 0
  }
}

export function disconnectWallet() {
  peraWallet.disconnect()
  localStorage.removeItem('perawallet_address')
  localStorage.removeItem('perawallet_session')
}