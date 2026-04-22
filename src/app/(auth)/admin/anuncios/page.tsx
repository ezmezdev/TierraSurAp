import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cn, AD_STATUS_LABELS, AD_STATUS_COLORS, formatDateShort, formatPrice, getExpiryBadge } from '@/lib/utils/helpers'
import type { AdStatus } from '@/types'

export default async function AdminAnunciosPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const adminSupabase = await createAdminClient()

  let query = adminSupabase
    .from('ads')
    .select('*, profiles(display_name), lots(lot_identifier), plans(name, price, currency)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`)
  }

  const { data: ads } = await query

  const statuses: AdStatus[] = ['active', 'pending_payment', 'payment_failed', 'expired', 'cancelled']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Anuncios</h1>
        <p className="text-stone-500 mt-1">Todos los anuncios de la plataforma</p>
      </div>

      {/* Filtros */}
      <div className="card">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="q"
            defaultValue={searchParams.q}
            type="search"
            placeholder="Buscar por título..."
            className="input-field flex-1"
          />
          <select name="status" defaultValue={searchParams.status} className="input-field sm:w-48">
            <option value="">Todos los estados</option>
            {statuses.map(s => (
              <option key={s} value={s}>{AD_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Filtrar</button>
          {(searchParams.status || searchParams.q) && (
            <Link href="/admin/anuncios" className="btn-secondary">Limpiar</Link>
          )}
        </form>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {!ads || ads.length === 0 ? (
          <div className="card">
            <p className="text-center text-stone-400 py-8">No se encontraron anuncios</p>
          </div>
        ) : (
          ads.map((ad: any) => {
            const expiry = getExpiryBadge(ad.expires_at)
            return (
              <div key={ad.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('badge', AD_STATUS_COLORS[ad.status as AdStatus])}>
                        {AD_STATUS_LABELS[ad.status as AdStatus]}
                      </span>
                      {ad.status === 'active' && ad.expires_at && (
                        <span className={cn('text-xs font-medium', expiry.color)}>{expiry.label}</span>
                      )}
                    </div>
                    <h3 className="font-medium text-stone-900 truncate">{ad.title}</h3>
                    <p className="text-sm text-stone-400 mt-0.5">
                      <span className="font-medium text-stone-600">{ad.profiles?.display_name}</span>
                      {' · '}Lote: {ad.lots?.lot_identifier ?? '—'}
                      {' · '}{ad.plans?.name}
                      {' · '}Creado: {formatDateShort(ad.created_at)}
                    </p>
                    {ad.asking_price && (
                      <p className="text-sm text-stone-500 mt-0.5">
                        Precio pedido: {formatPrice(ad.asking_price, ad.currency)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/anuncios/${ad.id}`}
                      className="btn-secondary text-sm py-1.5 px-3"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
