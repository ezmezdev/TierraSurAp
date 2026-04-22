import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm'
import { formatDate } from '@/lib/utils/helpers'
import { Shield, Calendar } from 'lucide-react'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title">Mi Perfil</h1>
        <p className="text-stone-500 mt-1">Gestioná tu información personal</p>
      </div>

      {/* Info de cuenta */}
      <div className="card space-y-3">
        <h2 className="section-title">Información de cuenta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-stone-500">
            <Calendar className="w-4 h-4" />
            <span>Miembro desde {formatDate(profile?.created_at ?? '')}</span>
          </div>
          {profile?.terms_accepted_at && (
            <div className="flex items-center gap-2 text-stone-500">
              <Shield className="w-4 h-4 text-brand-500" />
              <span>TyC aceptados el {formatDate(profile.terms_accepted_at)}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-stone-400">
          Email: <span className="text-stone-700 font-medium">{user?.email}</span>
        </p>
      </div>

      {/* Formulario de perfil */}
      <ProfileForm profile={profile} />

      {/* Cambio de contraseña */}
      <ChangePasswordForm />
    </div>
  )
}
