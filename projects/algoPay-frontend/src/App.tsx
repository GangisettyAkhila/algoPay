import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useWallet } from './context/WalletContext'
import Header from './components/algoPay/Header'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWallet()
  
  if (!isConnected) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--bg-base)]">
        <div className="app-bg" />
        <Header />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}