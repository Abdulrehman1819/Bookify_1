import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAllSlots } from '@/lib/slotCalculator'

// Used when a staff member has no schedule configured yet
const DEFAULT_WORKING_HOURS = { start_time: '09:00', end_time: '18:00', is_off: false }

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const serviceIds = searchParams.getAll('serviceIds[]')

  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  // Parse date parts to avoid UTC-vs-local timezone mismatch from new Date('YYYY-MM-DD')
  const [y, m, d] = date.split('-').map(Number)
  const dayOfWeek = new Date(y, m - 1, d).getDay()

  const supabase = createClient()

  const [workingHoursRes, bookingsRes, breaksRes, leavesRes, servicesRes] = await Promise.all([
    supabase
      .from('working_hours')
      .select('*')
      .eq('staff_id', params.staffId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('staff_id', params.staffId)
      .eq('booking_date', date)
      .in('status', ['PENDING', 'CONFIRMED']),
    supabase
      .from('staff_breaks')
      .select('start_time, end_time')
      .eq('staff_id', params.staffId)
      .eq('day_of_week', dayOfWeek),
    supabase
      .from('staff_leaves')
      .select('id')
      .eq('staff_id', params.staffId)
      .eq('date', date),
    serviceIds.length > 0
      ? supabase.from('services').select('duration_minutes').in('id', serviceIds)
      : Promise.resolve({ data: [] as { duration_minutes: number }[] }),
  ])

  const workingHours = workingHoursRes.data ?? DEFAULT_WORKING_HOURS

  const totalDuration = serviceIds.length > 0 && servicesRes.data && servicesRes.data.length > 0
    ? servicesRes.data.reduce((sum, s) => sum + s.duration_minutes, 0)
    : 30

  const slots = calculateAllSlots({
    workingHours,
    isLeaveDay: (leavesRes.data || []).length > 0,
    existingBookings: bookingsRes.data || [],
    breaks: breaksRes.data || [],
    totalDuration,
  })

  return NextResponse.json({ slots })
}
