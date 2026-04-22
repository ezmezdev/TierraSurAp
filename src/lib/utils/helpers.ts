import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AdStatus, PaymentStatus, AdType } from '@/types'

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ------------------------------------------------------------
// FORMATTERS
// ------------------------------------------------------------

export function formatPrice(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "d 'de' MMMM yyyy", { locale: es })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function getDaysUntilExpiry(expiresAt: string): number {
  return differenceInDays(new Date(expiresAt), new Date())
}

export function isExpired(expiresAt: string): boolean {
  return isPast(new Date(expiresAt))
}

// ------------------------------------------------------------
// STATUS LABELS Y COLORES
// ------------------------------------------------------------

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  pending_payment: 'Pendiente de pago',
  active: 'Activo',
  expired: 'Vencido',
  cancelled: 'Cancelado',
  payment_failed: 'Pago rechazado',
}

export const AD_STATUS_COLORS: Record<AdStatus, string> = {
  pending_payment: 'bg-amber-100 text-amber-800 border-amber-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-stone-100 text-stone-600 border-stone-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  payment_failed: 'bg-red-100 text-red-700 border-red-200',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-stone-100 text-stone-600',
}

export const AD_TYPE_LABELS: Record<AdType, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  service: 'Servicio',
  other: 'Otro',
}

// ------------------------------------------------------------
// SANITIZACIÓN (seguridad extra en frontend)
// La sanitización real ocurre en el backend.
// Esto es solo para UX (evitar caracteres problemáticos en inputs).
// ------------------------------------------------------------

export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')        // Strip HTML tags
    .replace(/javascript:/gi, '')   // Remove javascript: protocol
    .trim()
}

// ------------------------------------------------------------
// HELPERS DE NEGOCIO
// ------------------------------------------------------------

export function getExpiryBadge(expiresAt: string | null): {
  label: string
  color: string
  urgent: boolean
} {
  if (!expiresAt) return { label: 'Sin fecha', color: 'text-stone-400', urgent: false }

  const days = getDaysUntilExpiry(expiresAt)

  if (days < 0) return { label: 'Vencido', color: 'text-red-600', urgent: true }
  if (days === 0) return { label: 'Vence hoy', color: 'text-red-600', urgent: true }
  if (days <= 3) return { label: `Vence en ${days}d`, color: 'text-amber-600', urgent: true }
  if (days <= 7) return { label: `Vence en ${days}d`, color: 'text-amber-500', urgent: false }
  return { label: `Vence en ${days}d`, color: 'text-stone-500', urgent: false }
}
