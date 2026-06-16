import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, business_type, city, area, address, description, logo_url, cover_image_url')
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return NextResponse.json({ user, profile, business })
}
