import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('business_branches')
    .update(parsed.data)
    .eq('id', params.branchId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ branch: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('business_branches')
    .update({ is_active: false })
    .eq('id', params.branchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
