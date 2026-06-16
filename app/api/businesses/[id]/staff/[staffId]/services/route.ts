import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

const assignSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createClient()
  const rows = parsed.data.serviceIds.map(service_id => ({
    staff_id: params.staffId,
    service_id,
  }))

  const { error } = await supabase
    .from('staff_services')
    .upsert(rows, { onConflict: 'staff_id,service_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('serviceId')
  if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })

  const supabase = createClient()
  const { error } = await supabase
    .from('staff_services')
    .delete()
    .eq('staff_id', params.staffId)
    .eq('service_id', serviceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
