import { createClient } from '@supabase/supabase-js'
import { isLinkOnlyInviteEmail } from '~/lib/constants'

export default defineEventHandler(async (event) => {
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

  const { data: invite, error } = await admin
    .from('player_invites')
    .select('id, email, expires_at, used_at, team:teams(id, name, description), player:players(id, name)')
    .eq('token', token)
    .single()

  if (error || !invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  if (invite.used_at) {
    throw createError({ statusCode: 410, statusMessage: 'Invite already used' })
  }

  if (new Date(invite.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Invite expired' })
  }

  return {
    email: isLinkOnlyInviteEmail(invite.email) ? null : invite.email,
    team: invite.team,
    player: (Array.isArray(invite.player) ? invite.player[0] : invite.player) as { id: string; name: string } | null,
    expires_at: invite.expires_at,
  }
})
