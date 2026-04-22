// ============================================================
// EDGE FUNCTION: webhook-mp
// Procesa los webhooks de MercadoPago DESPUÉS de que el
// API Route de Next.js verificó la firma HMAC.
//
// PRINCIPIO CRÍTICO DE SEGURIDAD:
// NO confiamos en el body del webhook para el status del pago.
// Consultamos directamente la API de MercadoPago con nuestras
// credenciales para verificar el estado real del pago.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import MercadoPago from 'https://esm.sh/mercadopago@2'

Deno.serve(async (req: Request) => {
  // Solo aceptar llamadas internas (desde nuestro API Route)
  const internalSecret = req.headers.get('x-internal-secret')
  const expectedSecret = Deno.env.get('MP_WEBHOOK_SECRET')

  if (!internalSecret || internalSecret !== expectedSecret) {
    console.error('[webhook-mp] Secret inválido')
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!

    const adminClient = createClient(supabaseUrl, serviceKey)
    const mp = new MercadoPago({ accessToken: mpAccessToken })

    const { payment_id, type } = await req.json()

    if (!payment_id || type !== 'payment') {
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // ----------------------------------------------------------
    // PASO CRÍTICO: Verificar el pago consultando la API de MP
    // NUNCA usar el status del body del webhook directamente.
    // Un atacante podría forjar un webhook con status "approved".
    // ----------------------------------------------------------
    const mpPayment = await mp.payment.get({ id: payment_id })

    if (!mpPayment) {
      console.error(`[webhook-mp] Pago ${payment_id} no encontrado en MP`)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const mpStatus = mpPayment.status
    const externalReference = mpPayment.external_reference // = ad_id

    if (!externalReference) {
      console.error(`[webhook-mp] Sin external_reference en pago ${payment_id}`)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // Registrar evento de auditoría (siempre, independiente del resultado)
    const { data: paymentRecord } = await adminClient
      .from('payments')
      .select('id')
      .eq('ad_id', externalReference)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (paymentRecord) {
      await adminClient.from('payment_events').insert({
        payment_id: paymentRecord.id,
        event_type: `mp_${mpStatus}`,
        payload: {
          mp_payment_id: payment_id,
          mp_status: mpStatus,
          mp_status_detail: mpPayment.status_detail,
          amount: mpPayment.transaction_amount,
          verified_at: new Date().toISOString(),
        },
        source: 'api_verification',
      })
    }

    // ----------------------------------------------------------
    // Actualizar el estado del pago en nuestra DB
    // ----------------------------------------------------------
    const internalStatus =
      mpStatus === 'approved' ? 'approved' :
      mpStatus === 'rejected' ? 'rejected' :
      mpStatus === 'cancelled' ? 'cancelled' : 'pending'

    await adminClient
      .from('payments')
      .update({
        mp_payment_id: String(payment_id),
        mp_status: mpStatus,
        mp_status_detail: mpPayment.status_detail,
        status: internalStatus,
        webhook_received_at: new Date().toISOString(),
        webhook_verified_at: new Date().toISOString(),
      })
      .eq('ad_id', externalReference)
      .eq('status', 'pending')

    // ----------------------------------------------------------
    // Si el pago fue aprobado → activar el anuncio
    // ----------------------------------------------------------
    if (mpStatus === 'approved') {
      const activarUrl = `${supabaseUrl}/functions/v1/activar-anuncio`
      await fetch(activarUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          ad_id: externalReference,
          mp_payment_id: payment_id,
        }),
      })
    }

    // Si fue rechazado → actualizar estado del anuncio
    if (mpStatus === 'rejected') {
      await adminClient
        .from('ads')
        .update({
          status: 'payment_failed',
          rejection_reason: mpPayment.status_detail,
        })
        .eq('id', externalReference)

      await adminClient.from('admin_logs').insert({
        actor_id: null,
        action: 'payment_rejected',
        target_table: 'ads',
        target_id: externalReference,
        details: { mp_payment_id: payment_id, mp_status_detail: mpPayment.status_detail },
      })
    }

    return new Response(JSON.stringify({ ok: true, status: mpStatus }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[webhook-mp] Error:', error)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
})
