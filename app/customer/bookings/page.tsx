'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Star, X } from 'lucide-react'
import { format } from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  staff?: { id: string; name: string }
  business_branches?: { name: string; business_id: string }
  booking_services?: { services?: { name: string; price: number } }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
}

function ReviewDialog({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const submit = async () => {
    setSaving(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        business_id: booking.business_branches?.business_id,
        staff_id: booking.staff?.id,
        rating,
        comment,
      }),
    })
    setSaving(false)
    if (res.ok) { toast({ title: 'Review submitted!' }); onDone() }
    else toast({ title: 'Error submitting review', variant: 'destructive' })
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Leave a review</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-[#94A3B8] mb-2">Rating</p>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)}>
                <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">Comment (optional)</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            rows={3}
            placeholder="Share your experience…"
          />
        </div>
        <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={submit} disabled={saving}>
          {saving ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </DialogContent>
  )
}

function BookingCard({ booking, onCancel, onReview }: { booking: Booking; onCancel: (id: string) => void; onReview?: (b: Booking) => void }) {
  const services = booking.booking_services?.map(bs => bs.services?.name).filter(Boolean).join(', ')
  const total = booking.booking_services?.reduce((sum, bs) => sum + (bs.services?.price || 0), 0) || 0
  const isPast = new Date(`${booking.booking_date}T${booking.end_time}`) < new Date()
  const canCancel = !isPast && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED'

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#1E293B]">{booking.staff?.name}</h3>
              <Badge variant="secondary" className="text-xs">{booking.business_branches?.name}</Badge>
            </div>
            <p className="text-sm text-[#94A3B8]">
              {format(new Date(booking.booking_date), 'EEEE, MMMM d')} · {booking.start_time}–{booking.end_time}
            </p>
            {services && <p className="text-xs text-[#94A3B8] mt-1">{services}</p>}
            {total > 0 && <p className="text-sm font-medium text-[#1E293B] mt-1">PKR {total.toLocaleString()}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status]}`}>
              {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
            </span>
            {canCancel && (
              <Button variant="ghost" size="sm" className="text-xs text-red-500 h-7 px-2" onClick={() => onCancel(booking.id)}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            )}
            {booking.status === 'COMPLETED' && onReview && (
              <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => onReview(booking)}>
                <Star className="h-3 w-3 mr-1" /> Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CustomerBookingsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else fetchBookings()
    }
  }, [profile, loading])

  const fetchBookings = async () => {
    const res = await fetch('/api/bookings/my')
    const data = await res.json()
    setBookings(data.bookings || [])
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    if (res.ok) fetchBookings()
    else {
      const json = await res.json()
      toast({ title: 'Cannot cancel', description: json.error, variant: 'destructive' })
    }
  }

  const now = new Date()
  const upcoming = bookings.filter(b => new Date(`${b.booking_date}T${b.end_time}`) >= now && b.status !== 'CANCELLED')
  const past = bookings.filter(b => new Date(`${b.booking_date}T${b.end_time}`) < now)
  const cancelled = bookings.filter(b => b.status === 'CANCELLED')

  if (loading || !profile) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-[#F8FAFC] py-8 px-4">
        <div className="container max-w-2xl">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-6">My Bookings</h1>
          <Dialog open={!!reviewBooking} onOpenChange={open => { if (!open) setReviewBooking(null) }}>
            {reviewBooking && <ReviewDialog booking={reviewBooking} onDone={() => { setReviewBooking(null); fetchBookings() }} />}
          </Dialog>
          <Tabs defaultValue="upcoming">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-3">
              {upcoming.length === 0 ? <p className="text-[#94A3B8] text-center py-8">No upcoming bookings.</p> : upcoming.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </TabsContent>
            <TabsContent value="past" className="space-y-3">
              {past.length === 0 ? <p className="text-[#94A3B8] text-center py-8">No past bookings.</p> : past.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReview={setReviewBooking} />)}
            </TabsContent>
            <TabsContent value="cancelled" className="space-y-3">
              {cancelled.length === 0 ? <p className="text-[#94A3B8] text-center py-8">No cancelled bookings.</p> : cancelled.map(b => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
