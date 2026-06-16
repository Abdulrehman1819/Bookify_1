'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Scissors,
  Calendar,
  BookOpen,
  Settings,
} from 'lucide-react'

const ownerLinks = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/branches', label: 'Branches', icon: GitBranch },
  { href: '/owner/staff', label: 'Staff', icon: Users },
  { href: '/owner/services', label: 'Services', icon: Scissors },
  { href: '/owner/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/owner/settings', label: 'Settings', icon: Settings },
]

export function OwnerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r bg-[#0F172A] min-h-screen">
      <div className="p-6">
        <Link href="/" className="text-2xl font-bold text-[#6366F1]">Bookify</Link>
        <p className="text-xs text-slate-400 mt-1">Business Portal</p>
      </div>
      <nav className="px-3 pb-6 space-y-1">
        {ownerLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-[#6366F1] text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
