'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginForm({ redirectAfter }: { redirectAfter?: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_complete')
        .eq('id', authData.user.id)
        .single()

      const role = profile?.role ?? 'CUSTOMER'
      const onboardingComplete = profile?.onboarding_complete ?? false

      if (redirectAfter) {
        window.location.href = redirectAfter
      } else if (role === 'SHOP_OWNER') {
        window.location.href = onboardingComplete ? '/owner/dashboard' : '/owner/onboarding'
      } else if (role === 'WORKER') {
        window.location.href = '/worker/calendar'
      } else {
        window.location.href = '/'
      }
    } catch (err: unknown) {
      toast({ title: 'Login failed', description: friendlyAuthError(err), variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
