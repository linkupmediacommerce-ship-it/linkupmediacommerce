export type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
  KAKAO_CLIENT_ID?: string
  KAKAO_CLIENT_SECRET?: string
  KAKAO_REDIRECT_URI?: string
}

// role: 'user' (regular member) | 'brand_admin' (scoped to brand_id) | 'super_admin' (platform-wide)
export type Role = 'user' | 'brand_admin' | 'super_admin'

// auth_provider: 'local' (email+password signup) | 'kakao' | 'naver' | 'google' (SNS login)
export type AuthProvider = 'local' | 'kakao' | 'naver' | 'google'

export type JwtPayload = {
  sub: number // user id
  // Always set (SNS accounts without a real email get a synthetic placeholder --
  // see utils/sns.ts -- so the DB column stays NOT NULL); use isPlaceholderEmail()
  // wherever this is shown to a human.
  email: string
  name: string
  is_admin: boolean // legacy flag, kept for backward-compat; true only for super_admin
  role: Role
  brand_id: number | null // set only for brand_admin
  exp: number
}

export type User = {
  id: number
  email: string
  password_hash: string
  name: string
  phone: string | null
  is_admin: number
  role: Role
  brand_id: number | null
  auth_provider: AuthProvider
  provider_user_id: string | null
  created_at: string
}

export type Brand = {
  id: number
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  is_active: number
  created_at: string
}

export type Showroom = {
  id: number
  brand_id: number
  name: string
  address: string
  description: string | null
  image_url: string | null
  is_active: number
  display_order: number
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
