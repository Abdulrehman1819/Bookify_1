'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerShell } from '@/components/layout/OwnerShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, TrendingUp } from 'lucide-react'

interface Stats { today: number; week: number; month: number }
interface Booking { id: string; booking_date: string; start_time: string; status: string; profiles?: { first_name: string; last_name: string }; staff?: { name: string }; business_branches?: { name: string } }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
}

export default function OwnerDashboard() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0 })
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'SHOP_OWNER') router.replace('/')
      else {
        fetch('/api/dashboard/overview').then(r => r.json()).then(d => setStats(d)).catch(() => {})
        fetch('/api/dashboard/bookings').then(r => r.json()).then(d => setBookings((d.bookings || []).slice(0, 10))).catch(() => {})
      }
    }
  }, [profile, loading])

  if (loading || !profile) return null

  return (
    <OwnerShell>
      <div className="p-4 lg:p-8">
        <h1 className="text-xl lg:text-2xl font-bold text-[#1E293B] mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Today', value: stats.today, icon: Calendar, color: 'text-[#6366F1]' },
            { label: 'This week', value: stats.week, icon: Clock, color: 'text-emerald-600' },
            { label: 'This month', value: stats.month, icon: TrendingUp, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="rounded-2xl shadow-sm">
              <CardContent className="p-4 lg:p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gray-100 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-[#94A3B8]">{label}</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{value}</p>
                  <p className="text-xs text-[#94A3B8]">bookings</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Bookings</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-[#94A3B8] py-4 text-center">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1E293B] truncate">
                        {b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : 'Customer'}
                      </p>
                      <p className="text-xs text-[#94A3B8] truncate">
                        {b.booking_date} at {b.start_time}
                        {b.staff?.name && ` · ${b.staff.name}`}
                        {b.business_branches?.name && ` · ${b.business_branches.name}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || ''}`}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerShell>
  )
}
