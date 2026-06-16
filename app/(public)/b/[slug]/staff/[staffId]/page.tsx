import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { BookingWizard } from '@/components/booking/BookingWizard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function BookingPage({
  params,
}: {
  params: { slug: string; staffId: string }
}) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, business_branches(*)')
    .eq('slug', params.slug)
    .single()

  if (!business) notFound()

  const { data: staff } = await supabase
    .from('staff')
    .select('*, staff_services(*, services(*))')
    .eq('id', params.staffId)
    .eq('business_id', business.id)
    .eq('is_active', true)
    .single()

  if (!staff) notFound()

  const branches = (business.business_branches || []).filter((b: any) => b.is_active)
  const branch = branches.find((b: any) => b.id === staff.branch_id) || branches[0]

  if (!branch) notFound()

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 py-8 px-4">
        <div className="container max-w-lg">
          <Link href={`/b/${params.slug}`} className="flex items-center gap-1 text-sm text-[#94A3B8] hover:text-[#1E293B] mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to {business.name}
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Avatar className="h-14 w-14 rounded-xl">
              <AvatarImage src={staff.avatar_url || ''} alt={staff.name} />
              <AvatarFallback className="rounded-xl bg-[#6366F1]/10 text-[#6366F1] font-semibold text-lg">
                {staff.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-[#1E293B]">{staff.name}</h1>
              {staff.title && <p className="text-sm text-[#94A3B8]">{staff.title}</p>}
              <Badge variant="secondary" className="text-xs mt-1">{branch.name}</Badge>
            </div>
          </div>

          <BookingWizard staff={staff} branch={branch} businessSlug={params.slug} />
        </div>
      </main>
    </div>
  )
}
