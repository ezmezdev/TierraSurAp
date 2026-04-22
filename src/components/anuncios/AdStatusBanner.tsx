'use client'

import { CheckCircle, Clock, XCircle } from 'lucide-react'

export function AdStatusBanner({ pagoStatus }: { pagoStatus: string }) {
  if (pagoStatus === 'success') {
    return (
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl animate-slide-up">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">¡Pago recibido!</p>
          <p className="text-sm text-green-700 mt-0.5">
            Tu pago fue procesado. El anuncio se activará automáticamente en unos momentos.
            Si no se activa en 5 minutos, contactá a soporte.
          </p>
        </div>
      </div>
    )
  }

  if (pagoStatus === 'pending') {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Pago pendiente</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Tu pago está siendo procesado. Te notificaremos cuando se confirme.
          </p>
        </div>
      </div>
    )
  }

  if (pagoStatus === 'failure') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Pago no completado</p>
          <p className="text-sm text-red-700 mt-0.5">
            Hubo un problema con el pago. Podés intentarlo nuevamente cuando quieras.
          </p>
        </div>
      </div>
    )
  }

  return null
}
