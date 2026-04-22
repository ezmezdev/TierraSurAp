'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/utils/validations'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'

export function ChangePasswordForm() {
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordFormData) => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      // Verificar contraseña actual reautenticando
      const { data: { user } } = await supabase.auth.getUser()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: data.current_password,
      })

      if (signInError) {
        setError('La contraseña actual no es correcta.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.new_password,
      })

      if (updateError) { setError('Error al cambiar la contraseña.'); return }

      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-5">
      <h2 className="section-title">Cambiar contraseña</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> Contraseña actualizada correctamente
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {[
          { name: 'current_password' as const, label: 'Contraseña actual' },
          { name: 'new_password' as const, label: 'Nueva contraseña' },
          { name: 'confirm_new_password' as const, label: 'Confirmar nueva contraseña' },
        ].map(({ name, label }) => (
          <div key={name}>
            <label className="label">{label}</label>
            <div className="relative">
              <input
                {...register(name)}
                type={show ? 'text' : 'password'}
                className={cn('input-field pr-12', errors[name] && 'input-error')}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors[name] && <p className="error-message">{errors[name]?.message}</p>}
          </div>
        ))}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
