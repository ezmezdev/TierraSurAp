import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ============================================================
// WEBHOOK DE MERCADOPAGO
// Este endpoint recibe notificaciones de MercadoPago.
//
// SEGURIDAD:
// 1. Verificamos la firma HMAC antes de procesar nada
// 2. No confiamos en el body — solo en la verificación posterior
// 3. Delegamos la lógica de negocio a la Edge Function de Supabase
// 4. Siempre respondemos 200 para no dar info a atacantes
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature') ?? ''
    const requestId = request.headers.get('x-request-id') ?? ''

    // --------------------------------------------------------
    // 1. Verificar firma HMAC de MercadoPago
    // Formato: ts=<timestamp>,v1=<hash>
    // --------------------------------------------------------
    const isValid = verifyMPSignature(body, signature, requestId)

    if (!isValid) {
      // No revelar detalles del error — solo loggear internamente
      console.error('[Webhook MP] Firma inválida', { signature, requestId })
      // Responder 200 para que MP no reintente indefinidamente
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // --------------------------------------------------------
    // 2. Parsear el body para obtener el tipo de evento
    // --------------------------------------------------------
    let payload: { type?: string; data?: { id?: string }; action?: string }
    try {
      payload = JSON.parse(body)
    } catch {
      console.error('[Webhook MP] Body inválido')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Solo procesar eventos de pago
    if (payload.type !== 'payment' || !payload.data?.id) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // --------------------------------------------------------
    // 3. Delegar procesamiento a Edge Function de Supabase
    // La Edge Function verifica el pago directamente con la API de MP
    // y actualiza la base de datos con service role.
    // --------------------------------------------------------
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/webhook-mp`

    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Usamos una clave interna compartida para que la Edge Function
        // sepa que la llamada viene de nuestro servidor, no de internet
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'x-internal-secret': process.env.MP_WEBHOOK_SECRET!,
      },
      body: JSON.stringify({
        payment_id: payload.data.id,
        type: payload.type,
        action: payload.action,
      }),
    })

    if (!edgeResponse.ok) {
      const errText = await edgeResponse.text()
      console.error('[Webhook MP] Edge Function error:', errText)
      // Retornar 200 igual para no causar reintentos infinitos de MP
    }

    // MP espera 200 OK para considerar el webhook entregado
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Webhook MP] Error inesperado:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ============================================================
// VERIFICACIÓN DE FIRMA HMAC
// Documentación MP: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
// ============================================================
function verifyMPSignature(body: string, signature: string, requestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Webhook MP] MP_WEBHOOK_SECRET no configurado')
    return false
  }

  try {
    // Parsear la firma: ts=<timestamp>,v1=<hash>
    const parts = signature.split(',')
    const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1]
    const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1]

    if (!ts || !v1) return false

    // Construir el string a firmar según la spec de MP
    const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`

    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex')

    // Comparación segura para prevenir timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )
  } catch {
    return false
  }
}

// GET para verificación de Cloudflare / health check
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
