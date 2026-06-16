import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { friendlyDbError } from '@/lib/utils'
import { z } from 'zod'

const staffSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  bio: z.string().optional(),
  branch_id: z.string().uuid(),
  avatar_url: z.string().optional(),
  giveLoginAccess: z.boolean().default(false),
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(6).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff')
    .select('*, staff_services(*, services(*))')
    .eq('business_id', params.id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'staff') }, { status: 400 })
  return NextResponse.json({ staff: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = staffSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { giveLoginAccess, loginEmail, loginPassword, ...staffData } = parsed.data
  const supabase = createClient()

  const { data: staffMember, error } = await supabase
    .from('staff')
    .insert({ ...staffData, business_id: params.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: friendlyDbError(error.message, 'staff') }, { status: 400 })

  if (giveLoginAccess && loginEmail && loginPassword) {
    await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: loginPassword,
      user_metadata: {
        firstName: staffData.name.split(' ')[0],
        lastName: staffData.name.split(' ').slice(1).join(' ') || '',
        role: 'WORKER',
        staff_id: staffMember.id,
      },
      email_confirm: true,
    })
  }

  return NextResponse.json({ staff: staffMember }, { status: 201 })
}
