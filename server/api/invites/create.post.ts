import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { LINK_ONLY_INVITE_EMAIL } from '~/lib/constants'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { team_id, player_id, role = 'player' } = body as {
    team_id: string
    player_id?: string | null
    role?: 'player' | 'coach'
  }

  if (!team_id) {
    throw createError({ statusCode: 400, statusMessage: 'team_id is required' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured: missing SUPABASE_SERVICE_KEY' })
  }

  const admin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the caller owns the team OR is a coach member
  const { data: team, error: teamErr } = await admin
    .from('teams')
    .select('id, name, user_id')
    .eq('id', team_id)
    .single()

  const isMemberCoach = !teamErr && team && team.user_id !== user.id
    ? await admin
        .from('team_memberships')
        .select('id')
        .eq('team_id', team_id)
        .eq('user_id', user.id)
        .eq('role', 'coach')
        .maybeSingle()
        .then(r => !!r.data)
    : false

  if (teamErr || !team || (team.user_id !== user.id && !isMemberCoach)) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to invite for this team' })
  }

  const { data: invite, error: insertErr } = await admin
    .from('player_invites')
    .insert({
      team_id,
      player_id: player_id ?? null,
      email: LINK_ONLY_INVITE_EMAIL,
      invited_by: user.id,
      role,
    })
    .select()
    .single()

  if (insertErr || !invite) {
    throw createError({ statusCode: 500, statusMessage: insertErr?.message ?? 'Failed to create invite' })
  }

  return invite
})
