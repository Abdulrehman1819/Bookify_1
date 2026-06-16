'use client'

import { useState } from 'react'
import { Service } from '@/types'

export interface BookingState {
  selectedServices: Service[]
  selectedDate: string
  selectedSlot: string
  step: number
}

export function useBooking() {
  const [state, setState] = useState<BookingState>({
    selectedServices: [],
    selectedDate: '',
    selectedSlot: '',
    step: 1,
  })

  const toggleService = (service: Service) => {
    setState(prev => {
      const exists = prev.selectedServices.find(s => s.id === service.id)
      return {
        ...prev,
        selectedServices: exists
          ? prev.selectedServices.filter(s => s.id !== service.id)
          : [...prev.selectedServices, service],
      }
    })
  }

  const setDate = (date: string) => setState(prev => ({ ...prev, selectedDate: date, selectedSlot: '' }))
  const setSlot = (slot: string) => setState(prev => ({ ...prev, selectedSlot: slot }))
  const setStep = (step: number) => setState(prev => ({ ...prev, step }))

  const totalPrice = state.selectedServices.reduce((sum, s) => sum + Number(s.price), 0)
  const totalDuration = state.selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)

  return { state, toggleService, setDate, setSlot, setStep, totalPrice, totalDuration }
}
