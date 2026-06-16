'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerShell } from '@/components/layout/OwnerShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react'

interface Service { id: string; name: string; duration_minutes: number; price: number; currency: string; description: string | null }

export default function ServicesPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState({ name: '', duration_minutes: '30', price: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!profile) router.replace('/login')
      else if (profile.role !== 'SHOP_OWNER') router.replace('/')
      else fetchData()
    }
  }, [profile, loading])

  const fetchData = async () => {
    const res = await fetch('/api/auth/me')
    const me = await res.json()
    const bId = me.business?.id
    if (!bId) return
    setBusinessId(bId)
    const sres = await fetch(`/api/businesses/${bId}/services`)
    const data = await sres.json()
    setServices(data.services || [])
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', duration_minutes: '30', price: '', description: '' }); setOpen(true) }
  const openEdit = (s: Service) => { setEditing(s); setForm({ name: s.name, duration_minutes: String(s.duration_minutes), price: String(s.price), description: s.description || '' }); setOpen(true) }

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      const body = { name: form.name, duration_minutes: Number(form.duration_minutes), price: Number(form.price), description: form.description }
      const url = editing ? `/api/businesses/${businessId}/services/${editing.id}` : `/api/businesses/${businessId}/services`
      const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to save')
      setOpen(false)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm('Delete this service?')) return
    await fetch(`/api/businesses/${businessId}/services/${id}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading || !profile) return null

  return (
    <OwnerShell>
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-[#1E293B]">Services</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-lg">
              <DialogHeader><DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1"><Label>Service name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Price (PKR)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {services.length === 0 ? (
          <p className="text-[#94A3B8]">No services yet. Add your first service.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
              <Card key={s.id} className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 mr-2">
                      <h3 className="font-semibold text-[#1E293B]">{s.name}</h3>
                      {s.description && <p className="text-xs text-[#94A3B8] mt-0.5">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
                        <span className="font-semibold text-[#6366F1] text-sm">PKR {Number(s.price).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </OwnerShell>
  )
}
