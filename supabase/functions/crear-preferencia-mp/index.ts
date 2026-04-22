// ============================================================
// EDGE FUNCTION: crear-preferencia-mp
// Crea una preferencia de pago en MercadoPago.
//
// SEGURIDAD CRÍTICA:
// - El access token de MP NUNCA llega al frontend
// - Solo esta función tiene acceso a las credenciales de MP
// - Verificamos ownership del anuncio antes de crear la preferencia
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import MercadoPago from 'https://esm.sh/mercadopago@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --------------------------------------------------------
    // 1. Autenticación
    // --------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('No autorizado', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const appUrl = Deno.env.get('APP_URL')!
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return errorResponse('No autorizado', 401)

    const adminClient = createClient(supabaseUrl, serviceKey)

    // --------------------------------------------------------
    // 2. Obtener y validar el ad_id del body
    // --------------------------------------------------------
    const { ad_id } = await req.json()
    if (!ad_id || typeof ad_id !== 'string') {
      return errorResponse('ad_id requerido', 400)
    }

    // --------------------------------------------------------
    // 3. Verificar que el anuncio existe, pertenece al usuario
    //    y está en estado correcto para pagar
    // --------------------------------------------------------
    const { data: ad, error: adError } = await adminClient
      .from('ads')
      .select('id, user_id, status, title, plans(id, price, currency, name, duration_days), lots(lot_identifier)')
      .eq('id', ad_id)
      .single()

    if (adError || !ad) return errorResponse('Anuncio no encontrado', 404)
    if (ad.user_id !== user.id) return errorResponse('No autorizado', 403)
    if (!['pending_payment', 'payment_failed'].includes(ad.status)) {
      return errorResponse('El anuncio no puede ser pagado en su estado actual', 400)
    }

    const plan = ad.plans as any
    const lot = ad.lots as any

    // --------------------------------------------------------
    // 4. Crear preferencia en MercadoPago
    // --------------------------------------------------------
    const mp = new MercadoPago({ accessToken: mpAccessToken })

    const preference = await mp.preferences.create({
      body: {
        items: [
          {
            id: ad_id,
            title: `Publicación: ${ad.title}`,
            description: `${plan.name} — Lote ${lot?.lot_identifier ?? ''}`,
            quantity: 1,
            currency_id: plan.currency || 'ARS',
            unit_price: Number(plan.price),
          },
        ],
        external_reference: ad_id, // Clave para correlacionar en el webhook
        back_urls: {
          success: `${appUrl}/dashboard/anuncios/${ad_id}?pago=success`,
          failure: `${appUrl}/dashboard/anuncios/${ad_id}/pagar?pago=failure`,
          pending: `${appUrl}/dashboard/anuncios/${ad_id}?pago=pending`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
        statement_descriptor: 'BARRIOANUNCIOS',
        expires: true,
        // La preferencia vence en 24 horas
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    if (!preference.id || !preference.init_point) {
      return errorResponse('Error al crear la preferencia de pago', 500)
    }

    // --------------------------------------------------------
    // 5. Registrar el pago pendiente en nuestra DB
    // --------------------------------------------------------
    const { error: paymentError } = await adminClient
      .from('payments')
      .upsert(
        {
          ad_id: ad_id,
          user_id: user.id,
          plan_id: plan.id,
          mp_preference_id: preference.id,
          status: 'pending',
          amount: plan.price,
          currency: plan.currency || 'ARS',
        },
        { onConflict: 'mp_preference_id' }
      )

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      // No fatal — el webhook puede recuperarse
    }

    // Log
    await adminClient.from('admin_logs').insert({
      actor_id: user.id,
      action: 'payment_created',
      target_table: 'payments',
      details: { ad_id, preference_id: preference.id, amount: plan.price },
    })

    return new Response(
      JSON.stringify({
        preference_id: preference.id,
        init_point: preference.init_point, // URL de MP — solo esto va al frontend
        ad_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error creating preference:', error)
    return errorResponse('Error interno al crear el pago', 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
