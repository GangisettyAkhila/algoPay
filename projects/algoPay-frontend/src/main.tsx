import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/App.css'
import ErrorBoundary from './components/ErrorBoundary'
import { WalletManager, WalletProvider as LibWalletProvider, WalletId, NetworkId } from '@txnlab/use-wallet-react'
import { PeraWalletConnect } from '@perawallet/connect'
import { WalletProvider as CustomWalletProvider } from './context/WalletContext'

const walletManager = new WalletManager({
  wallets: [
    {
      id: WalletId.PERA
    }
  ],
  defaultNetwork: NetworkId.TESTNET
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LibWalletProvider manager={walletManager}>
        <CustomWalletProvider>
          <App />
        </CustomWalletProvider>
      </LibWalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)