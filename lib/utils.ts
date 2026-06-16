import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function friendlyAuthError(err: unknown): string {
  const raw = (err as any)?.message
  if (!raw || typeof raw !== 'string' || raw === '{}' || raw.trim() === '') {
    return 'Something went wrong. Please try again.'
  }
  const m = raw.toLowerCase()
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Please log in instead.'
  }
  if (m.includes('email rate limit') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'Incorrect email or password. Please check and try again.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email address first. Check your inbox for a confirmation link.'
  }
  if (m.includes('password should be') || m.includes('password must be')) {
    return 'Password must be at least 6 characters.'
  }
  if (
    m.includes('database error') ||
    m.includes('unexpected_failure') ||
    m.includes('internal server error') ||
    m.includes('500') ||
    raw.startsWith('{')
  ) {
    return 'A server error occurred. Please try again in a moment.'
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return raw
}

export function friendlyDbError(message: string, context?: string): string {
  const m = message.toLowerCase()
  if (m.includes('foreign key') || m.includes('_fkey')) {
    if (m.includes('owner_id')) return 'Your account profile is not set up yet. Please log out, log back in, and try again.'
    if (m.includes('business_id')) return 'The selected business could not be found. Please refresh and try again.'
    if (m.includes('branch_id')) return 'The selected branch could not be found. Please refresh and try again.'
    if (m.includes('staff_id')) return 'The selected staff member could not be found. Please refresh and try again.'
    if (m.includes('service_id')) return 'The selected service could not be found. Please refresh and try again.'
    if (m.includes('customer_id')) return 'Your account could not be found. Please log out and log back in.'
    return 'A reference to a required record is missing. Please refresh and try again.'
  }
  if (m.includes('unique') || m.includes('duplicate key')) {
    if (m.includes('slug')) return 'A business with a very similar name already exists. Please use a slightly different name.'
    if (m.includes('email')) return 'This email address is already registered.'
    if (m.includes('phone')) return 'This phone number is already in use.'
    if (context === 'booking') return 'This time slot is no longer available. Please choose a different time.'
    return 'This record already exists. Please check your input and try again.'
  }
  if (m.includes('not null') || m.includes('null value')) {
    return 'Some required information is missing. Please fill in all required fields.'
  }
  if (m.includes('check constraint') || m.includes('violates check')) {
    return 'The value you entered is not allowed. Please check your input.'
  }
  if (m.includes('permission denied') || m.includes('rls') || m.includes('row-level')) {
    return 'You do not have permission to perform this action.'
  }
  if (context === 'booking') return 'Booking failed. Please try again or choose a different time.'
  if (context === 'business') return 'Failed to save business details. Please try again.'
  if (context === 'staff') return 'Failed to save staff details. Please try again.'
  if (context === 'service') return 'Failed to save service details. Please try again.'
  if (context === 'branch') return 'Failed to save branch details. Please try again.'
  return 'Something went wrong. Please try again.'
}
