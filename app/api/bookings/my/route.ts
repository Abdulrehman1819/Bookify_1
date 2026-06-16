import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const auth = await requireRole(['CUSTOMER', 'SHOP_OWNER', 'WORKER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*, staff(*), business_branches(*), booking_services(*, services(*))')
    .eq('customer_id', auth.user!.id)
    .order('booking_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ bookings: data })
}
