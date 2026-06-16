import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { branchId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staffId')
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  const supabase = createClient()
  let query = supabase
    .from('bookings')
    .select('*, staff(*), booking_services(*, services(*)), profiles(first_name, last_name, phone)')
    .eq('branch_id', params.branchId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })

  if (staffId) query = query.eq('staff_id', staffId)
  if (date) query = query.eq('booking_date', date)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ bookings: data })
}
