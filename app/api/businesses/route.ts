import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const area = searchParams.get('area')
  const type = searchParams.get('type')
  const name = searchParams.get('name')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const offset = (page - 1) * limit

  const supabase = createClient()
  let query = supabase
    .from('businesses')
    .select('*, business_branches(*)', { count: 'exact' })
    .eq('is_active', true)

  if (city) query = query.ilike('city', `%${city}%`)
  if (area) query = query.ilike('area', `%${area}%`)
  if (type) query = query.eq('business_type', type)
  if (name) query = query.ilike('name', `%${name}%`)

  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ businesses: data, total: count, page, limit })
}
