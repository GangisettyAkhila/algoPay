import { formatAddress } from '../../utils/format'
import { enqueueSnackbar } from 'notistack'

interface Agent {
  id: string
  address: string
  metadata: string
  registered: boolean
}

interface AgentCardProps {
  agent: Agent
}

export default function AgentCard({ agent }: AgentCardProps) {
  const handleConnect = () => {
    enqueueSnackbar(`Connected with agent ${agent.id}`, { variant: 'success' })
  }

  return (
    <div className="agent-card">
      <div className="agent-avatar">
        {agent.id.charAt(0).toUpperCase()}
      </div>
      
      <div className="agent-info">
        <div className="agent-name">{agent.id}</div>
        <div className="agent-address">{formatAddress(agent.address, 8)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className={`agent-badge ${agent.registered ? 'badge-registered' : 'badge-unregistered'}`}>
          {agent.registered ? '✓ Active' : '○ Inactive'}
        </span>
        
        <button 
          className="btn btn-secondary btn-sm"
          onClick={handleConnect}
        >
          Connect
        </button>
      </div>
    </div>
  )
}
