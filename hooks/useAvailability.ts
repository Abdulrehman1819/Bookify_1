'use client'

import { useQuery } from '@tanstack/react-query'
import { Slot } from '@/lib/slotCalculator'

export function useAvailableSlots(staffId: string, date: string, serviceIds: string[]) {
  return useQuery({
    queryKey: ['slots', staffId, date, serviceIds],
    queryFn: async () => {
      if (!date || !staffId) return [] as Slot[]
      const params = new URLSearchParams({ date })
      serviceIds.forEach(id => params.append('serviceIds[]', id))
      const res = await fetch(`/api/staff/${staffId}/availability/slots?${params}`)
      if (!res.ok) throw new Error('Failed to fetch slots')
      const json = await res.json()
      return json.slots as Slot[]
    },
    enabled: !!staffId && !!date,
  })
}

export function useWorkingHours(staffId: string) {
  return useQuery({
    queryKey: ['working-hours', staffId],
    queryFn: async () => {
      const res = await fetch(`/api/staff/${staffId}/availability/working-hours`)
      if (!res.ok) throw new Error('Failed to fetch working hours')
      const json = await res.json()
      return json.working_hours
    },
    enabled: !!staffId,
  })
}
