import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER', 'WORKER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  const supabase = createClient()
  let query = supabase
    .from('bookings')
    .select('*, booking_services(*, services(*)), profiles(first_name, last_name, phone)')
    .eq('staff_id', params.staffId)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (date) query = query.eq('booking_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ bookings: data })
}
