import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  business_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireRole(['CUSTOMER', 'SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...parsed.data, customer_id: auth.user!.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ review: data }, { status: 201 })
}
