import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Megaphone, CreditCard, Clock, Plus, AlertTriangle } from 'lucide-react'
import { formatPrice, formatDateShort, AD_STATUS_LABELS, AD_STATUS_COLORS, getExpiryBadge } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import type { Ad } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: ads }, { data: payments }] = await Promise.all([
    supabase
      .from('ads')
      .select('*, plans(name, price), lots(lot_identifier)')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('id, status, amount, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const activeAds = ads?.filter(a => a.status === 'active') ?? []
  const expiringAds = activeAds.filter(a => {
    if (!a.expires_at) return false
    const days = Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 86400000)
    return days <= 7
  })

  const stats = [
    {
      label: 'Anuncios activos',
      value: activeAds.length,
      icon: Megaphone,
      color: 'bg-brand-50 text-brand-600',
      href: '/dashboard/anuncios',
    },
    {
      label: 'Total anuncios',
      value: ads?.length ?? 0,
      icon: Clock,
      color: 'bg-stone-100 text-stone-600',
      href: '/dashboard/anuncios',
    },
    {
      label: 'Pagos realizados',
      value: payments?.length ?? 0,
      icon: CreditCard,
      color: 'bg-blue-50 text-blue-600',
      href: '/dashboard/pagos',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="text-stone-500 mt-1">Resumen de tu actividad en el barrio</p>
        </div>
        <Link href="/dashboard/anuncios/nuevo" className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />
          Nuevo anuncio
        </Link>
      </div>

      {/* Alerta vencimientos */}
      {expiringAds.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {expiringAds.length === 1
                ? '1 anuncio vence pronto'
                : `${expiringAds.length} anuncios vencen pronto`}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Revisá tus anuncios para renovar la publicación a tiempo.
            </p>
          </div>
          <Link href="/dashboard/anuncios" className="ml-auto text-sm text-amber-700 font-medium hover:text-amber-800 whitespace-nowrap">
            Ver anuncios →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-stone-500 mb-1">{label}</p>
                <p className="text-3xl font-semibold text-stone-900">{value}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent ads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Mis anuncios recientes</h2>
          <Link href="/dashboard/anuncios" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            Ver todos →
          </Link>
        </div>

        {!ads || ads.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Megaphone className="w-12 h-12 text-stone-300 mb-4" />
              <p className="text-stone-500 mb-4">Todavía no publicaste ningún anuncio</p>
              <Link href="/dashboard/anuncios/nuevo" className="btn-primary">
                Crear mi primer anuncio
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad: any) => {
              const expiry = getExpiryBadge(ad.expires_at)
              return (
                <Link
                  key={ad.id}
                  href={`/dashboard/anuncios/${ad.id}`}
                  className="card-hover flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">{ad.title}</p>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {ad.lots?.lot_identifier ?? 'Sin lote'} · {ad.plans?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {ad.status === 'active' && ad.expires_at && (
                      <span className={cn('text-xs font-medium', expiry.color)}>
                        {expiry.label}
                      </span>
                    )}
                    <span className={cn('badge', AD_STATUS_COLORS[ad.status as keyof typeof AD_STATUS_COLORS])}>
                      {AD_STATUS_LABELS[ad.status as keyof typeof AD_STATUS_LABELS]}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
