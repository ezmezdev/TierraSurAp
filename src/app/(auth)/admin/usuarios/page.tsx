import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import { UserActionsMenu } from '@/components/admin/UserActionsMenu'

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string }
}) {
  const adminSupabase = await createAdminClient()

  let query = adminSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchParams.q) {
    query = query.ilike('display_name', `%${searchParams.q}%`)
  }
  if (searchParams.role) {
    query = query.eq('role', searchParams.role)
  }

  const { data: users } = await query.limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Usuarios</h1>
        <p className="text-stone-500 mt-1">{users?.length ?? 0} usuarios registrados</p>
      </div>

      {/* Filtros */}
      <div className="card">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="q"
            defaultValue={searchParams.q}
            type="search"
            placeholder="Buscar por nombre..."
            className="input-field flex-1"
          />
          <select name="role" defaultValue={searchParams.role} className="input-field sm:w-40">
            <option value="">Todos los roles</option>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
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
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-6 py-3">Usuario</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">Rol</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-6 py-3 hidden md:table-cell">TyC</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-6 py-3 hidden lg:table-cell">Registro</th>
                <th className="text-left text-xs font-medium text-stone-400 uppercase tracking-wide px-6 py-3">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 text-xs font-semibold">
                          {user.display_name?.[0]?.toUpperCase() ?? 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">{user.display_name}</p>
                        <p className="text-xs text-stone-400">{user.phone ?? 'Sin teléfono'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={cn(
                      'badge',
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={cn(
                      'badge',
                      user.terms_accepted
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    )}>
                      {user.terms_accepted ? 'Aceptados' : 'Pendientes'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500 hidden lg:table-cell">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned ? (
                      <span className="badge bg-red-100 text-red-700 border-red-200">Baneado</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-700 border-green-200">Activo</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <UserActionsMenu userId={user.id} currentRole={user.role} isBanned={user.is_banned} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!users || users.length === 0) && (
            <div className="text-center py-12 text-stone-400">
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
