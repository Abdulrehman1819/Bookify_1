'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { useBooking } from '@/hooks/useBooking'
import { useAvailableSlots } from '@/hooks/useAvailability'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Staff, Service, BusinessBranch } from '@/types'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface BookingWizardProps {
  staff: Staff & { staff_services?: { services?: Service }[] }
  branch: BusinessBranch
  businessSlug: string
}

const STEPS = ['Services', 'Date', 'Time', 'Confirm']

export function BookingWizard({ staff, branch, businessSlug }: BookingWizardProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { state, toggleService, setDate, setSlot, setStep, totalPrice, totalDuration } = useBooking()
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')

  const services = (staff.staff_services?.map(ss => ss.services).filter(Boolean) as Service[]) || []
  const dateStr = state.selectedDate ? format(new Date(state.selectedDate), 'yyyy-MM-dd') : ''
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(
    staff.id,
    dateStr,
    state.selectedServices.map(s => s.id)
  )

  const handleSubmit = async () => {
    if (!profile) {
      router.push(`/login?redirect=/b/${businessSlug}/staff/${staff.id}`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          branch_id: branch.id,
          booking_date: dateStr,
          start_time: state.selectedSlot,
          service_ids: state.selectedServices.map(s => s.id),
          notes,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Booking failed')
      }
      toast({ title: 'Booking confirmed!', description: 'Check your bookings for details.' })
      router.push('/customer/bookings')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                i + 1 < state.step ? 'bg-emerald-500 text-white' :
                i + 1 === state.step ? 'bg-[#6366F1] text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i + 1 < state.step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i + 1 === state.step ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Services */}
      {state.step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Select services</h2>
          {services.length === 0 && <p className="text-[#94A3B8]">No services available for this staff member.</p>}
          <div className="space-y-3">
            {services.map(s => {
              const selected = state.selectedServices.some(sel => sel.id === s.id)
              return (
                <Card key={s.id} className={`cursor-pointer transition-colors rounded-xl ${selected ? 'border-[#6366F1] ring-1 ring-[#6366F1]' : ''}`} onClick={() => toggleService(s)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Checkbox checked={selected} onCheckedChange={() => toggleService(s)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-[#94A3B8]">{s.duration_minutes} min</p>
                    </div>
                    <span className="font-semibold text-[#1E293B] shrink-0">PKR {Number(s.price).toLocaleString()}</span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {state.selectedServices.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-[#6366F1]/5 flex items-center justify-between">
              <span className="text-sm text-[#1E293B]">{state.selectedServices.length} service(s) · {totalDuration} min</span>
              <span className="font-semibold text-[#6366F1]">PKR {totalPrice.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date */}
      {state.step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Choose a date</h2>
          <div className="flex justify-center overflow-x-auto">
            <DayPicker
              mode="single"
              selected={state.selectedDate ? new Date(state.selectedDate) : undefined}
              onSelect={d => d && setDate(format(d, 'yyyy-MM-dd'))}
              fromDate={new Date()}
              className="rounded-2xl border p-3 sm:p-4 bg-white"
            />
          </div>
        </div>
      )}

      {/* Step 3: Time slot */}
      {state.step === 3 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Pick a time</h2>
          <p className="text-sm text-[#94A3B8] mb-4">{format(new Date(state.selectedDate), 'EEEE, MMMM d')}</p>
          {slotsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]" />
            </div>
          ) : !slots || slots.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#1E293B] font-medium">No slots on this day</p>
              <p className="text-sm text-[#94A3B8] mt-1">This staff member is off. Try a different date.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 text-xs text-[#94A3B8] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
                  Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#6366F1] inline-block" />
                  Selected
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(slot => {
                  const isSelected = state.selectedSlot === slot.time
                  if (slot.booked) {
                    return (
                      <div
                        key={slot.time}
                        className="py-2 px-2 rounded-lg text-sm font-medium border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed text-center select-none"
                      >
                        <span className="line-through">{slot.time}</span>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSlot(slot.time)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-[#6366F1] text-white border-[#6366F1] shadow-sm'
                          : 'bg-white border-gray-200 hover:border-[#6366F1] hover:text-[#6366F1] hover:bg-[#6366F1]/5'
                      }`}
                    >
                      {slot.time}
                    </button>
                  )
                })}
              </div>
              {slots.every(s => s.booked) && (
                <p className="text-center text-sm text-[#94A3B8] mt-4">All slots are booked for this day. Try another date.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {state.step === 4 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Confirm booking</h2>
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm gap-2">
                <span className="text-[#94A3B8] shrink-0">Staff</span>
                <span className="font-medium text-right">{staff.name}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-[#94A3B8] shrink-0">Branch</span>
                <span className="font-medium text-right">{branch.name}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-[#94A3B8] shrink-0">Date</span>
                <span className="font-medium text-right">{format(new Date(state.selectedDate), 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-[#94A3B8] shrink-0">Time</span>
                <span className="font-medium text-right">{state.selectedSlot}</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-[#94A3B8] mb-2">Services</p>
                {state.selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm mb-1 gap-2">
                    <span className="min-w-0 truncate">{s.name} <span className="text-[#94A3B8]">({s.duration_minutes} min)</span></span>
                    <span className="shrink-0">PKR {Number(s.price).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t gap-2">
                  <span>Total</span>
                  <span className="text-[#6366F1]">PKR {totalPrice.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-[#94A3B8] block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                  rows={3}
                  placeholder="Any special requests…"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {state.step > 1 && (
          <Button variant="outline" onClick={() => setStep(state.step - 1)} className="flex-1">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        {state.step < 4 ? (
          <Button
            className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
            onClick={() => setStep(state.step + 1)}
            disabled={
              (state.step === 1 && state.selectedServices.length === 0) ||
              (state.step === 2 && !state.selectedDate) ||
              (state.step === 3 && !state.selectedSlot)
            }
          >
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Booking…' : profile ? 'Confirm booking' : 'Sign in to book'}
          </Button>
        )}
      </div>
    </div>
  )
}
