import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/auth'
import { slugify, friendlyDbError } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  businessType: z.enum(['SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER']),
  city: z.string().min(1),
  area: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to list a business.' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in all required fields correctly.' }, { status: 400 })
  }

  const { name, businessType, city, area, address, description, logoUrl } = parsed.data

  // Ensure profile row exists — the DB trigger should create it on signup,
  // but we guard here in case it didn't run.
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
        phone: user.user_metadata?.phone || null,
        role: 'CUSTOMER',
      })

    if (profileError) {
      return NextResponse.json(
        { error: 'Could not set up your account profile. Please log out and log back in, then try again.' },
        { status: 500 }
      )
    }
  }

  const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)

  // Use service role client so RLS does not block the insert
  const { data: business, error: bizError } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: user.id,
      name,
      slug,
      business_type: businessType,
      city,
      area: area || null,
      address: address || null,
      description: description || null,
      logo_url: logoUrl || null,
    })
    .select()
    .single()

  if (bizError) {
    return NextResponse.json({ error: friendlyDbError(bizError.message, 'business') }, { status: 400 })
  }

  // Upgrade role to SHOP_OWNER
  await supabaseAdmin
    .from('profiles')
    .update({ role: 'SHOP_OWNER' })
    .eq('id', user.id)

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'SHOP_OWNER' },
  })

  return NextResponse.json({ business }, { status: 201 })
}
