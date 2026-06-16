import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  avatar_url: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff')
    .select('*, staff_services(*, services(*)), working_hours(*)')
    .eq('id', params.staffId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ staff: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff')
    .update(parsed.data)
    .eq('id', params.staffId)
    .eq('business_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ staff: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', params.staffId)
    .eq('business_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
