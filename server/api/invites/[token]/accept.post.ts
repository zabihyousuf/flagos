import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token is required' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured' })
  }

  const admin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch and validate invite with service role (bypasses RLS)
  const { data: invite } = await admin
    .from('player_invites')
    .select('id, team_id, player_id, email, expires_at, used_at, invited_by, role')
    .eq('token', token)
    .single()

  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }
  if (invite.used_at) {
    throw createError({ statusCode: 410, statusMessage: 'Invite already used' })
  }
  if (new Date(invite.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Invite expired' })
  }

  const invitedEmail = String(invite.email ?? '').trim().toLowerCase()
  const signedInEmail = user.email?.trim().toLowerCase()
  if (!signedInEmail || signedInEmail !== invitedEmail) {
    throw createError({ statusCode: 403, statusMessage: 'This invite is for a different email address' })
  }

  const inviteRole = invite.role === 'coach' ? 'coach' : 'player'

  if (invite.player_id) {
    const { data: teamPlayer, error: playerErr } = await admin
      .from('team_players')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('player_id', invite.player_id)
      .maybeSingle()

    if (playerErr) {
      throw createError({ statusCode: 500, statusMessage: playerErr.message ?? 'Failed to verify invited player' })
    }
    if (!teamPlayer) {
      throw createError({ statusCode: 403, statusMessage: 'Invite player is not on this team' })
    }
  }

  // Create team membership (upsert — idempotent if already a member)
  const { data: membership, error: memberErr } = await admin
    .from('team_memberships')
    .upsert({ team_id: invite.team_id, user_id: user.id, role: inviteRole }, { onConflict: 'team_id,user_id' })
    .select()
    .single()

  if (memberErr) {
    throw createError({ statusCode: 500, statusMessage: memberErr.message })
  }

  // Mark invite as used
  const { data: usedInvite, error: usedErr } = await admin
    .from('player_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()

  if (usedErr) {
    throw createError({ statusCode: 500, statusMessage: usedErr.message ?? 'Failed to consume invite' })
  }
  if (!usedInvite) {
    throw createError({ statusCode: 410, statusMessage: 'Invite already used' })
  }

  // Link player roster row to auth account if player_id was specified
  if (invite.player_id) {
    const { error: linkErr } = await admin
      .from('players')
      .update({ linked_user_id: user.id })
      .eq('id', invite.player_id)

    if (linkErr) {
      throw createError({ statusCode: 500, statusMessage: linkErr.message ?? 'Failed to link invited player' })
    }
  }

  // Update profile account_type based on the invite role (only if it demotes: player invite → player)
  if (inviteRole === 'player') {
    await admin
      .from('profiles')
      .update({ account_type: 'player' })
      .eq('id', user.id)
      .eq('account_type', 'manager')
  }

  // Fetch team info to check coach's subscription for plan inheritance
  const { data: sub } = await admin
    .from('team_subscriptions')
    .select('plan, status')
    .eq('user_id', invite.invited_by)
    .single()

  return {
    membership,
    team_id: invite.team_id,
    inherited_plan: sub?.plan === 'pro' && sub?.status === 'active' ? 'pro' : 'free',
  }
})
