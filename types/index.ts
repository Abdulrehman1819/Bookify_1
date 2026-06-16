export type UserRole = 'SUPER_ADMIN' | 'SHOP_OWNER' | 'WORKER' | 'CUSTOMER'
export type BusinessType = 'SALOON' | 'CLINIC' | 'GYM' | 'SPA' | 'OTHER'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface Profile {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  business_type: BusinessType
  city: string
  area: string | null
  address: string | null
  country: string
  logo_url: string | null
  cover_image_url: string | null
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessBranch {
  id: string
  business_id: string
  name: string
  city: string
  area: string | null
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  business_id: string
  branch_id: string
  name: string
  title: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffService {
  id: string
  staff_id: string
  service_id: string
}

export interface WorkingHours {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_off: boolean
}

export interface StaffBreak {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  label: string | null
}

export interface StaffLeave {
  id: string
  staff_id: string
  date: string
  reason: string | null
  created_at: string
}

export interface Booking {
  id: string
  customer_id: string
  staff_id: string
  branch_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BookingService {
  id: string
  booking_id: string
  service_id: string
  duration_minutes: number
  price: number
}

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  business_id: string
  staff_id: string
  rating: number
  comment: string | null
  created_at: string
}

// Extended types with relations
export interface BookingWithRelations extends Booking {
  staff?: Staff
  business_branches?: BusinessBranch
  booking_services?: (BookingService & { services?: Service })[]
  profiles?: Profile
}

export interface StaffWithRelations extends Staff {
  staff_services?: (StaffService & { services?: Service })[]
  working_hours?: WorkingHours[]
}

export interface BusinessWithRelations extends Business {
  business_branches?: BusinessBranch[]
  staff?: StaffWithRelations[]
}
