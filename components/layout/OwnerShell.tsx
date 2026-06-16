'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { OwnerSidebar } from './Sidebar'

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-[#0F172A] flex items-center justify-between px-4 border-b border-slate-800">
        <Link href="/" className="text-xl font-bold text-[#6366F1]">Bookify</Link>
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="flex">
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
