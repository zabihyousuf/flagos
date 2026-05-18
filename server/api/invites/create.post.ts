import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { team_id, player_id, email, role = 'player' } = body as {
    team_id: string
    player_id?: string | null
    email: string
    role?: 'player' | 'coach'
  }

  if (!team_id || !email) {
    throw createError({ statusCode: 400, statusMessage: 'team_id and email are required' })
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

  if (player_id) {
    const { data: teamPlayer, error: teamPlayerErr } = await admin
      .from('team_players')
      .select('id')
      .eq('team_id', team_id)
      .eq('player_id', player_id)
      .maybeSingle()

    if (teamPlayerErr) {
      throw createError({ statusCode: 400, statusMessage: teamPlayerErr.message })
    }
    if (!teamPlayer) {
      throw createError({ statusCode: 400, statusMessage: 'Player is not on this team' })
    }
  }

  const inviteRole = role === 'coach' ? 'coach' : 'player'

  // Create invite record
  const { data: invite, error: insertErr } = await admin
    .from('player_invites')
    .insert({
      team_id,
      player_id: player_id ?? null,
      email,
      invited_by: user.id,
      role: inviteRole,
    })
    .select()
    .single()

  if (insertErr || !invite) {
    throw createError({ statusCode: 500, statusMessage: insertErr?.message ?? 'Failed to create invite' })
  }

  // Send invite email via Resend (best-effort — don't fail the request if email fails)
  const resendKey = config.resendApiKey
  if (resendKey) {
    const inviteUrl = `${getRequestURL(event).origin}/join/${invite.token}`
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        from: 'FlagLab <noreply@mail.flaglab.app>',
        to: [email],
        subject: `You've been invited to join ${team.name} on FlagLab`,
        html: `
          <p>You've been invited to join <strong>${team.name}</strong> on FlagLab.</p>
          <p><a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invite</a></p>
          <p style="color:#6b7280;font-size:13px;">This invite expires in 7 days. If you weren't expecting this, you can ignore it.</p>
        `.trim(),
      },
    }).catch(() => null)
  }

  return invite
})
