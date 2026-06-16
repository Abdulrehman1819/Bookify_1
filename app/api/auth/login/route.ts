import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { friendlyAuthError } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password } = parsed.data
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: friendlyAuthError(error) }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({
    user: data.user,
    role: profile?.role ?? 'CUSTOMER',
    onboarding_complete: profile?.onboarding_complete ?? false,
  })
}
