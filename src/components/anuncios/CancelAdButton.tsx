'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function CancelAdButton({ adId }: { adId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    if (!confirming) { setConfirming(true); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('ads')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', adId)
        .eq('status', 'pending_payment') // Solo si sigue en pending

      if (error) {
        alert('No se pudo cancelar el anuncio.')
        return
      }

      router.push('/dashboard/anuncios')
      router.refresh()
    } catch {
      alert('Error de conexión.')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className={`btn-danger flex items-center gap-2 text-sm ${confirming ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}
    >
      <Trash2 className="w-4 h-4" />
      {loading ? 'Cancelando...' : confirming ? '¿Confirmar cancelación?' : 'Cancelar anuncio'}
    </button>
  )
}
