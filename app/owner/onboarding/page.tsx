'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Check } from 'lucide-react'

const STEPS = ['Branch', 'Services', 'Staff', 'Done']

export default function OnboardingPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [branch, setBranch] = useState({ name: '', city: '', area: '', address: '', phone: '' })
  const [service, setService] = useState({ name: '', duration_minutes: 30, price: '' })
  const [staffMember, setStaffMember] = useState({ name: '', title: '', bio: '' })

  const fetchBusiness = async () => {
    const res = await fetch('/api/auth/me')
    const json = await res.json()
    return json.business_id
  }

  const handleSkip = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finishOnboarding()
  }

  const finishOnboarding = async () => {
    await fetch('/api/onboarding', { method: 'POST' })
    router.push('/owner/dashboard')
  }

  const handleBranch = async () => {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me')
      const me = await meRes.json()
      const bId = me.business?.id
      if (!bId) throw new Error('Business not found')
      setBusinessId(bId)

      const res = await fetch(`/api/businesses/${bId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setBranchId(json.branch?.id)
      setStep(1)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleService = async () => {
    if (!businessId) { setStep(2); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...service, duration_minutes: Number(service.duration_minutes), price: Number(service.price) }),
      })
      if (!res.ok) throw new Error('Failed to create service')
      setStep(2)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleStaff = async () => {
    if (!businessId || !branchId) { setStep(3); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staffMember, branch_id: branchId }),
      })
      if (!res.ok) throw new Error('Failed to create staff')
      setStep(3)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <div className="container max-w-lg">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-[#6366F1]">Bookify</span>
          <h1 className="text-xl font-bold text-[#1E293B] mt-2">Let&apos;s set up your business</h1>
          <p className="text-sm text-[#94A3B8]">You can skip any step and fill it in later.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#6366F1] text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-200 hidden sm:block" />}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            {/* Step 0: Branch */}
            {step === 0 && (
              <div className="space-y-4">
                <div><h2 className="font-semibold text-lg">Add your first branch</h2><p className="text-sm text-[#94A3B8]">Where is your business located?</p></div>
                <div className="space-y-1"><Label>Branch name</Label><Input value={branch.name} onChange={e => setBranch(p => ({ ...p, name: e.target.value }))} placeholder="Main Branch" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>City</Label><Input value={branch.city} onChange={e => setBranch(p => ({ ...p, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Area</Label><Input value={branch.area} onChange={e => setBranch(p => ({ ...p, area: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>Address</Label><Input value={branch.address} onChange={e => setBranch(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={branch.phone} onChange={e => setBranch(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleSkip}>Skip</Button>
                  <Button className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleBranch} disabled={loading || !branch.name || !branch.city}>
                    {loading ? 'Saving…' : 'Save & continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Service */}
            {step === 1 && (
              <div className="space-y-4">
                <div><h2 className="font-semibold text-lg">Add your first service</h2><p className="text-sm text-[#94A3B8]">What services do you offer?</p></div>
                <div className="space-y-1"><Label>Service name</Label><Input value={service.name} onChange={e => setService(p => ({ ...p, name: e.target.value }))} placeholder="Haircut" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={service.duration_minutes} onChange={e => setService(p => ({ ...p, duration_minutes: Number(e.target.value) }))} /></div>
                  <div className="space-y-1"><Label>Price (PKR)</Label><Input type="number" value={service.price} onChange={e => setService(p => ({ ...p, price: e.target.value }))} /></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleSkip}>Skip</Button>
                  <Button className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleService} disabled={loading || !service.name}>
                    {loading ? 'Saving…' : 'Save & continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Staff */}
            {step === 2 && (
              <div className="space-y-4">
                <div><h2 className="font-semibold text-lg">Add your first staff member</h2><p className="text-sm text-[#94A3B8]">Who will be taking bookings?</p></div>
                <div className="space-y-1"><Label>Name</Label><Input value={staffMember.name} onChange={e => setStaffMember(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Title</Label><Input value={staffMember.title} onChange={e => setStaffMember(p => ({ ...p, title: e.target.value }))} placeholder="Senior Stylist" /></div>
                <div className="space-y-1"><Label>Bio</Label><Textarea value={staffMember.bio} onChange={e => setStaffMember(p => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleSkip}>Skip</Button>
                  <Button className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={handleStaff} disabled={loading || !staffMember.name}>
                    {loading ? 'Saving…' : 'Finish setup'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1E293B]">You&apos;re all set!</h2>
                <p className="text-[#94A3B8]">Your business is ready. Head to your dashboard to manage bookings.</p>
                <Button className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90" onClick={finishOnboarding}>
                  Go to dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
