import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  date: z.string(),
  reason: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_leaves')
    .select('*')
    .eq('staff_id', params.staffId)
    .order('date')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ leaves: data })
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
    .from('staff_leaves')
    .insert({ ...parsed.data, staff_id: params.staffId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ leave: data }, { status: 201 })
}
