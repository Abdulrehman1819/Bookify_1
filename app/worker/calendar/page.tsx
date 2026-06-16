'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  profiles?: { first_name: string; last_name: string; phone: string | null }
  booking_services?: { services?: { name: string } }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FBBF24',
  CONFIRMED: '#6366F1',
  COMPLETED: '#10B981',
  CANCELLED: '#F43F5E',
  NO_SHOW: '#94A3B8',
}

export default function WorkerCalendarPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Booking | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'WORKER') router.replace('/')
      else fetchData()
    }
  }, [profile, loading])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sId = user.user_metadata?.staff_id || user.id
    setStaffId(sId)
    const res = await fetch(`/api/bookings/staff/${sId}`)
    const data = await res.json()
    setBookings(data.bookings || [])
  }

  const updateStatus = async (status: string) => {
    if (!selected) return
    setUpdating(true)
    const res = await fetch(`/api/bookings/${selected.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(false)
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, status } : b))
      setSelected(prev => prev ? { ...prev, status } : null)
      toast({ title: 'Status updated' })
    }
  }

  const events = bookings.map(b => ({
    id: b.id,
    title: `${b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : 'Customer'} — ${b.booking_services?.map(bs => bs.services?.name).filter(Boolean).join(', ') || ''}`,
    start: `${b.booking_date}T${b.start_time}`,
    end: `${b.booking_date}T${b.end_time}`,
    backgroundColor: STATUS_COLORS[b.status] || '#6366F1',
    borderColor: 'transparent',
    extendedProps: { booking: b },
  }))

  if (loading || !profile) return null

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
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-[#0F172A] min-h-screen">
          <div className="p-6">
            <Link href="/" className="text-lg font-bold text-[#6366F1]">Bookify</Link>
            <p className="text-xs text-slate-400 mt-1">Worker Portal</p>
          </div>
          <nav className="px-3 pb-6">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#6366F1] text-white">
              <span>My Calendar</span>
            </div>
          </nav>
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0F172A] md:hidden overflow-y-auto">
              <div className="p-5 flex items-center justify-between border-b border-slate-800">
                <Link href="/" className="text-xl font-bold text-[#6366F1]" onClick={() => setSidebarOpen(false)}>Bookify</Link>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="px-3 py-4">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#6366F1] text-white">
                  <span>My Calendar</span>
                </div>
              </nav>
            </aside>
          </>
        )}

        <main className="flex-1 p-4 lg:p-6 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-[#1E293B] mb-6">My Calendar</h1>

          <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
            {selected && (
              <DialogContent>
                <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8]">Customer</span>
                    <span className="font-medium">{selected.profiles ? `${selected.profiles.first_name} ${selected.profiles.last_name}` : 'Unknown'}</span>
                  </div>
                  {selected.profiles?.phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">Phone</span>
                      <span>{selected.profiles.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8]">Date & Time</span>
                    <span>{format(new Date(selected.booking_date), 'MMM d, yyyy')} · {selected.start_time}–{selected.end_time}</span>
                  </div>
                  {selected.booking_services && selected.booking_services.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">Services</span>
                      <span>{selected.booking_services.map(bs => bs.services?.name).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8]">Status</span>
                    <Badge className="text-xs" style={{ backgroundColor: STATUS_COLORS[selected.status] + '20', color: STATUS_COLORS[selected.status] }}>
                      {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  {selected.status === 'CONFIRMED' || selected.status === 'PENDING' ? (
                    <div className="flex gap-2 mt-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus('COMPLETED')} disabled={updating}>Mark completed</Button>
                      <Button className="flex-1" variant="outline" onClick={() => updateStatus('NO_SHOW')} disabled={updating}>No show</Button>
                    </div>
                  ) : null}
                </div>
              </DialogContent>
            )}
          </Dialog>

          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <div className="min-w-[560px] p-2 sm:p-4">
              <FullCalendar
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                events={events}
                eventClick={info => setSelected(info.event.extendedProps.booking)}
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
                height="auto"
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
