'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ChevronRight, CheckCircle } from 'lucide-react'
import { createAdSchema, type CreateAdFormData } from '@/lib/utils/validations'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, cn } from '@/lib/utils/helpers'
import type { Lot, Plan } from '@/types'

const AD_TYPES = [
  { value: 'sale', label: 'Venta', desc: 'Publicar un lote o propiedad en venta' },
  { value: 'rent', label: 'Alquiler', desc: 'Ofrecer un espacio en alquiler' },
  { value: 'service', label: 'Servicio', desc: 'Ofrecer un servicio al barrio' },
  { value: 'other', label: 'Otro', desc: 'Otro tipo de anuncio' },
]

export default function NuevoAnuncioPage() {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateAdFormData>({
    resolver: zodResolver(createAdSchema),
    defaultValues: { currency: 'ARS' },
  })

  const selectedPlanId = watch('plan_id')
  const selectedType = watch('ad_type')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('lots').select('*').eq('is_active', true).order('lot_identifier'),
      supabase.from('plans').select('*').eq('is_active', true).order('duration_days'),
    ]).then(([{ data: lotsData }, { data: plansData }]) => {
      setLots(lotsData ?? [])
      setPlans(plansData ?? [])
      setLoadingData(false)
    })
  }, [])

  const onSubmit = async (data: CreateAdFormData) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Crear el anuncio via Edge Function para validación backend
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crear-anuncio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        setServerError(result.error || 'Error al crear el anuncio.')
        return
      }

      router.push(`/dashboard/anuncios/${result.ad_id}/pagar`)
    } catch {
      setServerError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Nuevo anuncio</h1>
        <p className="text-stone-500 mt-1">Completá los datos para publicar en el barrio</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        {/* Tipo de anuncio */}
        <div className="card">
          <h2 className="section-title mb-4">Tipo de anuncio</h2>
          <div className="grid grid-cols-2 gap-3">
            {AD_TYPES.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('ad_type', value as any, { shouldValidate: true })}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all duration-150',
                  selectedType === value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <p className={cn('font-medium text-sm', selectedType === value ? 'text-brand-700' : 'text-stone-800')}>
                  {label}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          {errors.ad_type && <p className="error-message mt-2">{errors.ad_type.message}</p>}
        </div>

        {/* Datos del anuncio */}
        <div className="card space-y-5">
          <h2 className="section-title">Datos del anuncio</h2>

          <div>
            <label className="label">Título</label>
            <input
              {...register('title')}
              type="text"
              placeholder="Ej: Lote en venta, excelente ubicación"
              className={cn('input-field', errors.title && 'input-error')}
            />
            {errors.title && <p className="error-message">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describí tu anuncio con todos los detalles relevantes..."
              className={cn('input-field resize-none', errors.description && 'input-error')}
            />
            {errors.description && <p className="error-message">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Precio pedido <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input
                {...register('asking_price', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
                className={cn('input-field', errors.asking_price && 'input-error')}
              />
              {errors.asking_price && <p className="error-message">{errors.asking_price.message}</p>}
              <p className="text-xs text-stone-400 mt-1">No es una tasación oficial</p>
            </div>

            <div>
              <label className="label">Lote</label>
              <select
                {...register('lot_id')}
                className={cn('input-field', errors.lot_id && 'input-error')}
              >
                <option value="">Seleccioná un lote</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lot_identifier}
                    {lot.block ? ` — Mz. ${lot.block}` : ''}
                  </option>
                ))}
              </select>
              {errors.lot_id && <p className="error-message">{errors.lot_id.message}</p>}
            </div>
          </div>
        </div>

        {/* Selección de plan */}
        <div className="card">
          <h2 className="section-title mb-4">Plan de publicación</h2>
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setValue('plan_id', plan.id, { shouldValidate: true })}
                className={cn(
                  'w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all duration-150',
                  selectedPlanId === plan.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <div className="text-left">
                  <p className={cn('font-medium', selectedPlanId === plan.id ? 'text-brand-700' : 'text-stone-800')}>
                    {plan.name}
                  </p>
                  <p className="text-sm text-stone-400">{plan.duration_days} días de publicación</p>
                  {plan.description && (
                    <p className="text-xs text-stone-400 mt-0.5">{plan.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-lg font-semibold', selectedPlanId === plan.id ? 'text-brand-700' : 'text-stone-900')}>
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  {selectedPlanId === plan.id && (
                    <CheckCircle className="w-5 h-5 text-brand-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {errors.plan_id && <p className="error-message mt-2">{errors.plan_id.message}</p>}
        </div>

        <input type="hidden" {...register('currency')} />

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando anuncio...
            </>
          ) : (
            <>
              Continuar al pago
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
