import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, Search, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/utils/helpers'

const AD_TYPE_LABELS = { sale: 'Venta', rent: 'Alquiler', service: 'Servicio', other: 'Otro' }
const AD_TYPE_COLORS: Record<string, string> = {
  sale: 'bg-blue-100 text-blue-700',
  rent: 'bg-green-100 text-green-700',
  service: 'bg-amber-100 text-amber-700',
  other: 'bg-stone-100 text-stone-600',
}

export default async function PublicAnunciosPage({
  searchParams,
}: {
  searchParams: { tipo?: string; q?: string }
}) {
  const supabase = await createClient()

  let query = supabase
    .from('ads')
    .select('id, title, description, ad_type, asking_price, currency, created_at, lots(lot_identifier, block)')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (searchParams.tipo) query = query.eq('ad_type', searchParams.tipo)
  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`)

  const { data: ads } = await query

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav simple */}
      <nav className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              BarrioAnuncios
            </span>
          </Link>
          <Link href="/login" className="btn-primary text-sm py-2 px-4">Ingresar</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="page-title">Anuncios del barrio</h1>
          <p className="text-stone-500 mt-1">{ads?.length ?? 0} publicaciones activas</p>
        </div>

        {/* Filtros */}
        <form className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              name="q"
              defaultValue={searchParams.q}
              type="search"
              placeholder="Buscar anuncios..."
              className="input-field pl-10"
            />
          </div>
          <select name="tipo" defaultValue={searchParams.tipo} className="input-field sm:w-40">
            <option value="">Todos los tipos</option>
            {Object.entries(AD_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Buscar</button>
        </form>

        {/* Grid de anuncios */}
        {!ads || ads.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Search className="w-12 h-12 text-stone-300 mb-4" />
              <p className="text-stone-500">No hay anuncios activos en este momento</p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad: any) => (
              <div key={ad.id} className="card hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`badge text-xs ${AD_TYPE_COLORS[ad.ad_type] ?? 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {AD_TYPE_LABELS[ad.ad_type as keyof typeof AD_TYPE_LABELS] ?? ad.ad_type}
                  </span>
                  {ad.lots?.lot_identifier && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <MapPin className="w-3 h-3" />
                      {ad.lots.lot_identifier}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-stone-900 mb-2 line-clamp-2">{ad.title}</h3>
                <p className="text-sm text-stone-500 line-clamp-3 flex-1">{ad.description}</p>
                {ad.asking_price && (
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-semibold text-stone-800">
                      {formatPrice(ad.asking_price, ad.currency)}
                    </span>
                    <span className="text-xs text-stone-400 ml-1">(precio pedido)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card bg-stone-50 border-stone-100 text-center">
          <p className="text-sm text-stone-400">
            ¿Querés publicar un anuncio?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
              Creá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
