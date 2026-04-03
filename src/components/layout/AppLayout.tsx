'use client'

import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-[52px] md:pt-0">
        {children}
      </main>
    </div>
  )
}
