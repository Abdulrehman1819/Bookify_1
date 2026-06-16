import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Staff, Service } from '@/types'

interface StaffCardProps {
  staff: Staff & { staff_services?: { services?: Service }[] }
  businessSlug: string
}

export function StaffCard({ staff, businessSlug }: StaffCardProps) {
  const services = staff.staff_services?.map(ss => ss.services).filter(Boolean) as Service[] | undefined

  return (
    <Card className="rounded-2xl hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 rounded-xl">
            <AvatarImage src={staff.avatar_url || ''} alt={staff.name} />
            <AvatarFallback className="rounded-xl bg-[#6366F1]/10 text-[#6366F1] font-semibold">
              {staff.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1E293B]">{staff.name}</h3>
            {staff.title && <p className="text-sm text-[#94A3B8]">{staff.title}</p>}
            {services && services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {services.slice(0, 3).map(s => (
                  <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                ))}
                {services.length > 3 && (
                  <Badge variant="secondary" className="text-xs">+{services.length - 3} more</Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <Link href={`/b/${businessSlug}/staff/${staff.id}`} className="block mt-3">
          <Button size="sm" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90">
            Book appointment
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
