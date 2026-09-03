export type Role = 'user' | 'brand_admin' | 'super_admin'

export type User = {
  id: number
  email: string
  name: string
  phone: string | null
  is_admin: boolean
  role: Role
  brand_id: number | null
}

export type Brand = {
  id: number
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  is_active: number
  created_at: string
  showroom_count?: number
}

export type Showroom = {
  id: number
  brand_id: number
  brand_name?: string
  brand_slug?: string
  name: string
  address: string
  description: string | null
  image_url: string | null
  is_active?: number
}

export type TimeSlot = {
  id: number
  slot_date: string
  start_time: string
  capacity: number
  reserved_count: number
  remaining: number
  is_available: boolean
}

export type AdminTimeSlot = {
  id: number
  slot_date: string
  start_time: string
  is_active: number
  capacity: number
  reserved_count: number
}

export type MyReservation = {
  id: number
  status: 'confirmed' | 'cancelled'
  memo: string | null
  created_at: string
  showroom_id: number
  showroom_name: string
  showroom_address: string
  slot_date: string
  start_time: string
}

export type AdminReservation = {
  id: number
  status: 'confirmed' | 'cancelled'
  memo: string | null
  created_at: string
  user_id: number
  user_name: string
  user_email: string
  user_phone: string | null
  showroom_id: number
  showroom_name: string
  time_slot_id: number
  slot_date: string
  start_time: string
}

export type AdminUser = {
  id: number
  email: string
  name: string
  phone: string | null
  is_admin: boolean
  role: Role
  brand_id: number | null
  created_at: string
  reservation_count: number
}
