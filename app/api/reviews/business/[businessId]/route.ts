import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(first_name, last_name, avatar_url), staff(name)')
    .eq('business_id', params.businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const avg = data && data.length > 0
    ? data.reduce((sum, r) => sum + r.rating, 0) / data.length
    : 0

  return NextResponse.json({ reviews: data, avg_rating: Math.round(avg * 10) / 10 })
}
