import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useEffect } from 'react'

export default function LandingPage() {
  const { isConnected, connect, isConnecting } = useWallet()
  const navigate = useNavigate()

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard')
    }
  }, [isConnected, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-68px)] px-6 slide-up">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
            Algorand Testnet · Secure Managed Payments
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Automate Payments <br />
          <span className="text-zinc-500 dark:text-zinc-400">on Algorand</span>
        </h1>

        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
          Create payment tasks that execute automatically on-chain.
          Schedule deadlines, set recipients, and let the blockchain do the rest.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => connect('pera')}
            disabled={isConnecting}
            className="btn btn-primary h-14 px-10 rounded-xl text-base shadow-sm hover:shadow-emerald-500/10"
          >
            {isConnecting ? (
              <>
                <span className="spinner border-t-white" />
                Connecting Wallet...
              </>
            ) : (
              'Connect Pera Wallet'
            )}
          </button>
          
          <a
            href="https://lora.algokit.io/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary h-14 px-10 rounded-xl text-base"
          >
            Explore Network
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-zinc-100 dark:border-zinc-800 pt-12">
          {[
            { label: 'Latency', value: '3.3s' },
            { label: 'Fee', value: '0.001' },
            { label: 'Status', value: 'Live' },
            { label: 'Network', value: 'Testnet' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-tighter mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
