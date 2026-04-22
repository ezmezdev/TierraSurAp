// ============================================================
// EDGE FUNCTION: expirar-anuncios
// Cron job diario para expirar anuncios vencidos y
// enviar alertas de vencimiento próximo.
//
// Configurar en Supabase como cron job:
// Schedule: 0 6 * * * (todos los días a las 06:00 UTC = 03:00 ART)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceKey)

    const now = new Date().toISOString()
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // --------------------------------------------------------
    // 1. Expirar anuncios vencidos
    // --------------------------------------------------------
    const { data: expired, error: expireError } = await adminClient
      .from('ads')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lte('expires_at', now)
      .is('deleted_at', null)
      .select('id, user_id, title')

    if (expireError) {
      console.error('[expirar-anuncios] Error al expirar:', expireError)
    }

    const expiredCount = expired?.length ?? 0
    console.log(`[expirar-anuncios] ${expiredCount} anuncios expirados`)

    // --------------------------------------------------------
    // 2. Enviar alertas de vencimiento próximo (en 7 días)
    //    Solo a los que no recibieron alerta aún
    // --------------------------------------------------------
    const { data: expiringSoon, error: alertError } = await adminClient
      .from('ads')
      .select('id, user_id, title, expires_at, profiles(display_name)')
      .eq('status', 'active')
      .eq('expiry_alert_sent', false)
      .lte('expires_at', sevenDaysFromNow)
      .gt('expires_at', now)
      .is('deleted_at', null)

    if (!alertError && expiringSoon && expiringSoon.length > 0) {
      // Marcar como alerta enviada (antes de enviar, para idempotencia)
      const ids = expiringSoon.map((a: any) => a.id)
      await adminClient
        .from('ads')
        .update({ expiry_alert_sent: true })
        .in('id', ids)

      // Aquí se integraría el servicio de emails (Resend, Supabase Emails, etc.)
      // Por ahora loggeamos — reemplazar con llamada a API de emails
      for (const ad of expiringSoon) {
        const profile = (ad as any).profiles
        const daysLeft = Math.ceil(
          (new Date((ad as any).expires_at).getTime() - Date.now()) / 86400000
        )
        console.log(
          `[expirar-anuncios] Alerta: "${(ad as any).title}" vence en ${daysLeft} días. Usuario: ${profile?.display_name}`
        )
        // TODO: await sendExpiryAlert({ ad, profile, daysLeft })
      }
    }

    // Log de auditoría
    if (expiredCount > 0) {
      await adminClient.from('admin_logs').insert({
        actor_id: null,
        action: 'ad_expired',
        target_table: 'ads',
        details: {
          expired_count: expiredCount,
          alert_count: expiringSoon?.length ?? 0,
          executed_at: now,
        },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        expired: expiredCount,
        alerts_sent: expiringSoon?.length ?? 0,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[expirar-anuncios] Error inesperado:', error)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
})
