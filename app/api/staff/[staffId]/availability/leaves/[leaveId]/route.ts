import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { staffId: string; leaveId: string } }
) {
  const auth = await requireRole(['SHOP_OWNER'])
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('staff_leaves')
    .delete()
    .eq('id', params.leaveId)
    .eq('staff_id', params.staffId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
