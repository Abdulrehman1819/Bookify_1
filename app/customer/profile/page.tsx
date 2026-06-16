'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

export default function CustomerProfilePage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: errPw } } = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else reset({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone || '' })
    }
  }, [profile, loading])

  const onProfile = async (data: ProfileData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
    setSaving(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else toast({ title: 'Profile updated' })
  }

  const onPassword = async (data: PasswordData) => {
    setSavingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    setSavingPw(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Password updated' }); resetPw() }
  }

  if (loading || !profile) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-[#F8FAFC] py-8 px-4">
        <div className="container max-w-lg space-y-6">
          <h1 className="text-2xl font-bold text-[#1E293B]">My Profile</h1>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First name</Label>
                    <Input {...register('first_name')} />
                    {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Last name</Label>
                    <Input {...register('last_name')} />
                    {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="opacity-60" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input {...register('phone')} type="tel" />
                </div>
                <Button type="submit" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handlePw(onPassword)} className="space-y-4">
                <div className="space-y-1">
                  <Label>New password</Label>
                  <Input type="password" {...regPw('password')} />
                  {errPw.password && <p className="text-xs text-destructive">{errPw.password.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Confirm password</Label>
                  <Input type="password" {...regPw('confirm')} />
                  {errPw.confirm && <p className="text-xs text-destructive">{errPw.confirm.message}</p>}
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={savingPw}>
                  {savingPw ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
