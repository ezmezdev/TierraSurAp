// ============================================================
// EDGE FUNCTION: crear-anuncio
// Crea un anuncio con validación completa de backend.
// NUNCA confiar en el frontend para la lógica de negocio.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // 1. Autenticación: extraer y verificar JWT del usuario
    // --------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('No autorizado', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Cliente con el token del usuario (respeta RLS)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return errorResponse('No autorizado', 401)

    // Cliente admin para operaciones que requieren bypass de RLS
    const adminClient = createClient(supabaseUrl, serviceKey)

    // --------------------------------------------------------
    // 2. Verificar perfil: activo, no baneado, TyC aceptados
    // --------------------------------------------------------
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role, is_banned, terms_accepted')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return errorResponse('Perfil no encontrado', 404)
    if (profile.is_banned) return errorResponse('Cuenta suspendida', 403)
    if (!profile.terms_accepted) return errorResponse('Debes aceptar los términos y condiciones', 403)

    // --------------------------------------------------------
    // 3. Validar y sanitizar el body
    // --------------------------------------------------------
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return errorResponse('Body inválido', 400)
    }

    const { title, description, ad_type, lot_id, plan_id, asking_price, currency } = body

    // Validaciones básicas
    if (!title || typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 120) {
      return errorResponse('El título debe tener entre 5 y 120 caracteres', 400)
    }
    if (!description || typeof description !== 'string' || description.trim().length < 20) {
      return errorResponse('La descripción debe tener al menos 20 caracteres', 400)
    }
    if (!['sale', 'rent', 'service', 'other'].includes(ad_type as string)) {
      return errorResponse('Tipo de anuncio inválido', 400)
    }
    if (!lot_id || typeof lot_id !== 'string') {
      return errorResponse('Lote requerido', 400)
    }
    if (!plan_id || typeof plan_id !== 'string') {
      return errorResponse('Plan requerido', 400)
    }

    // --------------------------------------------------------
    // 4. Verificar que el lote existe y está activo
    // --------------------------------------------------------
    const { data: lot, error: lotError } = await adminClient
      .from('lots')
      .select('id, is_active')
      .eq('id', lot_id)
      .single()

    if (lotError || !lot || !lot.is_active) {
      return errorResponse('Lote no válido', 400)
    }

    // --------------------------------------------------------
    // 5. Verificar que no hay un anuncio activo para ese lote
    // El unique partial index ya lo enforce en DB, pero verificamos
    // antes para dar un mensaje de error claro al usuario.
    // --------------------------------------------------------
    const { data: existingAd } = await adminClient
      .from('ads')
      .select('id')
      .eq('lot_id', lot_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()

    if (existingAd) {
      return errorResponse('Este lote ya tiene un anuncio activo. Esperá a que venza para publicar uno nuevo.', 409)
    }

    // --------------------------------------------------------
    // 6. Verificar que el plan existe y está activo
    // --------------------------------------------------------
    const { data: plan, error: planError } = await adminClient
      .from('plans')
      .select('id, price, is_active')
      .eq('id', plan_id)
      .single()

    if (planError || !plan || !plan.is_active) {
      return errorResponse('Plan no válido', 400)
    }

    // --------------------------------------------------------
    // 7. Crear el anuncio en estado pending_payment
    // --------------------------------------------------------
    const { data: newAd, error: insertError } = await adminClient
      .from('ads')
      .insert({
        user_id: user.id,
        lot_id: lot_id,
        plan_id: plan_id,
        title: (title as string).trim(),
        description: (description as string).trim(),
        ad_type: ad_type,
        asking_price: asking_price ? Number(asking_price) : null,
        currency: (currency as string) || 'ARS',
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return errorResponse('Error al crear el anuncio', 500)
    }

    // Log de auditoría
    await adminClient.from('admin_logs').insert({
      actor_id: user.id,
      action: 'ad_created',
      target_table: 'ads',
      target_id: newAd.id,
      details: { plan_id, lot_id, ad_type },
    })

    return new Response(
      JSON.stringify({ ad_id: newAd.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Error interno del servidor', 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      headers: { 'Content-Type': 'application/json' },
      status,
    }
  )
}
