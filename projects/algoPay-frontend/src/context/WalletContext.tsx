import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { peraWallet, fetchBalance, disconnectWallet as peraDisconnect } from '../utils/wallet'

interface WalletState {
  address: string | null
  balance: number
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
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
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)

  const isConnected = !!address

  const refreshBalance = useCallback(async () => {
    if (address) {
      const newBalance = await fetchBalance(address)
      setBalance(newBalance)
    }
  }, [address])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const accounts = await peraWallet.connect()
      if (accounts && accounts.length > 0) {
        const walletAddress = accounts[0]
        setAddress(walletAddress)
        localStorage.setItem('perawallet_address', walletAddress)
        
        const newBalance = await fetchBalance(walletAddress)
        setBalance(newBalance)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    peraDisconnect()
    setAddress(null)
    setBalance(0)
    localStorage.removeItem('perawallet_address')
    localStorage.removeItem('perawallet_session')
  }, [])

  // Only reconnect if user previously connected (check localStorage)
  useEffect(() => {
    const storedAddress = localStorage.getItem('perawallet_address')
    
    if (storedAddress) {
      const reconnectSession = async () => {
        try {
          const accounts = await peraWallet.reconnectSession()
          if (accounts && accounts.length > 0) {
            const walletAddress = accounts[0]
            setAddress(walletAddress)
          } else {
            // Session invalid, clear storage
            localStorage.removeItem('perawallet_address')
          }
        } catch (error) {
          console.log('No valid session to reconnect')
          localStorage.removeItem('perawallet_address')
        }
      }
      
      reconnectSession()
    }

    const handleDisconnect = () => {
      setAddress(null)
      setBalance(0)
      localStorage.removeItem('perawallet_address')
      localStorage.removeItem('perawallet_session')
    }
    
    peraWallet.connector?.on('disconnect', handleDisconnect)
  }, [])

  useEffect(() => {
    if (address) {
      refreshBalance()
      const interval = setInterval(refreshBalance, 30000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [address, refreshBalance])

  return (
    <WalletContext.Provider
      value={{
        address,
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
