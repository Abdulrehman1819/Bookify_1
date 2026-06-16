interface WorkingHoursInput {
  start_time: string
  end_time: string
  is_off: boolean
}

interface TimeRange {
  start_time: string
  end_time: string
}

interface SlotCalculatorInput {
  workingHours: WorkingHoursInput
  isLeaveDay: boolean
  existingBookings: TimeRange[]
  breaks: TimeRange[]
  totalDuration: number
  slotInterval?: number
}

export interface Slot {
  time: string
  booked: boolean
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}

export function calculateAllSlots({
  workingHours,
  isLeaveDay,
  existingBookings,
  breaks,
  totalDuration,
  slotInterval = 15,
}: SlotCalculatorInput): Slot[] {
  if (isLeaveDay || workingHours.is_off) return []

  const dayStart = timeToMinutes(workingHours.start_time)
  const dayEnd = timeToMinutes(workingHours.end_time)
  const slots: Slot[] = []

  for (let t = dayStart; t + totalDuration <= dayEnd; t += slotInterval) {
    const slotEnd = t + totalDuration

    // Break slots are blocked entirely — don't show them
    const conflictsWithBreak = breaks.some(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return overlaps(t, slotEnd, bStart, bEnd)
    })
    if (conflictsWithBreak) continue

    const conflictsWithBooking = existingBookings.some(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return overlaps(t, slotEnd, bStart, bEnd)
    })

    slots.push({ time: minutesToTime(t), booked: conflictsWithBooking })
  }

  return slots
}

// Kept for any internal callers that only need available times
export function calculateAvailableSlots(input: SlotCalculatorInput): string[] {
  return calculateAllSlots(input).filter(s => !s.booked).map(s => s.time)
}
