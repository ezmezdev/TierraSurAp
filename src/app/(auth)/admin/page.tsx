import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Megaphone, CreditCard, AlertTriangle, Activity } from 'lucide-react'
import { formatPrice, formatRelativeTime, AD_STATUS_LABELS, AD_STATUS_COLORS } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'

export default async function AdminPage() {
  const adminSupabase = await createAdminClient()

  const [
    { count: totalUsers },
    { count: activeAds },
    { count: pendingAds },
    { count: approvedPayments },
    { data: recentLogs },
    { data: expiringAds },
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    adminSupabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
    adminSupabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment').is('deleted_at', null),
    adminSupabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    adminSupabase.from('admin_logs').select('*, profiles(display_name)').order('created_at', { ascending: false }).limit(8),
    adminSupabase.from('ads')
      .select('id, title, expires_at, lots(lot_identifier)')
      .eq('status', 'active')
      .lte('expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('expires_at')
      .limit(5),
  ])

  const stats = [
    { label: 'Usuarios', value: totalUsers ?? 0, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/admin/usuarios' },
    { label: 'Anuncios activos', value: activeAds ?? 0, icon: Megaphone, color: 'bg-brand-50 text-brand-600', href: '/admin/anuncios' },
    { label: 'Pendientes de pago', value: pendingAds ?? 0, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600', href: '/admin/anuncios' },
    { label: 'Pagos aprobados', value: approvedPayments ?? 0, icon: CreditCard, color: 'bg-green-50 text-green-600', href: '/admin/pagos' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Panel de administración</h1>
        <p className="text-stone-500 mt-1">Resumen general de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="card-hover">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{value}</p>
            <p className="text-sm text-stone-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Anuncios por vencer */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Vencen pronto</h2>
            <Link href="/admin/anuncios" className="text-sm text-brand-600 hover:text-brand-700">Ver todos →</Link>
          </div>
          {!expiringAds || expiringAds.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Sin anuncios por vencer en 7 días</p>
          ) : (
            <div className="space-y-2">
              {expiringAds.map((ad: any) => {
                const days = Math.ceil((new Date(ad.expires_at).getTime() - Date.now()) / 86400000)
                return (
                  <div key={ad.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-stone-800 truncate max-w-[200px]">{ad.title}</p>
                      <p className="text-xs text-stone-400">{ad.lots?.lot_identifier}</p>
                    </div>
                    <span className={cn('text-xs font-medium', days <= 3 ? 'text-red-600' : 'text-amber-600')}>
                      {days === 0 ? 'Hoy' : `${days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Log reciente */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Actividad reciente</h2>
            <Link href="/admin/logs" className="text-sm text-brand-600 hover:text-brand-700">Ver logs →</Link>
          </div>
          {!recentLogs || recentLogs.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Sin actividad reciente</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 py-2 border-b border-stone-50 last:border-0">
                  <Activity className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-stone-600 truncate">
                      <span className="font-medium">{log.profiles?.display_name ?? 'Sistema'}</span>{' '}
                      — {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-stone-400">{formatRelativeTime(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
