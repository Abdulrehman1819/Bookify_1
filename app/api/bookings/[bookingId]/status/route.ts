import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'
import { BookingStatus } from '@/types'

const schema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER', 'WORKER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { error } = await supabase
    .from('bookings')
    .update({ status: parsed.data.status as BookingStatus })
    .eq('id', params.bookingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
