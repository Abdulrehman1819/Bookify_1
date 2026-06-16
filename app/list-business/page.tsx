'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  name: z.string().min(2, 'Business name required'),
  businessType: z.enum(['SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER']),
  city: z.string().min(2, 'City required'),
  area: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7)
}

export default function ListBusinessPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login?redirect=/list-business'
      } else {
        setIsLoggedIn(true)
        setAuthChecked(true)
      }
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/list-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, slug: slugify(data.name) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to list business')
      window.location.href = '/owner/onboarding'
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="py-12 px-4">
        <div className="container max-w-lg">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>List your business</CardTitle>
              <CardDescription>Fill in your business details to get started. You can add more later.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label>Business name</Label>
                  <Input {...register('name')} placeholder="e.g. Scissors & Co." />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label>Business type</Label>
                  <Select onValueChange={v => setValue('businessType', v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER'].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessType && <p className="text-xs text-destructive">{errors.businessType.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input {...register('city')} placeholder="Lahore" />
                    {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Area (optional)</Label>
                    <Input {...register('area')} placeholder="DHA" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Address (optional)</Label>
                  <Input {...register('address')} placeholder="Street address" />
                </div>

                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Textarea {...register('description')} placeholder="Tell customers about your business…" rows={3} />
                </div>

                <Button type="submit" className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create business'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
