'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { registerSchema, type RegisterFormData } from '@/lib/utils/validations'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

const TERMS_VERSION = '2024-01'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms_accepted: false },
  })

  const termsAccepted = watch('terms_accepted')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const supabase = createClient()

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.display_name,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setServerError('Ya existe una cuenta con ese email.')
        } else {
          setServerError('Error al crear la cuenta. Intentá de nuevo.')
        }
        return
      }

      if (!authData.user) {
        setServerError('Error inesperado. Intentá de nuevo.')
        return
      }

      // 2. Actualizar profile con datos adicionales y TyC
      // El trigger ya creó el profile. Ahora actualizamos con los datos del form.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          phone: data.phone || null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          // IP se registra en el backend/Edge Function por seguridad
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // No falla el registro por esto — se puede completar después
      }

      setSuccess(true)
    } catch (error) {
      console.error('Register error:', error)
      setServerError('Error de conexión. Verificá tu internet e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
        <div className="max-w-md w-full text-center animate-slide-up">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-2xl text-stone-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            ¡Cuenta creada!
          </h2>
          <p className="text-stone-500 mb-8">
            Te enviamos un email de confirmación. 
            Revisá tu bandeja de entrada y hacé click en el link para activar tu cuenta.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display)' }}>
              BarrioAnuncios
            </span>
          </Link>
          <h1 className="text-3xl text-stone-900" style={{ fontFamily: 'var(--font-display)' }}>
            Crear cuenta
          </h1>
          <p className="text-stone-500 mt-2">Únete a la comunidad del barrio</p>
        </div>

        <div className="card animate-slide-up">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Error del servidor */}
            {serverError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="label">Nombre completo</label>
              <input
                {...register('display_name')}
                type="text"
                autoComplete="name"
                placeholder="Juan García"
                className={cn('input-field', errors.display_name && 'input-error')}
              />
              {errors.display_name && (
                <p className="error-message">{errors.display_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="juan@ejemplo.com"
                className={cn('input-field', errors.email && 'input-error')}
              />
              {errors.email && (
                <p className="error-message">{errors.email.message}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="label">
                Teléfono <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                placeholder="+54 9 11 1234-5678"
                className={cn('input-field', errors.phone && 'input-error')}
              />
              {errors.phone && (
                <p className="error-message">{errors.phone.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={cn('input-field pr-12', errors.password && 'input-error')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="error-message">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                {...register('confirm_password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repetí tu contraseña"
                className={cn('input-field', errors.confirm_password && 'input-error')}
              />
              {errors.confirm_password && (
                <p className="error-message">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Términos y condiciones */}
            <div>
              <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                <input
                  {...register('terms_accepted')}
                  type="checkbox"
                  id="terms"
                  className="mt-0.5 w-4 h-4 accent-brand-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-stone-600 leading-relaxed cursor-pointer">
                  Leí y acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(!showTerms)}
                    className="text-brand-600 hover:text-brand-700 font-medium underline"
                  >
                    términos y condiciones
                  </button>{' '}
                  de uso de la plataforma.
                </label>
              </div>
              {errors.terms_accepted && (
                <p className="error-message">{errors.terms_accepted.message}</p>
              )}

              {/* Términos expandibles */}
              {showTerms && (
                <div className="mt-3 p-4 bg-white border border-stone-200 rounded-xl text-xs text-stone-500 leading-relaxed space-y-3 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-stone-700">Términos y Condiciones — BarrioAnuncios v{TERMS_VERSION}</p>
                  <p>
                    <strong>1. Naturaleza del servicio:</strong> BarrioAnuncios es una herramienta digital 
                    para que vecinos del barrio publiquen anuncios. NO somos una inmobiliaria, 
                    no proveemos asesoramiento inmobiliario ni somos parte de ninguna transacción.
                  </p>
                  <p>
                    <strong>2. Responsabilidad del usuario:</strong> El usuario es exclusivamente responsable 
                    del contenido que publica, de la veracidad de la información y de las operaciones 
                    que realice con otros vecinos.
                  </p>
                  <p>
                    <strong>3. Pagos:</strong> Los pagos se procesan a través de MercadoPago. 
                    BarrioAnuncios no almacena datos de tarjetas. Los pagos son por el servicio 
                    de publicación, no garantizan ninguna transacción inmobiliaria.
                  </p>
                  <p>
                    <strong>4. Cuenta:</strong> El usuario es responsable de mantener la seguridad 
                    de su cuenta. Cada lote puede tener un solo anuncio activo a la vez.
                  </p>
                  <p>
                    <strong>5. Suspensión:</strong> BarrioAnuncios se reserva el derecho de suspender 
                    cuentas que violen estas condiciones sin previo aviso.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !termsAccepted}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando cuenta...
                </span>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
