import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { friendlyAuthError } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in all required fields correctly.' }, { status: 400 })
  }

  const { firstName, lastName, email, phone, password } = parsed.data
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName, phone, role: 'CUSTOMER' },
    },
  })

  if (error) {
    return NextResponse.json({ error: friendlyAuthError(error) }, { status: 400 })
  }

  // Ensure profile row exists (trigger may not have run or may have failed)
  if (data.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email!,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role: 'CUSTOMER',
    }, { onConflict: 'id' })
  }

  return NextResponse.json({ user: data.user }, { status: 201 })
}
