import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const requestId = getRouterParam(event, 'id')
  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: 'Request ID is required' })
  }

  const body = await readBody(event)
  const { decision } = body as { decision: 'approved' | 'rejected' }
  if (decision !== 'approved' && decision !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'decision must be approved or rejected' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured' })
  }

  const admin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch the request and verify caller owns the team
  const { data: request } = await admin
    .from('team_join_requests')
    .select('id, user_id, team_id, status, team:teams(id, name, user_id)')
    .eq('id', requestId)
    .single()

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  const team = Array.isArray(request.team) ? request.team[0] : request.team
  if (!team || (team as { user_id: string }).user_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not the team owner' })
  }

  if (request.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Request already responded to' })
  }

  // Update request status
  await admin
    .from('team_join_requests')
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq('id', requestId)

  // If approved: create membership and notify the requester
  if (decision === 'approved') {
    await admin
      .from('team_memberships')
      .upsert({ team_id: request.team_id, user_id: request.user_id }, { onConflict: 'team_id,user_id' })

    const teamName = (team as { name: string }).name
    await admin.from('notifications').insert({
      user_id: request.user_id,
      type: 'join_approved',
      title: `You've joined ${teamName}`,
      message: `Your request to join ${teamName} has been approved.`,
      metadata: { team_id: request.team_id, team_name: teamName },
    })
  } else {
    const teamName = (team as { name: string }).name
    await admin.from('notifications').insert({
      user_id: request.user_id,
      type: 'join_rejected',
      title: `Join request declined`,
      message: `Your request to join ${teamName} was not approved.`,
      metadata: { team_id: request.team_id, team_name: teamName },
    })
  }

  return { success: true, decision }
})
