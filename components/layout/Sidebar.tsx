'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { X, LayoutDashboard, GitBranch, Users, Scissors, BookOpen, Settings } from 'lucide-react'

const ownerLinks = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/branches', label: 'Branches', icon: GitBranch },
  { href: '/owner/staff', label: 'Staff', icon: Users },
  { href: '/owner/services', label: 'Services', icon: Scissors },
  { href: '/owner/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/owner/settings', label: 'Settings', icon: Settings },
]

interface OwnerSidebarProps {
  open?: boolean
  onClose?: () => void
}

export function OwnerSidebar({ open = false, onClose }: OwnerSidebarProps) {
  const pathname = usePathname()

  const links = ownerLinks.map(({ href, label, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
        pathname === href || pathname.startsWith(href + '/')
          ? 'bg-[#6366F1] text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  ))

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-[#0F172A] min-h-screen">
        <div className="p-6">
          <Link href="/" className="text-2xl font-bold text-[#6366F1]">Bookify</Link>
          <p className="text-xs text-slate-400 mt-1">Business Portal</p>
        </div>
        <nav className="px-3 pb-6 space-y-1">{links}</nav>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#0F172A] md:hidden overflow-y-auto">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <Link href="/" className="text-2xl font-bold text-[#6366F1]" onClick={onClose}>Bookify</Link>
                <p className="text-xs text-slate-400 mt-0.5">Business Portal</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1 flex-1">{links}</nav>
          </aside>
        </>
      )}
    </>
  )
}
