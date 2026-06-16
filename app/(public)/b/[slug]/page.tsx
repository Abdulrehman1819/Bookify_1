import { notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { StaffCard } from '@/components/business/StaffCard'
import { ReviewCard } from '@/components/business/ReviewCard'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Star } from 'lucide-react'

export default async function BusinessPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, business_branches(*), staff(*, staff_services(*, services(*)))')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!business) notFound()

  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('*, profiles(first_name, last_name, avatar_url), staff(name)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  const reviews = reviewsData || []
  const avg_rating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0

  const branches = business.business_branches || []
  const staff = (business.staff || []).filter((s: any) => s.is_active)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Cover */}
      <div className="h-56 bg-gradient-to-br from-[#6366F1]/20 to-[#6366F1]/5 relative">
        {business.cover_image_url && (
          <img src={business.cover_image_url} alt={business.name} className="w-full h-full object-cover" />
        )}
      </div>

      <main className="flex-1 bg-[#F8FAFC]">
        <div className="container py-8 px-4">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            {business.logo_url && (
              <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-2xl border bg-white object-cover shadow-sm -mt-8" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[#1E293B]">{business.name}</h1>
                {business.is_verified && <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm text-[#94A3B8] mt-1">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city}</span>
                {avg_rating > 0 && (
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{avg_rating.toFixed(1)} ({reviews?.length || 0} reviews)</span>
                )}
              </div>
              <Badge variant="secondary" className="mt-2 text-xs">
                {business.business_type.charAt(0) + business.business_type.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>

          {business.description && (
            <p className="text-[#1E293B] mb-6 max-w-2xl">{business.description}</p>
          )}

          <Tabs defaultValue="staff">
            <TabsList className="mb-6">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {branches.length > 1 && (
                <div className="mb-4">
                  <p className="text-sm text-[#94A3B8] mb-2">Branches</p>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((br: any) => (
                      <Badge key={br.id} variant="outline">{br.name} — {br.city}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {staff.length === 0 ? (
                <p className="text-[#94A3B8]">No staff available yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((s: any) => (
                    <StaffCard key={s.id} staff={s} businessSlug={business.slug} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              {!reviews || reviews.length === 0 ? (
                <p className="text-[#94A3B8]">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  {reviews.map((r: any) => <ReviewCard key={r.id} review={r} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
