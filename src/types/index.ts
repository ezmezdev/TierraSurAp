// ============================================================
// TIPOS GLOBALES DE LA APLICACIÓN
// Derivados del schema de la base de datos.
// Single source of truth para tipos en frontend y backend.
// ============================================================

export type UserRole = 'user' | 'admin'

export type AdStatus =
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'payment_failed'

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled'

export type AdType = 'sale' | 'rent' | 'service' | 'other'

// ------------------------------------------------------------
// DATABASE TYPES
// ------------------------------------------------------------

export interface Profile {
  id: string
  display_name: string | null
  phone: string | null
  role: UserRole
  terms_accepted: boolean
  terms_accepted_at: string | null
  terms_version: string | null
  is_banned: boolean
  banned_at: string | null
  banned_reason: string | null
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  description: string | null
  duration_days: number
  price: number
  currency: string
  is_active: boolean
  created_at: string
}

export interface Lot {
  id: string
  lot_identifier: string
  block: string | null
  lot_number: string | null
  area_m2: number | null
  address: string | null
  is_active: boolean
}

export interface Ad {
  id: string
  user_id: string
  lot_id: string | null
  plan_id: string
  title: string
  description: string
  ad_type: AdType
  asking_price: number | null
  currency: string
  images: string[]
  status: AdStatus
  rejection_reason: string | null
  activated_at: string | null
  expires_at: string | null
  expiry_alert_sent: boolean
  cancelled_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Relaciones (joins)
  profiles?: Profile
  lots?: Lot
  plans?: Plan
}

export interface Payment {
  id: string
  ad_id: string
  user_id: string
  plan_id: string
  mp_preference_id: string | null
  mp_payment_id: string | null
  mp_status: string | null
  status: PaymentStatus
  amount: number
  currency: string
  webhook_received_at: string | null
  webhook_verified_at: string | null
  created_at: string
  // Relaciones
  ads?: Ad
}

export interface AdminLog {
  id: string
  actor_id: string | null
  action: string
  target_table: string | null
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
  // Relaciones
  profiles?: Profile
}

// ------------------------------------------------------------
// FORM TYPES
// ------------------------------------------------------------

export interface RegisterFormData {
  display_name: string
  email: string
  password: string
  confirm_password: string
  phone?: string
  terms_accepted: boolean
}

export interface LoginFormData {
  email: string
  password: string
}

export interface CreateAdFormData {
  title: string
  description: string
  ad_type: AdType
  lot_id: string
  plan_id: string
  asking_price?: number
  currency: string
}

// ------------------------------------------------------------
// API RESPONSE TYPES
// ------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

export interface CreatePreferenceResponse {
  preference_id: string
  init_point: string
  ad_id: string
}

export interface AdWithDetails extends Ad {
  profiles: Profile
  lots: Lot | null
  plans: Plan
  payments: Payment[]
}
