'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerSidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react'

interface Branch { id: string; name: string; city: string; area: string | null; address: string | null; phone: string | null }

export default function BranchesPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', city: '', area: '', address: '', phone: '' })
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
    const bres = await fetch(`/api/businesses/${bId}/branches`)
    const data = await bres.json()
    setBranches(data.branches || [])
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', city: '', area: '', address: '', phone: '' }); setOpen(true) }
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, city: b.city, area: b.area || '', address: b.address || '', phone: b.phone || '' }); setOpen(true) }

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      const url = editing ? `/api/businesses/${businessId}/branches/${editing.id}` : `/api/businesses/${businessId}/branches`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to save')
      setOpen(false)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm('Delete this branch?')) return
    await fetch(`/api/businesses/${businessId}/branches/${id}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading || !profile) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <OwnerSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1E293B]">Branches</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit branch' : 'Add branch'}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Area</Label><Input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleSave} disabled={saving || !form.name || !form.city}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {branches.length === 0 ? (
          <p className="text-[#94A3B8]">No branches yet. Add your first branch.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => (
              <Card key={b.id} className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1E293B]">{b.name}</h3>
                      <p className="text-sm text-[#94A3B8] flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />{b.area ? `${b.area}, ` : ''}{b.city}
                      </p>
                      {b.address && <p className="text-xs text-[#94A3B8] mt-1">{b.address}</p>}
                      {b.phone && <p className="text-xs text-[#94A3B8] mt-1">{b.phone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
