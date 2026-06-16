'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/utils'
import { Mail, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export function RegisterForm({ redirectAfter = '/' }: { redirectAfter?: string }) {
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const { toast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone ?? '',
            role: 'CUSTOMER',
          },
        },
      })
      if (error) throw error

      if (!authData.session) {
        setVerificationEmail(data.email)
        setVerificationSent(true)
        return
      }

      window.location.href = redirectAfter
    } catch (err: unknown) {
      toast({ title: 'Sign up failed', description: friendlyAuthError(err), variant: 'destructive' })
      setLoading(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#6366F1]/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-[#6366F1]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#1E293B]">Check your inbox</h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium text-[#1E293B] mt-0.5">{verificationEmail}</p>
        </div>
        <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
          Click the link in the email to activate your account. Check your spam folder if you don't see it.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => { setVerificationSent(false); setLoading(false) }}
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" type="tel" {...register('phone')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
