'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerSidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface Branch { id: string; name: string }
interface Staff { id: string; name: string }
interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  profiles?: { first_name: string; last_name: string; phone: string | null }
  staff?: { name: string }
  business_branches?: { name: string }
  booking_services?: { services?: { name: string } }[]
}

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
}

export default function OwnerBookingsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [filters, setFilters] = useState({ branchId: '', staffId: '', date: '', status: '' })

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'SHOP_OWNER') router.replace('/')
      else fetchMeta()
    }
  }, [profile, loading])

  useEffect(() => { if (profile?.role === 'SHOP_OWNER') fetchBookings() }, [filters])

  const fetchMeta = async () => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const bId = me.business?.id
    if (!bId) return
    const [br, sr] = await Promise.all([
      fetch(`/api/businesses/${bId}/branches`).then(r => r.json()),
      fetch(`/api/businesses/${bId}/staff`).then(r => r.json()),
    ])
    setBranches(br.branches || [])
    setStaff(sr.staff || [])
    fetchBookings()
  }

  const fetchBookings = async () => {
    const params = new URLSearchParams()
    if (filters.branchId) params.set('branchId', filters.branchId)
    if (filters.staffId) params.set('staffId', filters.staffId)
    if (filters.date) params.set('date', filters.date)
    if (filters.status) params.set('status', filters.status)
    const res = await fetch(`/api/dashboard/bookings?${params}`)
    const data = await res.json()
    setBookings(data.bookings || [])
  }

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    } else {
      toast({ title: 'Error updating status', variant: 'destructive' })
    }
  }

  if (loading || !profile) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <OwnerSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Bookings</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={filters.branchId} onValueChange={v => setFilters(p => ({ ...p, branchId: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.staffId} onValueChange={v => setFilters(p => ({ ...p, staffId: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={filters.date} onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} className="w-40" />
          <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <p className="text-[#94A3B8] p-6 text-center">No bookings found.</p>
            ) : (
              <div className="divide-y">
                {bookings.map(b => {
                  const services = b.booking_services?.map(bs => bs.services?.name).filter(Boolean).join(', ')
                  return (
                    <div key={b.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-medium text-sm text-[#1E293B]">
                          {b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : 'Customer'}
                          {b.profiles?.phone && <span className="text-[#94A3B8] ml-2 text-xs">{b.profiles.phone}</span>}
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          {b.booking_date} · {b.start_time}–{b.end_time} · {b.staff?.name} · {b.business_branches?.name}
                        </p>
                        {services && <p className="text-xs text-[#94A3B8] mt-0.5">{services}</p>}
                      </div>
                      <Select value={b.status} onValueChange={v => updateStatus(b.id, v)}>
                        <SelectTrigger className={`w-36 text-xs font-medium border-0 ${STATUS_COLORS[b.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
