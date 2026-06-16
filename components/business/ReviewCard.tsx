import { Star } from 'lucide-react'
import { format } from 'date-fns'
import { Review } from '@/types'

interface ReviewWithProfile extends Review {
  profiles?: { first_name: string; last_name: string; avatar_url?: string | null }
  staff?: { name: string }
}

export function ReviewCard({ review }: { review: ReviewWithProfile }) {
  const name = review.profiles
    ? `${review.profiles.first_name} ${review.profiles.last_name}`
    : 'Anonymous'

  return (
    <div className="border-b pb-4 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{name}</span>
          {review.staff && <span className="text-xs text-[#94A3B8]">with {review.staff.name}</span>}
        </div>
        <span className="text-xs text-[#94A3B8]">{format(new Date(review.created_at), 'MMM d, yyyy')}</span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
      {review.comment && <p className="text-sm text-[#1E293B]">{review.comment}</p>}
    </div>
  )
}
