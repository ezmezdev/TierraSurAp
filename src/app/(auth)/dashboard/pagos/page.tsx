import { createClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'
import { cn, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatPrice, formatDate } from '@/lib/utils/helpers'
import type { PaymentStatus } from '@/types'

export default async function PagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, ads(title, status), plans(name, duration_days)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Mis Pagos</h1>
        <p className="text-stone-500 mt-1">Historial de pagos de tus publicaciones</p>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CreditCard className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500 mb-1">Sin pagos registrados</p>
            <p className="text-sm text-stone-400">Tus pagos aparecerán aquí una vez que publiques un anuncio</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment: any) => (
            <div key={payment.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-stone-400" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">
                      {payment.ads?.title ?? 'Anuncio'}
                    </p>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {payment.plans?.name}
                      {payment.plans?.duration_days && ` · ${payment.plans.duration_days} días`}
                    </p>
                    <p className="text-xs text-stone-300 mt-1">{formatDate(payment.created_at)}</p>
                    {payment.mp_payment_id && (
                      <p className="text-xs text-stone-300 font-mono mt-0.5">
                        MP ID: {payment.mp_payment_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg text-stone-900">
                    {formatPrice(payment.amount, payment.currency)}
                  </p>
                  <span className={cn('badge mt-1', PAYMENT_STATUS_COLORS[payment.status as PaymentStatus])}>
                    {PAYMENT_STATUS_LABELS[payment.status as PaymentStatus]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card bg-stone-50 border-stone-100">
        <p className="text-xs text-stone-400 leading-relaxed">
          Los pagos son procesados por MercadoPago. BarrioAnuncios no almacena datos de tu tarjeta.
          Para disputas o reembolsos, contactá a soporte indicando el ID de pago de MercadoPago.
        </p>
      </div>
    </div>
  )
}
