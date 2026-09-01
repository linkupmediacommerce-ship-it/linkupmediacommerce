export type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
}

export type JwtPayload = {
  sub: number // user id
  email: string
  name: string
  is_admin: boolean
  exp: number
}

export type User = {
  id: number
  email: string
  password_hash: string
  name: string
  phone: string | null
  is_admin: number
  created_at: string
}

export type Showroom = {
  id: number
  name: string
  address: string
  description: string | null
  image_url: string | null
  is_active: number
  created_at: string
}

export type TimeSlot = {
  id: number
  showroom_id: number
  slot_date: string
  start_time: string
  is_active: number
  created_at: string
}

export type Reservation = {
  id: number
  user_id: number
  showroom_id: number
  time_slot_id: number
  status: string
  memo: string | null
  created_at: string
  updated_at: string
}
