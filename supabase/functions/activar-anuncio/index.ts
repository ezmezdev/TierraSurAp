// ============================================================
// EDGE FUNCTION: activar-anuncio
// Activa un anuncio tras confirmación de pago aprobado.
// Solo puede ser llamada desde el webhook-mp con service role.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verificar que viene con service role (solo llamadas internas)
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.includes(serviceKey)) {
      return new Response('Forbidden', { status: 403 })
    }

    const { ad_id, mp_payment_id } = await req.json()

    if (!ad_id || !mp_payment_id) {
      return new Response(JSON.stringify({ error: 'Parámetros requeridos' }), { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    // Obtener el anuncio con su plan para calcular la expiración
    const { data: ad, error: adError } = await adminClient
      .from('ads')
      .select('id, status, user_id, plans(duration_days, name)')
      .eq('id', ad_id)
      .single()

    if (adError || !ad) {
      console.error('[activar-anuncio] Anuncio no encontrado:', ad_id)
      return new Response(JSON.stringify({ error: 'Anuncio no encontrado' }), { status: 404 })
    }

    // Idempotencia: si ya está activo, no hacer nada
    if (ad.status === 'active') {
      console.log('[activar-anuncio] Anuncio ya activo:', ad_id)
      return new Response(JSON.stringify({ ok: true, message: 'Ya activo' }), { status: 200 })
    }

    if (!['pending_payment', 'payment_failed'].includes(ad.status)) {
      console.error('[activar-anuncio] Estado inválido para activar:', ad.status)
      return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400 })
    }

    const plan = ad.plans as any
    const activatedAt = new Date()
    const expiresAt = new Date(activatedAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)

    // Activar el anuncio
    const { error: updateError } = await adminClient
      .from('ads')
      .update({
        status: 'active',
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', ad_id)

    if (updateError) {
      console.error('[activar-anuncio] Error al activar:', updateError)
      return new Response(JSON.stringify({ error: 'Error al activar' }), { status: 500 })
    }

    // Log de auditoría
    await adminClient.from('admin_logs').insert({
      actor_id: null, // Sistema automático
      action: 'ad_activated',
      target_table: 'ads',
      target_id: ad_id,
      details: {
        mp_payment_id,
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        duration_days: plan.duration_days,
      },
    })

    console.log(`[activar-anuncio] Anuncio ${ad_id} activado. Vence: ${expiresAt.toISOString()}`)

    return new Response(
      JSON.stringify({
        ok: true,
        ad_id,
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[activar-anuncio] Error inesperado:', error)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
})
