import { createAdminClient } from '@/lib/supabase/server'
import { cn, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatDateShort, formatPrice } from '@/lib/utils/helpers'
import type { PaymentStatus } from '@/types'

export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const adminSupabase = await createAdminClient()

  let query = adminSupabase
    .from('payments')
    .select('*, profiles(display_name), ads(title), plans(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: payments } = await query

  const totalApproved = payments
    ?.filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0

  const statuses: PaymentStatus[] = ['pending', 'approved', 'rejected', 'refunded', 'cancelled']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="text-stone-500 mt-1">Historial de todos los pagos</p>
        </div>
        <div className="card py-3 px-5 text-right">
          <p className="text-xs text-stone-400">Total recaudado (aprobados)</p>
          <p className="text-xl font-bold text-brand-600">{formatPrice(totalApproved)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <form className="flex flex-wrap gap-3">
          <select name="status" defaultValue={searchParams.status} className="input-field w-48">
            <option value="">Todos los estados</option>
            {statuses.map(s => (
              <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Filtrar</button>
        </form>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                {['Usuario', 'Anuncio', 'Plan', 'Monto', 'Estado', 'MP ID', 'Fecha'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {payments?.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-stone-800">
                    {payment.profiles?.display_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600 max-w-[160px] truncate">
                    {payment.ads?.title ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-500">
                    {payment.plans?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-stone-900">
                    {formatPrice(payment.amount, payment.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('badge', PAYMENT_STATUS_COLORS[payment.status as PaymentStatus])}>
                      {PAYMENT_STATUS_LABELS[payment.status as PaymentStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-stone-400 font-mono">
                    {payment.mp_payment_id ? payment.mp_payment_id.slice(0, 12) + '…' : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-500 whitespace-nowrap">
                    {formatDateShort(payment.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!payments || payments.length === 0) && (
            <p className="text-center text-stone-400 py-10">No se encontraron pagos</p>
          )}
        </div>
      </div>
    </div>
  )
}
