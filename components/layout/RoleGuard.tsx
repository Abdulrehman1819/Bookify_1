'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  redirectTo?: string
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, redirectTo = '/', children }: RoleGuardProps) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (!allowedRoles.includes(profile.role)) router.replace(redirectTo)
    }
  }, [profile, loading])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" /></div>
  if (!profile || !allowedRoles.includes(profile.role)) return null
  return <>{children}</>
}
