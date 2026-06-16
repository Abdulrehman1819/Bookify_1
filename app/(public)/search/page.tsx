'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BusinessCard } from '@/components/business/BusinessCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Business } from '@/types'
import { Search } from 'lucide-react'

const TYPES = ['SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER']

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(searchParams.get('name') || '')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [type, setType] = useState(searchParams.get('type') || '')

  const fetchBusinesses = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (city) params.set('city', city)
    if (type) params.set('type', type)
    params.set('limit', '24')

    const res = await fetch(`/api/businesses?${params}`)
    if (res.ok) {
      const json = await res.json()
      setBusinesses(json.businesses || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchBusinesses() }, [searchParams.toString()])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (city) params.set('city', city)
    if (type) params.set('type', type)
    router.push(`/search?${params}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-[#F8FAFC] py-8 px-4">
        <div className="container">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Find services</h1>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search businesses…"
                value={name}
                onChange={e => setName(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="City"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="sm:w-36"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="bg-[#6366F1] hover:bg-[#6366F1]/90">Search</Button>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-20 text-[#94A3B8]">
              <p className="text-lg mb-2">No businesses found</p>
              <p className="text-sm">Try adjusting your search filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
