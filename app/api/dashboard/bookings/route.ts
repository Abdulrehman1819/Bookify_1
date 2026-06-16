import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const staffId = searchParams.get('staffId')
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  const supabase = createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', auth.user!.id)

  if (!businesses?.length) return NextResponse.json({ bookings: [] })
  const businessIds = businesses.map(b => b.id)

  let branchIds: string[] = []
  if (branchId) {
    branchIds = [branchId]
  } else {
    const { data: branches } = await supabase
      .from('business_branches')
      .select('id')
      .in('business_id', businessIds)
    branchIds = (branches || []).map(b => b.id)
  }

  if (!branchIds.length) return NextResponse.json({ bookings: [] })

  let query = supabase
    .from('bookings')
    .select('*, staff(*), business_branches(*), booking_services(*, services(*)), profiles(first_name, last_name, phone, email)')
    .in('branch_id', branchIds)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })

  if (staffId) query = query.eq('staff_id', staffId)
  if (date) query = query.eq('booking_date', date)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ bookings: data })
}
