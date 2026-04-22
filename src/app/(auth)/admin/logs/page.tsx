import { createAdminClient } from '@/lib/supabase/server'
import { formatRelativeTime, formatDateShort } from '@/lib/utils/helpers'
import { Activity } from 'lucide-react'

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; page?: string }
}) {
  const adminSupabase = await createAdminClient()
  const page = parseInt(searchParams.page ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = adminSupabase
    .from('admin_logs')
    .select('*, profiles(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (searchParams.action) {
    query = query.eq('action', searchParams.action)
  }

  const { data: logs, count } = await query

  const totalPages = Math.ceil((count ?? 0) / limit)

  const actionColors: Record<string, string> = {
    ad_created: 'bg-blue-100 text-blue-700',
    ad_activated: 'bg-green-100 text-green-700',
    ad_cancelled: 'bg-red-100 text-red-700',
    ad_expired: 'bg-stone-100 text-stone-600',
    payment_created: 'bg-amber-100 text-amber-700',
    payment_approved: 'bg-green-100 text-green-700',
    payment_rejected: 'bg-red-100 text-red-700',
    user_role_changed: 'bg-purple-100 text-purple-700',
    user_banned: 'bg-red-100 text-red-700',
  }

  const uniqueActions = Array.from(new Set(logs?.map(l => l.action) ?? []))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Logs administrativos</h1>
        <p className="text-stone-500 mt-1">{count ?? 0} eventos registrados</p>
      </div>

      {/* Filtros */}
      <div className="card">
        <form className="flex flex-wrap gap-3">
          <select name="action" defaultValue={searchParams.action} className="input-field w-56">
            <option value="">Todas las acciones</option>
            {[
              'ad_created', 'ad_activated', 'ad_cancelled', 'ad_expired',
              'payment_created', 'payment_approved', 'payment_rejected',
              'user_role_changed', 'user_banned',
            ].map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Filtrar</button>
        </form>
      </div>

      {/* Timeline de logs */}
      <div className="card p-0 divide-y divide-stone-50">
        {!logs || logs.length === 0 ? (
          <p className="text-center text-stone-400 py-10">No hay logs disponibles</p>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-stone-50/50 transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`badge text-xs ${actionColors[log.action] ?? 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-stone-600 mt-1">
                      <span className="font-medium text-stone-800">
                        {log.profiles?.display_name ?? 'Sistema automático'}
                      </span>
                      {log.target_table && (
                        <span className="text-stone-400"> → {log.target_table}</span>
                      )}
                    </p>
                    {Object.keys(log.details ?? {}).length > 0 && (
                      <p className="text-xs text-stone-400 font-mono mt-1 truncate max-w-lg">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-stone-400 whitespace-nowrap">{formatRelativeTime(log.created_at)}</p>
                    <p className="text-xs text-stone-300">{formatDateShort(log.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?page=${page - 1}${searchParams.action ? `&action=${searchParams.action}` : ''}`}
                className="btn-secondary text-sm py-1.5">
                ← Anterior
              </a>
            )}
            {page < totalPages && (
              <a href={`?page=${page + 1}${searchParams.action ? `&action=${searchParams.action}` : ''}`}
                className="btn-primary text-sm py-1.5">
                Siguiente →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
