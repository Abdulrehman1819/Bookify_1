'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerSidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface BusinessData { id: string; name: string; description: string | null; business_type: string; city: string; area: string | null; address: string | null }

export default function OwnerSettingsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [form, setForm] = useState({ name: '', description: '', business_type: '', city: '', area: '', address: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'SHOP_OWNER') router.replace('/')
      else fetchData()
    }
  }, [profile, loading])

  const fetchData = async () => {
    const me = await fetch('/api/auth/me').then(r => r.json())
    const b = me.business
    if (!b) return
    setBusiness(b)
    setForm({ name: b.name, description: b.description || '', business_type: b.business_type, city: b.city, area: b.area || '', address: b.address || '' })
  }

  const handleSave = async () => {
    if (!business) return
    setSaving(true)
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Settings saved' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  if (loading || !profile) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <OwnerSidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Business Settings</h1>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>Business name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Business type</Label>
              <Select value={form.business_type} onValueChange={v => setForm(p => ({ ...p, business_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Area</Label><Input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
