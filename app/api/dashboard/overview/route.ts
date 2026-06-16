import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const supabase = createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', auth.user!.id)

  if (!businesses?.length) return NextResponse.json({ today: 0, week: 0, month: 0 })

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

  if (!branchIds.length) return NextResponse.json({ today: 0, week: 0, month: 0 })

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [todayRes, weekRes, monthRes] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('branch_id', branchIds).eq('booking_date', todayStr).neq('status', 'CANCELLED'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('branch_id', branchIds).gte('booking_date', weekStart).lte('booking_date', weekEnd).neq('status', 'CANCELLED'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).in('branch_id', branchIds).gte('booking_date', monthStart).lte('booking_date', monthEnd).neq('status', 'CANCELLED'),
  ])

  return NextResponse.json({
    today: todayRes.count || 0,
    week: weekRes.count || 0,
    month: monthRes.count || 0,
  })
}
