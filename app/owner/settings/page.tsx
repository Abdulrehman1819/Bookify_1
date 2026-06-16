'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OwnerShell } from '@/components/layout/OwnerShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ImagePlus, Upload, Camera } from 'lucide-react'

interface BusinessData {
  id: string
  name: string
  description: string | null
  business_type: string
  city: string
  area: string | null
  address: string | null
  cover_image_url: string | null
  logo_url: string | null
}

export default function OwnerSettingsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [form, setForm] = useState({ name: '', description: '', business_type: '', city: '', area: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
    setCoverUrl(b.cover_image_url || null)
    setLogoUrl(b.logo_url || null)
    setForm({ name: b.name, description: b.description || '', business_type: b.business_type, city: b.city, area: b.area || '', address: b.address || '' })
  }

  const handleUpload = async (file: File, type: 'cover' | 'logo') => {
    if (!business) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5 MB.', variant: 'destructive' })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' })
      return
    }

    type === 'cover' ? setUploadingCover(true) : setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${business.id}/${type}-${Date.now()}.${ext}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)

      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const json = await uploadRes.json()
        throw new Error(json.error || 'Upload failed')
      }
      const { url: publicUrl } = await uploadRes.json()

      const field = type === 'cover' ? 'cover_image_url' : 'logo_url'
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: publicUrl }),
      })
      if (!res.ok) throw new Error('Failed to save image URL')

      if (type === 'cover') setCoverUrl(publicUrl)
      else setLogoUrl(publicUrl)

      toast({ title: type === 'cover' ? 'Cover photo updated!' : 'Logo updated!' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    } finally {
      type === 'cover' ? setUploadingCover(false) : setUploadingLogo(false)
    }
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
    <OwnerShell>
      <div className="p-4 lg:p-8 max-w-2xl">
        <h1 className="text-xl lg:text-2xl font-bold text-[#1E293B] mb-6">Business Settings</h1>

        {/* Cover Photo */}
        <Card className="rounded-2xl shadow-sm mb-6 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cover Photo</CardTitle>
            <p className="text-xs text-[#94A3B8]">Shown at the top of your public business page. Recommended 1200×400 px, max 5 MB.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className="relative h-40 sm:h-52 rounded-xl overflow-hidden cursor-pointer group bg-gradient-to-br from-[#6366F1]/20 to-[#6366F1]/5"
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
              role="button"
              aria-label="Upload cover photo"
            >
              {coverUrl && (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              )}
              {!coverUrl && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[#94A3B8] pointer-events-none">
                  <ImagePlus className="h-8 w-8" />
                  <p className="text-sm font-medium">Click to upload cover photo</p>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {uploadingCover ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-white" />
                    <span className="text-sm font-medium text-white">{coverUrl ? 'Change photo' : 'Upload photo'}</span>
                  </>
                )}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'cover'); e.target.value = '' }}
            />
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="rounded-2xl shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Logo</CardTitle>
            <p className="text-xs text-[#94A3B8]">Square image displayed on your profile and search results. Max 5 MB.</p>
          </CardHeader>
          <CardContent className="pt-0 flex items-center gap-5">
            <div
              className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer group shrink-0 flex items-center justify-center"
              onClick={() => !uploadingLogo && logoInputRef.current?.click()}
              role="button"
              aria-label="Upload logo"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="h-7 w-7 text-[#CBD5E1]" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                {uploadingLogo
                  ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  : <Camera className="h-5 w-5 text-white" />
                }
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1E293B]">
                {logoUrl ? 'Logo uploaded' : 'No logo yet'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-0.5">PNG or JPG, square format works best</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
              </Button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'logo'); e.target.value = '' }}
            />
          </CardContent>
        </Card>

        {/* Business Details */}
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
      </div>
    </OwnerShell>
  )
}
