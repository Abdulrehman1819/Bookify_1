import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM')

  const supabase = createClient()
  const monthStart = format(startOfMonth(new Date(month + '-01')), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date(month + '-01')), 'yyyy-MM-dd')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', auth.user!.id)

  if (!businesses?.length) return NextResponse.json({ utilization: [] })
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

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('staff_id, staff(name)')
    .in('branch_id', branchIds)
    .gte('booking_date', monthStart)
    .lte('booking_date', monthEnd)
    .neq('status', 'CANCELLED')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const utilMap: Record<string, { staff_id: string; name: string; count: number }> = {}
  for (const b of bookings || []) {
    const staffName = (b.staff as unknown as { name: string } | null)?.name || 'Unknown'
    if (!utilMap[b.staff_id]) {
      utilMap[b.staff_id] = { staff_id: b.staff_id, name: staffName, count: 0 }
    }
    utilMap[b.staff_id].count++
  }

  return NextResponse.json({ utilization: Object.values(utilMap) })
}
