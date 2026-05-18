import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { team_id, type, title, message, metadata } = body as {
    team_id: string
    type: string
    title: string
    message?: string
    metadata?: Record<string, unknown>
  }

  if (!team_id || !type || !title) {
    throw createError({ statusCode: 400, statusMessage: 'team_id, type, and title are required' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured' })
  }

  const admin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller owns the team or is a member
  const { data: team } = await admin
    .from('teams')
    .select('id, user_id')
    .eq('id', team_id)
    .single()

  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  const isOwner = team.user_id === user.id
  if (!isOwner) {
    // Verify caller is a team member
    const { data: membership } = await admin
      .from('team_memberships')
      .select('id')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single()
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: 'Not a team member or owner' })
    }
  }

  // Get all team members (excluding the sender)
  const { data: members } = await admin
    .from('team_memberships')
    .select('user_id')
    .eq('team_id', team_id)
    .neq('user_id', user.id)

  // Also notify the coach if caller is a player
  const recipientIds = new Set<string>((members ?? []).map((m: { user_id: string }) => m.user_id))
  if (!isOwner) recipientIds.add(team.user_id)

  if (recipientIds.size === 0) {
    return { notified_count: 0 }
  }

  const rows = Array.from(recipientIds).map((uid) => ({
    user_id: uid,
    type,
    title,
    message: message ?? null,
    metadata: metadata ?? null,
  }))

  await admin.from('notifications').insert(rows)

  return { notified_count: rows.length }
})
