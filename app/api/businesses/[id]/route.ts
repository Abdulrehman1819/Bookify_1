import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('businesses')
    .select('*, business_branches(*), staff(*, staff_services(*, services(*)))')
    .eq('slug', params.id)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('business_id', data.id)

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  return NextResponse.json({ business: data, avgRating, reviewCount: reviews?.length ?? 0 })
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  logo_url: z.string().optional(),
  cover_image_url: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('businesses')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('owner_id', auth.user!.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ business: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('businesses')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('owner_id', auth.user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
