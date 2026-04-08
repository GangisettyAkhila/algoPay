import { useState } from 'react'
import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import PageLayout from './components/Layout/PageLayout'
import Home from './pages/Home'
import Agents from './pages/Agents'
import Payments from './pages/Payments'
import Tasks from './pages/Tasks'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
  ]
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home')
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home setActiveTab={handleTabChange} />
      case 'agents':
        return <Agents />
      case 'payments':
        return <Payments />
      case 'tasks':
        return <Tasks />
      default:
        return <Home setActiveTab={handleTabChange} />
    }
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <PageLayout activeTab={activeTab} setActiveTab={handleTabChange}>
          {renderPage()}
        </PageLayout>
      </WalletProvider>
    </SnackbarProvider>
  )
}
