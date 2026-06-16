import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { friendlyDbError } from '@/lib/utils'
import { z } from 'zod'

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration_minutes: z.number().min(5),
  price: z.number().min(0),
  currency: z.string().default('PKR'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', params.id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'service') }, { status: 400 })
  return NextResponse.json({ services: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('services')
    .insert({ ...parsed.data, business_id: params.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'service') }, { status: 400 })
  return NextResponse.json({ service: data }, { status: 201 })
}
