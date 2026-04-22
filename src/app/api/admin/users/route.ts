import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ============================================================
// API ROUTE: /api/admin/users
// Gestión de usuarios desde el panel admin.
// SEGURIDAD: Verifica rol admin en servidor antes de ejecutar.
// Usa service role para cambios de rol y ban.
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    // 1. Verificar sesión y rol del solicitante
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el solicitante es admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin' || adminProfile.is_banned) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 2. Parsear y validar el body
    const body = await request.json()
    const { user_id, action } = body

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
    }

    if (!['ban', 'unban', 'promote', 'demote'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    // No permitir que un admin se modifique a sí mismo
    if (user_id === user.id) {
      return NextResponse.json({ error: 'No podés modificar tu propia cuenta' }, { status: 400 })
    }

    // 3. Ejecutar la acción con service role (bypasea RLS)
    const adminClient = await createAdminClient()

    let updateData: Record<string, unknown> = {}
    let logAction = ''

    switch (action) {
      case 'ban':
        updateData = { is_banned: true, banned_at: new Date().toISOString() }
        logAction = 'user_banned'
        break
      case 'unban':
        updateData = { is_banned: false, banned_at: null, banned_reason: null }
        logAction = 'user_banned' // mismo tipo, details indicará "unban"
        break
      case 'promote':
        updateData = { role: 'admin' }
        logAction = 'user_role_changed'
        break
      case 'demote':
        updateData = { role: 'user' }
        logAction = 'user_role_changed'
        break
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', user_id)

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 })
    }

    // 4. Registrar en audit log
    await adminClient.from('admin_logs').insert({
      actor_id: user.id,
      action: logAction,
      target_table: 'profiles',
      target_id: user_id,
      details: { action, changes: updateData },
      ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
