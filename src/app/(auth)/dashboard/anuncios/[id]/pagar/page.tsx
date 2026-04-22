'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CreditCard, AlertCircle, CheckCircle, Clock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, AD_STATUS_LABELS } from '@/lib/utils/helpers'

export default function PagarPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [ad, setAd] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('ads')
      .select('*, plans(*), lots(lot_identifier)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          router.push('/dashboard/anuncios')
          return
        }
        // Solo permitir pago si está en pending_payment o payment_failed
        if (!['pending_payment', 'payment_failed'].includes(data.status)) {
          router.push(`/dashboard/anuncios/${id}`)
          return
        }
        setAd(data)
        setLoading(false)
      })
  }, [id, router])

  const handlePay = async () => {
    setPaying(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Crear preferencia de pago en el backend (Edge Function)
      // El frontend nunca toca las credenciales de MercadoPago
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crear-preferencia-mp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ad_id: id }),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo iniciar el pago. Intentá de nuevo.')
        return
      }

      // Redirigir al checkout de MercadoPago
      window.location.href = result.init_point
    } catch {
      setError('Error de conexión. Verificá tu internet e intentá de nuevo.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="page-title">Pagar anuncio</h1>
        <p className="text-stone-500 mt-1">Revisá el detalle antes de continuar</p>
      </div>

      {/* Resumen del anuncio */}
      <div className="card space-y-4">
        <h2 className="font-medium text-stone-700 text-sm uppercase tracking-wide">
          Resumen del pedido
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Anuncio</span>
            <span className="text-stone-900 font-medium text-right max-w-[60%] truncate">{ad.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Lote</span>
            <span className="text-stone-900">{ad.lots?.lot_identifier ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Plan</span>
            <span className="text-stone-900">{ad.plans?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Duración</span>
            <span className="text-stone-900">{ad.plans?.duration_days} días</span>
          </div>
          <div className="border-t border-stone-100 pt-3 flex justify-between">
            <span className="font-semibold text-stone-900">Total</span>
            <span className="font-bold text-xl text-brand-600">
              {formatPrice(ad.plans?.price ?? 0, ad.plans?.currency ?? 'ARS')}
            </span>
          </div>
        </div>
      </div>

      {/* Info seguridad */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Pago seguro con MercadoPago</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Serás redirigido al sitio oficial de MercadoPago. No almacenamos datos de tu tarjeta.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paying}
        className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Iniciando pago...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pagar con MercadoPago
          </>
        )}
      </button>

      <p className="text-xs text-center text-stone-400">
        Al pagar aceptás los términos y condiciones de BarrioAnuncios.
        El anuncio se activará automáticamente tras la confirmación del pago.
      </p>
    </div>
  )
}
