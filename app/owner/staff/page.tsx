'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { OwnerSidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Calendar, Trash2, Settings2, Clock } from 'lucide-react'

interface ServiceItem { id: string; name: string; duration_minutes: number; price: number }
interface StaffService { service_id: string; services: ServiceItem | null }
interface Branch { id: string; name: string }
interface StaffMember {
  id: string; name: string; title: string | null; bio: string | null
  avatar_url: string | null; branch_id: string
  staff_services: StaffService[]
}

export default function StaffPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [allServices, setAllServices] = useState<ServiceItem[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', title: '', bio: '', branch_id: '' })
  const [saving, setSaving] = useState(false)

  const [managingStaff, setManagingStaff] = useState<StaffMember | null>(null)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [savingServices, setSavingServices] = useState(false)

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
    const [sr, br, svcr] = await Promise.all([
      fetch(`/api/businesses/${bId}/staff`).then(r => r.json()),
      fetch(`/api/businesses/${bId}/branches`).then(r => r.json()),
      fetch(`/api/businesses/${bId}/services`).then(r => r.json()),
    ])
    setStaff(sr.staff || [])
    setBranches(br.branches || [])
    setAllServices(svcr.services || [])
  }

  const handleAddStaff = async () => {
    if (!businessId || !form.branch_id) { toast({ title: 'Select a branch', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to add staff')
      setAddOpen(false)
      setForm({ name: '', title: '', bio: '', branch_id: '' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm('Remove this staff member?')) return
    await fetch(`/api/businesses/${businessId}/staff/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const openManageServices = (s: StaffMember) => {
    setManagingStaff(s)
    setAssignedIds(new Set(s.staff_services.map(ss => ss.service_id)))
  }

  const toggleService = (id: string) => {
    setAssignedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveServices = async () => {
    if (!managingStaff || !businessId) return
    setSavingServices(true)
    try {
      const currentIds = new Set(managingStaff.staff_services.map(ss => ss.service_id))
      const toAdd = [...assignedIds].filter(id => !currentIds.has(id))
      const toRemove = [...currentIds].filter(id => !assignedIds.has(id))

      const ops: Promise<Response>[] = []
      if (toAdd.length > 0) {
        ops.push(fetch(`/api/businesses/${businessId}/staff/${managingStaff.id}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceIds: toAdd }),
        }))
      }
      for (const serviceId of toRemove) {
        ops.push(fetch(`/api/businesses/${businessId}/staff/${managingStaff.id}/services?serviceId=${serviceId}`, {
          method: 'DELETE',
        }))
      }
      await Promise.all(ops)

      toast({ title: 'Services updated' })
      setManagingStaff(null)
      fetchData()
    } catch {
      toast({ title: 'Failed to update services', variant: 'destructive' })
    } finally { setSavingServices(false) }
  }

  if (loading || !profile) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <OwnerSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1E293B]">Staff</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Senior Stylist" /></div>
                <div className="space-y-1"><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select value={form.branch_id} onValueChange={v => setForm(p => ({ ...p, branch_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleAddStaff} disabled={saving || !form.name}>
                  {saving ? 'Saving…' : 'Add staff'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {staff.length === 0 ? (
          <p className="text-[#94A3B8]">No staff yet. Add your first team member.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(s => {
              const branch = branches.find(b => b.id === s.branch_id)
              const assignedServices = s.staff_services.map(ss => ss.services).filter(Boolean) as ServiceItem[]
              return (
                <Card key={s.id} className="rounded-2xl shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 rounded-xl flex-shrink-0">
                        <AvatarImage src={s.avatar_url || ''} />
                        <AvatarFallback className="rounded-xl bg-[#6366F1]/10 text-[#6366F1]">{s.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#1E293B]">{s.name}</h3>
                        {s.title && <p className="text-xs text-[#94A3B8]">{s.title}</p>}
                        {branch && <Badge variant="secondary" className="text-xs mt-1">{branch.name}</Badge>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-[#6366F1]"
                          title="Manage services"
                          onClick={() => openManageServices(s)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Link href={`/owner/staff/${s.id}/schedule`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Calendar className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Assigned services */}
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-[#94A3B8] mb-2">Services</p>
                      {assignedServices.length === 0 ? (
                        <button
                          className="text-xs text-[#6366F1] hover:underline"
                          onClick={() => openManageServices(s)}
                        >
                          + Assign services
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedServices.map(svc => (
                            <span
                              key={svc.id}
                              className="inline-flex items-center gap-1 text-xs bg-[#6366F1]/10 text-[#6366F1] rounded-full px-2 py-0.5"
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {svc.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Manage services dialog */}
      <Dialog open={!!managingStaff} onOpenChange={open => { if (!open) setManagingStaff(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Services for {managingStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {allServices.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No services found. Add services first from the Services page.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allServices.map(svc => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer border border-transparent hover:border-gray-100 transition-colors"
                  >
                    <Checkbox
                      checked={assignedIds.has(svc.id)}
                      onCheckedChange={() => toggleService(svc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E293B]">{svc.name}</p>
                      <p className="text-xs text-[#94A3B8]">{svc.duration_minutes} min · PKR {Number(svc.price).toLocaleString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setManagingStaff(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
                onClick={handleSaveServices}
                disabled={savingServices || allServices.length === 0}
              >
                {savingServices ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
