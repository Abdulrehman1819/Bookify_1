import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { BusinessCard } from '@/components/business/BusinessCard'
import { Business } from '@/types'

const CATEGORIES = [
  { label: 'Saloons', type: 'SALOON', emoji: '✂️' },
  { label: 'Clinics', type: 'CLINIC', emoji: '🏥' },
  { label: 'Gyms', type: 'GYM', emoji: '💪' },
  { label: 'Spas', type: 'SPA', emoji: '🧖' },
]

export default async function LandingPage() {
  const supabase = createClient()
  const { data: featured } = await supabase
    .from('businesses')
    .select('*')
    .eq('is_active', true)
    .limit(6)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F172A] text-white py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Book appointments with{' '}
            <span className="text-[#6366F1]">top businesses</span> near you
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            Saloons, clinics, gyms and more — find and book in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search">
              <Button size="lg" className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#6366F1]/90 text-white px-8">
                Book a service
              </Button>
            </Link>
            <Link href="/list-business">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 px-8">
                List your business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 bg-[#F8FAFC]">
        <div className="container">
          <h2 className="text-2xl font-bold text-[#1E293B] mb-6">Browse by category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => (
              <Link key={cat.type} href={`/search?type=${cat.type}`}>
                <Card className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer text-center">
                  <CardContent className="p-6">
                    <div className="text-3xl mb-2">{cat.emoji}</div>
                    <p className="font-semibold text-[#1E293B]">{cat.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-4">
        <div className="container">
          <h2 className="text-2xl font-bold text-[#1E293B] mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Search', desc: 'Find businesses by city, area, or business type.' },
              { step: '2', title: 'Choose', desc: 'Pick a staff member, select services, and choose a time slot.' },
              { step: '3', title: 'Book', desc: 'Confirm your appointment — it\'s that easy.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#6366F1] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-[#1E293B] mb-2">{item.title}</h3>
                <p className="text-[#94A3B8] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured businesses */}
      {featured && featured.length > 0 && (
        <section className="py-12 px-4 bg-[#F8FAFC]">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1E293B]">Featured businesses</h2>
              <Link href="/search" className="text-sm text-[#6366F1] hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featured as Business[]).map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
