import React from 'react'
import Navbar from './Navbar'

interface PageLayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function PageLayout({ children, activeTab, setActiveTab }: PageLayoutProps) {
  return (
    <React.Fragment>
      <div className="app-bg" />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-layout" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {children}
      </main>
    </React.Fragment>
  )
}
