import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { friendlyDbError } from '@/lib/utils'
import { z } from 'zod'
import { addMinutes, format } from 'date-fns'

const schema = z.object({
  staff_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string(),
  service_ids: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CUSTOMER', 'SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { staff_id, branch_id, booking_date, start_time, service_ids, notes } = parsed.data
  const supabase = createClient()

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, duration_minutes, price')
    .in('id', service_ids)

  if (servicesError || !services?.length) {
    return NextResponse.json({ error: 'Services not found' }, { status: 404 })
  }

  const totalMinutes = services.reduce((sum, s) => sum + s.duration_minutes, 0)
  const [hours, mins] = start_time.split(':').map(Number)
  const startDate = new Date(2000, 0, 1, hours, mins)
  const endDate = addMinutes(startDate, totalMinutes)
  const end_time = format(endDate, 'HH:mm')

  const { data: conflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('staff_id', staff_id)
    .eq('booking_date', booking_date)
    .in('status', ['PENDING', 'CONFIRMED'])
    .lt('start_time', end_time)
    .gt('end_time', start_time)
    .limit(1)

  if (conflict && conflict.length > 0) {
    return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id: auth.user!.id,
      staff_id,
      branch_id,
      booking_date,
      start_time,
      end_time,
      notes,
    })
    .select()
    .single()

  if (bookingError) return NextResponse.json({ error: friendlyDbError(bookingError.message, 'booking') }, { status: 400 })

  const bookingServices = services.map(s => ({
    booking_id: booking.id,
    service_id: s.id,
    duration_minutes: s.duration_minutes,
    price: s.price,
  }))

  const { error: bsError } = await supabase.from('booking_services').insert(bookingServices)
  if (bsError) return NextResponse.json({ error: friendlyDbError(bsError.message, 'booking') }, { status: 400 })

  return NextResponse.json({ booking }, { status: 201 })
}
