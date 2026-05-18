import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a play in a playbook the player can access via team sharing.
 * If the team has no shared playbooks yet, creates one under the coach's account,
 * shares it with the team, and notifies the coach.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { team_id, play_name, play_type, canvas_data, formation, playbook_id: requestedPlaybookId } = body as {
    team_id: string
    play_name: string
    play_type: 'offense' | 'defense'
    canvas_data?: object
    formation?: string
    playbook_id?: string
  }

  if (!team_id || !play_name || !play_type) {
    throw createError({ statusCode: 400, statusMessage: 'team_id, play_name, and play_type are required' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured' })
  }

  const admin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller is a member of the team
  const { data: membership } = await admin
    .from('team_memberships')
    .select('id, team:teams(id, user_id, name)')
    .eq('team_id', team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Not a team member' })
  }

  const team = Array.isArray(membership.team) ? membership.team[0] : membership.team
  const coachId = (team as { user_id: string }).user_id
  const teamName = (team as { name: string }).name

  let playbookId = requestedPlaybookId ?? null

  if (playbookId) {
    const { data: sharedPlaybook, error: sharedErr } = await admin
      .from('team_playbooks')
      .select('id')
      .eq('team_id', team_id)
      .eq('playbook_id', playbookId)
      .maybeSingle()

    if (sharedErr) {
      throw createError({ statusCode: 400, statusMessage: sharedErr.message ?? 'Failed to validate playbook access' })
    }
    if (!sharedPlaybook) {
      throw createError({ statusCode: 403, statusMessage: 'Playbook is not shared with this team' })
    }
  } else {
    // Find an existing shared playbook for this team
    const { data: shared } = await admin
      .from('team_playbooks')
      .select('playbook_id')
      .eq('team_id', team_id)
      .limit(1)
      .single()

    if (shared) {
      playbookId = shared.playbook_id
    } else {
      // Create a new playbook under the coach's account and share it
      const { data: newPlaybook } = await admin
        .from('playbooks')
        .insert({ user_id: coachId, name: `${teamName} Playbook`, description: 'Shared team playbook' })
        .select('id')
        .single()

      if (!newPlaybook) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create playbook' })
      }

      playbookId = newPlaybook.id

      await admin.from('team_playbooks').insert({
        team_id,
        playbook_id: playbookId,
        shared_by: coachId,
      })

      // Notify the coach that a playbook was auto-created
      await admin.from('notifications').insert({
        user_id: coachId,
        type: 'player_created_play',
        title: 'Shared playbook created',
        message: `A shared playbook was automatically created for ${teamName} when a player added a play.`,
        metadata: { team_id, playbook_id: playbookId },
      })
    }
  }

  // Insert the play under the player's user_id (authorship tracked)
  const { data: play, error: playErr } = await admin
    .from('plays')
    .insert({
      user_id: user.id,
      playbook_id: playbookId,
      name: play_name,
      play_type,
      formation: formation ?? '',
      canvas_data: canvas_data ?? { players: [], version: 1, annotations: [] },
    })
    .select('id, playbook_id')
    .single()

  if (playErr || !play) {
    throw createError({ statusCode: 500, statusMessage: playErr?.message ?? 'Failed to create play' })
  }

  return { play_id: play.id, playbook_id: play.playbook_id }
})
