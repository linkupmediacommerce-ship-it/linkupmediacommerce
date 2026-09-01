export type User = {
  id: number
  email: string
  name: string
  phone: string | null
  is_admin: boolean
}

export type Showroom = {
  id: number
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
  end_time: string
  capacity: number
  reserved_count: number
  remaining: number
  is_available: boolean
}

export type AdminTimeSlot = {
  id: number
  slot_date: string
  start_time: string
  end_time: string
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
  end_time: string
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
  end_time: string
}

export type AdminUser = {
  id: number
  email: string
  name: string
  phone: string | null
  is_admin: boolean
  created_at: string
  reservation_count: number
}
