import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star } from 'lucide-react'
import { Business } from '@/types'

interface BusinessCardProps {
  business: Business & { avg_rating?: number; review_count?: number }
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link href={`/b/${business.slug}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer rounded-2xl">
        <div className="h-40 bg-gradient-to-br from-[#6366F1]/20 to-[#6366F1]/5 relative">
          {business.cover_image_url ? (
            <img src={business.cover_image_url} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl text-[#6366F1]/30">✂</span>
            </div>
          )}
          {business.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              className="absolute bottom-3 left-3 w-12 h-12 rounded-full border-2 border-white object-cover shadow"
            />
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#1E293B]">{business.name}</h3>
              <div className="flex items-center gap-1 text-sm text-[#94A3B8] mt-1">
                <MapPin className="h-3 w-3" />
                <span>{business.area ? `${business.area}, ` : ''}{business.city}</span>
              </div>
            </div>
            {business.avg_rating != null && (
              <div className="flex items-center gap-1 text-sm font-medium text-[#1E293B]">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{business.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="mt-3 text-xs">
            {business.business_type.charAt(0) + business.business_type.slice(1).toLowerCase()}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
