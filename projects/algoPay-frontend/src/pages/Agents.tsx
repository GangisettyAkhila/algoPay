import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { formatAddress } from '../utils/format'
import AgentCard from '../components/Agents/AgentCard'
import RegisterAgentForm from '../components/Agents/RegisterAgentForm'
import { enqueueSnackbar } from 'notistack'

interface Agent {
  id: string
  address: string
  metadata: string
  registered: boolean
}

const mockAgents: Agent[] = [
  { id: 'agent-alpha', address: 'X7D2XPLG6MIXNCB7UJOEK6JV5YYNLFHWMXRDGXS5L5MGG6XZH7ILXQBOBY', metadata: 'ipfs://QmAlpha', registered: true },
  { id: 'agent-beta', address: 'X7D2XPLG6MIXNCB7UJOEK6JV5YYNLFHWMXRDGXS5L5MGG6XZH7ILXQBOBY', metadata: 'ipfs://QmBeta', registered: true },
  { id: 'agent-gamma', address: 'X7D2XPLG6MIXNCB7UJOEK6JV5YYNLFHWMXRDGXS5L5MGG6XZH7ILXQBOBY', metadata: 'ipfs://QmGamma', registered: true },
]

export default function Agents() {
  const { activeAddress } = useWallet()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // In production, fetch from AgentRegistry contract
    setAgents(mockAgents)
  }, [])

  const filteredAgents = agents.filter(agent =>
    agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.75rem' }}>🤖 Agent Directory</h1>
          <p className="section-subtitle">Browse and connect with autonomous payment agents</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => activeAddress ? setShowRegisterModal(true) : enqueueSnackbar('Connect wallet first', { variant: 'warning' })}
        >
          + Register Agent
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: '24px' }}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="form-input"
          placeholder="Search agents by ID or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '44px' }}
        />
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px' }} />
          <p style={{ marginTop: '16px' }}>Loading agents...</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>No agents found</h3>
          <p>Be the first to register an agent!</p>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ marginTop: '48px' }}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div className="stat-value">{agents.length}</div>
            <div className="stat-label">Total Agents</div>
          </div>
          <div>
            <div className="stat-value">{agents.filter(a => a.registered).length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div>
            <div className="stat-value">1,234</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </div>
      </div>

      <RegisterAgentForm openModal={showRegisterModal} closeModal={() => setShowRegisterModal(false)} />
    </div>
  )
}
