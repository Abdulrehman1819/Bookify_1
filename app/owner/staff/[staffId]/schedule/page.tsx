'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerSidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, CalendarDays, Settings2 } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DayHours { day_of_week: number; start_time: string; end_time: string; is_off: boolean }
interface Break { id?: string; day_of_week: number; start_time: string; end_time: string; label: string }
interface BookingEvent {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  profiles?: { first_name: string; last_name: string; phone: string | null } | null
  booking_services?: { services?: { name: string; duration_minutes: number } | null }[]
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: '#F59E0B', text: '#fff', label: 'Pending' },
  CONFIRMED: { bg: '#6366F1', text: '#fff', label: 'Confirmed' },
  COMPLETED: { bg: '#10B981', text: '#fff', label: 'Completed' },
  CANCELLED: { bg: '#94A3B8', text: '#fff', label: 'Cancelled' },
  NO_SHOW:   { bg: '#EF4444', text: '#fff', label: 'No-show' },
}

export default function SchedulePage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const staffId = params.staffId as string
  const { toast } = useToast()
  const calendarRef = useRef<FullCalendar>(null)

  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '18:00', is_off: i === 0 }))
  )
  const [breaks, setBreaks] = useState<Break[]>([])
  const [leaves, setLeaves] = useState<{ id: string; date: string }[]>([])
  const [newLeave, setNewLeave] = useState('')
  const [saving, setSaving] = useState(false)

  const [bookings, setBookings] = useState<BookingEvent[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null)
  const [staffName, setStaffName] = useState('')

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'SHOP_OWNER') router.replace('/')
      else fetchAll()
    }
  }, [profile, loading])

  const fetchAll = async () => {
    const [wh, br, lv, bk, me] = await Promise.all([
      fetch(`/api/staff/${staffId}/availability/working-hours`).then(r => r.json()),
      fetch(`/api/staff/${staffId}/availability/breaks`).then(r => r.json()),
      fetch(`/api/staff/${staffId}/availability/leaves`).then(r => r.json()),
      fetch(`/api/bookings/staff/${staffId}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ])
    if (wh.working_hours?.length) setHours(wh.working_hours)
    if (br.breaks) setBreaks(br.breaks)
    if (lv.leaves) setLeaves(lv.leaves)
    if (bk.bookings) setBookings(bk.bookings)

    // Fetch staff name using business id from me
    if (me.business?.id) {
      const staffRes = await fetch(`/api/businesses/${me.business.id}/staff`).then(r => r.json())
      const found = (staffRes.staff || []).find((s: { id: string; name: string }) => s.id === staffId)
      if (found) setStaffName(found.name)
    }
  }

  // Convert bookings to FullCalendar events
  const calendarEvents = bookings.map(b => {
    const color = STATUS_COLORS[b.status] ?? STATUS_COLORS.PENDING
    const customerName = b.profiles
      ? `${b.profiles.first_name} ${b.profiles.last_name}`
      : 'Customer'
    const serviceNames = b.booking_services
      ?.map(bs => bs.services?.name)
      .filter(Boolean)
      .join(', ') || ''
    return {
      id: b.id,
      title: `${customerName}${serviceNames ? ` · ${serviceNames}` : ''}`,
      start: `${b.booking_date}T${b.start_time}:00`,
      end: `${b.booking_date}T${b.end_time}:00`,
      backgroundColor: color.bg,
      borderColor: color.bg,
      textColor: color.text,
      extendedProps: { bookingId: b.id },
    }
  })

  // Working hours shown as light background events
  const bgEvents = hours
    .filter(h => !h.is_off)
    .map(h => ({
      display: 'background' as const,
      daysOfWeek: [h.day_of_week],
      startTime: h.start_time,
      endTime: h.end_time,
      backgroundColor: '#EEF2FF',
    }))

  const handleEventClick = (info: EventClickArg) => {
    const bookingId = info.event.extendedProps.bookingId as string
    const found = bookings.find(b => b.id === bookingId)
    setSelectedBooking(found ?? null)
  }

  const saveHours = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/${staffId}/availability/working-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Hours saved' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const addBreak = async (day: number) => {
    await fetch(`/api/staff/${staffId}/availability/breaks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: day, start_time: '13:00', end_time: '14:00', label: 'Break' }),
    })
    fetchAll()
  }

  const deleteBreak = async (id: string) => {
    await fetch(`/api/staff/${staffId}/availability/breaks/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const addLeave = async () => {
    if (!newLeave) return
    await fetch(`/api/staff/${staffId}/availability/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newLeave }),
    })
    setNewLeave('')
    fetchAll()
  }

  const deleteLeave = async (id: string) => {
    await fetch(`/api/staff/${staffId}/availability/leaves/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  if (loading || !profile) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <OwnerSidebar />
      <main className="flex-1 p-8 overflow-hidden">
        <Link href="/owner/staff" className="flex items-center gap-1 text-sm text-[#94A3B8] hover:text-[#1E293B] mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to staff
        </Link>
        <h1 className="text-2xl font-bold text-[#1E293B] mb-6">
          {staffName ? `${staffName}'s Calendar` : 'Staff Calendar'}
        </h1>

        <Tabs defaultValue="calendar">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Schedule Settings
            </TabsTrigger>
          </TabsList>

          {/* ── CALENDAR TAB ── */}
          <TabsContent value="calendar">
            {/* Status legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-[#1E293B]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: val.bg }} />
                  {val.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-xs text-[#1E293B]">
                <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#EEF2FF] border border-[#6366F1]/20" />
                Working hours
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                events={[...calendarEvents, ...bgEvents]}
                eventClick={handleEventClick}
                allDaySlot={false}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00"
                expandRows
                height="calc(100vh - 260px)"
                nowIndicator
                eventContent={(info) => {
                  if (info.event.display === 'background') return null
                  return (
                    <div className="px-1 py-0.5 h-full overflow-hidden">
                      <p className="text-[11px] font-semibold leading-tight truncate">{info.timeText}</p>
                      <p className="text-[11px] leading-tight truncate mt-0.5">{info.event.title}</p>
                    </div>
                  )
                }}
              />
            </div>

            {/* Booking detail popover */}
            {selectedBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-full" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-[#1E293B] text-base">
                        {selectedBooking.profiles
                          ? `${selectedBooking.profiles.first_name} ${selectedBooking.profiles.last_name}`
                          : 'Customer'}
                      </p>
                      {selectedBooking.profiles?.phone && (
                        <p className="text-xs text-[#94A3B8] mt-0.5">{selectedBooking.profiles.phone}</p>
                      )}
                    </div>
                    <Badge style={{ background: STATUS_COLORS[selectedBooking.status]?.bg, color: '#fff' }}>
                      {STATUS_COLORS[selectedBooking.status]?.label ?? selectedBooking.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Date</span>
                      <span className="font-medium">{selectedBooking.booking_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Time</span>
                      <span className="font-medium">{selectedBooking.start_time} – {selectedBooking.end_time}</span>
                    </div>
                    {selectedBooking.booking_services && selectedBooking.booking_services.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-[#94A3B8] mb-1.5">Services</p>
                        {selectedBooking.booking_services.map((bs, i) => (
                          bs.services && (
                            <div key={i} className="flex justify-between">
                              <span>{bs.services.name}</span>
                              <span className="text-[#94A3B8]">{bs.services.duration_minutes} min</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    {selectedBooking.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-[#94A3B8] mb-1">Notes</p>
                        <p className="text-[#1E293B]">{selectedBooking.notes}</p>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setSelectedBooking(null)}>Close</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── SCHEDULE SETTINGS TAB ── */}
          <TabsContent value="schedule">
            <Card className="rounded-2xl shadow-sm mb-6">
              <CardHeader><CardTitle className="text-base">Working Hours</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hours.map((day, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-28 flex items-center gap-2">
                        <Switch
                          checked={!day.is_off}
                          onCheckedChange={v => setHours(prev => prev.map((h, j) => j === i ? { ...h, is_off: !v } : h))}
                        />
                        <span className="text-sm font-medium">{DAYS[day.day_of_week].slice(0, 3)}</span>
                      </div>
                      {day.is_off ? (
                        <span className="text-sm text-[#94A3B8]">Day off</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={day.start_time}
                            onChange={e => setHours(prev => prev.map((h, j) => j === i ? { ...h, start_time: e.target.value } : h))}
                            className="w-32"
                          />
                          <span className="text-sm text-[#94A3B8]">to</span>
                          <Input
                            type="time"
                            value={day.end_time}
                            onChange={e => setHours(prev => prev.map((h, j) => j === i ? { ...h, end_time: e.target.value } : h))}
                            className="w-32"
                          />
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => addBreak(day.day_of_week)}
                            className="text-xs text-[#6366F1]"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Break
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {breaks.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Breaks</p>
                      <div className="space-y-2">
                        {breaks.map(b => (
                          <div key={b.id} className="flex items-center gap-3 text-sm">
                            <span className="w-10 text-[#94A3B8]">{DAYS[b.day_of_week].slice(0, 3)}</span>
                            <span>{b.start_time} – {b.end_time}</span>
                            {b.label && <span className="text-[#94A3B8]">({b.label})</span>}
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => b.id && deleteBreak(b.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button className="mt-4 bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={saveHours} disabled={saving}>
                  {saving ? 'Saving…' : 'Save hours'}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="text-base">Leave Days</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input type="date" value={newLeave} onChange={e => setNewLeave(e.target.value)} className="w-44" />
                  <Button className="bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={addLeave} disabled={!newLeave}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {leaves.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No leave days marked.</p>
                ) : (
                  <div className="space-y-2">
                    {leaves.map(l => (
                      <div key={l.id} className="flex items-center gap-3">
                        <span className="text-sm">{l.date}</span>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => deleteLeave(l.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
