import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  label: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_breaks')
    .select('*')
    .eq('staff_id', params.staffId)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ breaks: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_breaks')
    .insert({ ...parsed.data, staff_id: params.staffId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ break: data }, { status: 201 })
}
