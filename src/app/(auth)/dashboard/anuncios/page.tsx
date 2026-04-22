import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import { cn, AD_STATUS_LABELS, AD_STATUS_COLORS, formatDateShort, getExpiryBadge, formatPrice } from '@/lib/utils/helpers'
import type { AdStatus } from '@/types'

export default async function AnunciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ads } = await supabase
    .from('ads')
    .select('*, plans(name, price, currency, duration_days), lots(lot_identifier)')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const grouped = {
    active: ads?.filter(a => a.status === 'active') ?? [],
    pending_payment: ads?.filter(a => a.status === 'pending_payment') ?? [],
    payment_failed: ads?.filter(a => a.status === 'payment_failed') ?? [],
    expired: ads?.filter(a => a.status === 'expired') ?? [],
    cancelled: ads?.filter(a => a.status === 'cancelled') ?? [],
  }

  const AdCard = ({ ad }: { ad: any }) => {
    const expiry = getExpiryBadge(ad.expires_at)
    const statusColor = AD_STATUS_COLORS[ad.status as AdStatus]
    const statusLabel = AD_STATUS_LABELS[ad.status as AdStatus]

    return (
      <div className="card hover:border-stone-300 transition-all duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('badge', statusColor)}>{statusLabel}</span>
              {ad.status === 'active' && ad.expires_at && (
                <span className={cn('text-xs font-medium', expiry.color)}>
                  {expiry.label}
                </span>
              )}
            </div>
            <h3 className="font-medium text-stone-900 truncate">{ad.title}</h3>
            <p className="text-sm text-stone-400 mt-0.5">
              {ad.lots?.lot_identifier ?? 'Sin lote'} ·{' '}
              {ad.plans?.name} ·{' '}
              Creado {formatDateShort(ad.created_at)}
            </p>
            {ad.asking_price && (
              <p className="text-sm font-medium text-stone-600 mt-1">
                {formatPrice(ad.asking_price, ad.currency)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Link
              href={`/dashboard/anuncios/${ad.id}`}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              Ver
            </Link>
            {(ad.status === 'pending_payment' || ad.status === 'payment_failed') && (
              <Link
                href={`/dashboard/anuncios/${ad.id}/pagar`}
                className="btn-primary text-sm py-1.5 px-3"
              >
                Pagar
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const sections = [
    { key: 'active', label: 'Activos' },
    { key: 'pending_payment', label: 'Pendientes de pago' },
    { key: 'payment_failed', label: 'Pago rechazado' },
    { key: 'expired', label: 'Vencidos' },
    { key: 'cancelled', label: 'Cancelados' },
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Mis Anuncios</h1>
          <p className="text-stone-500 mt-1">
            {ads?.length ?? 0} anuncio{ads?.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link href="/dashboard/anuncios/nuevo" className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />
          Nuevo anuncio
        </Link>
      </div>

      {!ads || ads.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Megaphone className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500 mb-2">No tenés anuncios todavía</p>
            <p className="text-sm text-stone-400 mb-6">
              Publicá tu primer anuncio y llegá a tus vecinos
            </p>
            <Link href="/dashboard/anuncios/nuevo" className="btn-primary">
              Crear anuncio
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ key, label }) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <div key={key}>
                <h2 className="section-title mb-3">
                  {label}{' '}
                  <span className="text-stone-400 text-base font-normal">({items.length})</span>
                </h2>
                <div className="space-y-3">
                  {items.map((ad: any) => <AdCard key={ad.id} ad={ad} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
