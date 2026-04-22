'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Shield, ShieldOff, Ban, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  currentRole: string
  isBanned: boolean
}

export function UserActionsMenu({ userId, currentRole, isBanned }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const executeAction = async (action: 'ban' | 'unban' | 'promote' | 'demote') => {
    setLoading(true)
    setOpen(false)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Todas las acciones de admin van a través de API Route segura
      // que usa service role en el servidor
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId, action }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al ejecutar la acción')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
            {currentRole === 'user' ? (
              <button
                onClick={() => executeAction('promote')}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
              >
                <Shield className="w-4 h-4 text-purple-500" />
                Hacer admin
              </button>
            ) : (
              <button
                onClick={() => executeAction('demote')}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
              >
                <ShieldOff className="w-4 h-4 text-stone-400" />
                Quitar admin
              </button>
            )}
            {isBanned ? (
              <button
                onClick={() => executeAction('unban')}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
                Desbanear
              </button>
            ) : (
              <button
                onClick={() => executeAction('ban')}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" />
                Suspender cuenta
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
