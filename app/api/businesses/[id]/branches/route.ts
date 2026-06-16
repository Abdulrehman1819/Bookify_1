import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { friendlyDbError } from '@/lib/utils'
import { z } from 'zod'

const branchSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  area: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('business_branches')
    .select('*')
    .eq('business_id', params.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'branch') }, { status: 400 })
  return NextResponse.json({ branches: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = branchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('business_branches')
    .insert({ ...parsed.data, business_id: params.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'branch') }, { status: 400 })
  return NextResponse.json({ branch: data }, { status: 201 })
}
