'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, MapPin, AlertCircle } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/utils/validations'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        // No revelar si el email existe o no (seguridad)
        setServerError('Email o contraseña incorrectos.')
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setServerError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
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
            Bienvenido de vuelta
          </h1>
          <p className="text-stone-500 mt-2">Ingresá a tu cuenta</p>
        </div>

        <div className="card animate-slide-up">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {serverError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="juan@ejemplo.com"
                className={cn('input-field', errors.email && 'input-error')}
              />
              {errors.email && <p className="error-message">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Contraseña</label>
                <Link href="/recuperar-password" className="text-xs text-brand-600 hover:text-brand-700">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
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
              {errors.password && <p className="error-message">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
