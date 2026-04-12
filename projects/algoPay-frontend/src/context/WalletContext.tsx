import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWallet as useLibWallet } from '@txnlab/use-wallet-react'
import { fetchBalance } from '../utils/wallet'

interface WalletState {
  address: string | null
  balance: number
  isConnected: boolean
  isConnecting: boolean
  connect: (id?: string) => Promise<void>
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletState | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { 
    wallets, 
    activeAccount, 
    activeAddress, 
  } = useLibWallet()
  
  const [balance, setBalance] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)

  const isConnected = !!activeAddress

  const refreshBalance = useCallback(async () => {
    if (activeAddress) {
      const newBalance = await fetchBalance(activeAddress)
      setBalance(newBalance)
    }
  }, [activeAddress])

  const connect = useCallback(async (id: string = 'pera') => {
    console.log(`Connecting wallet: ${id}...`)
    setIsConnecting(true)
    try {
      const wallet = wallets.find(w => w.id === id)
      if (!wallet) {
        throw new Error(`Wallet provider "${id}" not found`)
      }
      
      const accounts = await wallet.connect()
      console.log("Active account connected:", accounts[0])
    } catch (error) {
      console.error("Wallet connection failed:", error)
      throw error // Re-throw to handle in UI
    } finally {
      setIsConnecting(false)
    }
  }, [wallets])

  const disconnect = useCallback(async () => {
    const activeWallet = wallets.find(w => w.isActive)
    if (activeWallet) {
      await activeWallet.disconnect()
    }
    setBalance(0)
  }, [wallets])

  // Debug logging
  useEffect(() => {
    if (activeAccount) {
      console.log("Active account updated:", activeAccount.address)
    }
  }, [activeAccount])

  // Balance polling
  useEffect(() => {
    if (activeAddress) {
      refreshBalance()
      const interval = setInterval(refreshBalance, 30000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [activeAddress, refreshBalance])

  return (
    <WalletContext.Provider
      value={{
        address: activeAddress || null,
        balance,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
