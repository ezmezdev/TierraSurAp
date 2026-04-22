import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { cn, AD_STATUS_LABELS, AD_STATUS_COLORS, formatDate, formatPrice, getExpiryBadge } from '@/lib/utils/helpers'
import { AdStatusBanner } from '@/components/anuncios/AdStatusBanner'
import { CancelAdButton } from '@/components/anuncios/CancelAdButton'
import { ChevronLeft, MapPin, Calendar, Clock, Tag } from 'lucide-react'
import type { AdStatus } from '@/types'

export default async function AdDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { pago?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ad, error } = await supabase
    .from('ads')
    .select('*, plans(*), lots(*), profiles(display_name, role)')
    .eq('id', params.id)
    .single()

  if (error || !ad) notFound()

  // Solo el dueño o un admin puede ver el detalle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isOwner = ad.user_id === user!.id
  const isAdmin = profile?.role === 'admin'

  if (!isOwner && !isAdmin) redirect('/dashboard')

  const expiry = getExpiryBadge(ad.expires_at)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={isAdmin ? '/admin/anuncios' : '/dashboard/anuncios'}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ChevronLeft className="w-4 h-4" /> Volver a anuncios
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="page-title leading-tight">{ad.title}</h1>
          <span className={cn('badge flex-shrink-0 mt-1', AD_STATUS_COLORS[ad.status as AdStatus])}>
            {AD_STATUS_LABELS[ad.status as AdStatus]}
          </span>
        </div>
      </div>

      {/* Banner de estado de pago si viene del checkout */}
      {searchParams.pago && <AdStatusBanner pagoStatus={searchParams.pago} />}

      {/* Info principal */}
      <div className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <MapPin className="w-4 h-4 text-stone-400" />
            <span>Lote: <strong>{ad.lots?.lot_identifier ?? '—'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Tag className="w-4 h-4 text-stone-400" />
            <span>Plan: <strong>{ad.plans?.name}</strong></span>
          </div>
          {ad.activated_at && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>Activado: <strong>{formatDate(ad.activated_at)}</strong></span>
            </div>
          )}
          {ad.expires_at && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-stone-400" />
              <span className={cn('font-medium', expiry.color)}>
                {expiry.label}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-stone-500 mb-2">Descripción</p>
          <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{ad.description}</p>
        </div>

        {ad.asking_price && (
          <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
            <p className="text-xs text-brand-600 mb-1">Precio solicitado</p>
            <p className="text-2xl font-bold text-brand-700">
              {formatPrice(ad.asking_price, ad.currency)}
            </p>
            <p className="text-xs text-brand-500 mt-1">
              Precio indicado por el vecino. No es una tasación oficial.
            </p>
          </div>
        )}
      </div>

      {/* Acciones */}
      {isOwner && (
        <div className="flex flex-wrap gap-3">
          {(ad.status === 'pending_payment' || ad.status === 'payment_failed') && (
            <Link href={`/dashboard/anuncios/${ad.id}/pagar`} className="btn-primary">
              Pagar ahora
            </Link>
          )}
          {ad.status === 'pending_payment' && (
            <CancelAdButton adId={ad.id} />
          )}
        </div>
      )}

      {/* Info del anunciante (solo admin) */}
      {isAdmin && (
        <div className="card bg-stone-50 border-stone-100">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Info admin</p>
          <div className="text-sm text-stone-600 space-y-1">
            <p>Dueño: <strong>{ad.profiles?.display_name}</strong></p>
            <p>ID anuncio: <code className="text-xs bg-stone-200 px-1.5 py-0.5 rounded">{ad.id}</code></p>
            <p>Creado: {formatDate(ad.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
