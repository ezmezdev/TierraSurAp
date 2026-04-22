'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { updateProfileSchema, type UpdateProfileFormData } from '@/lib/utils/validations'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import type { Profile } from '@/types'

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const onSubmit = async (data: UpdateProfileFormData) => {
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('profiles')
        .update({ display_name: data.display_name, phone: data.phone || null })
        .eq('id', profile?.id ?? '')

      if (err) { setError('Error al guardar. Intentá de nuevo.'); return }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-5">
      <h2 className="section-title">Datos personales</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> Perfil actualizado correctamente
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div>
          <label className="label">Nombre completo</label>
          <input {...register('display_name')} type="text" className={cn('input-field', errors.display_name && 'input-error')} />
          {errors.display_name && <p className="error-message">{errors.display_name.message}</p>}
        </div>
        <div>
          <label className="label">Teléfono <span className="text-stone-400 font-normal">(opcional)</span></label>
          <input {...register('phone')} type="tel" className={cn('input-field', errors.phone && 'input-error')} />
          {errors.phone && <p className="error-message">{errors.phone.message}</p>}
        </div>
        <button type="submit" disabled={saving || !isDirty} className="btn-primary">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
