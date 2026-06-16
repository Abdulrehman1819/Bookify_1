import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const auth = await requireRole(['CUSTOMER', 'SHOP_OWNER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('booking_date, start_time, customer_id')
    .eq('id', params.bookingId)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.customer_id !== auth.user!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`)
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (bookingStart < twoHoursFromNow) {
    return NextResponse.json({ error: 'Cannot cancel within 2 hours of appointment' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', params.bookingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
