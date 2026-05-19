import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const jobId = getRouterParam(event, 'id')
  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing job id' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw createError({ statusCode: 503, statusMessage: 'Server misconfigured: missing SUPABASE_SERVICE_KEY' })
  }

  const supabase = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: job, error: jobErr } = await supabase
    .from('sim_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (jobErr) {
    throw createError({ statusCode: 400, statusMessage: jobErr.message ?? 'Failed to verify job ownership' })
  }
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const { error: recordingsErr } = await supabase.from('sim_recordings').delete().eq('job_id', jobId)
  if (recordingsErr) {
    throw createError({ statusCode: 400, statusMessage: recordingsErr.message ?? 'Failed to delete job recordings' })
  }

  const { error: resultsErr } = await supabase.from('sim_results').delete().eq('job_id', jobId)
  if (resultsErr) {
    throw createError({ statusCode: 400, statusMessage: resultsErr.message ?? 'Failed to delete job results' })
  }

  const { error: insightsErr } = await supabase.from('sim_insights').delete().eq('job_id', jobId).eq('user_id', user.id)
  if (insightsErr) {
    throw createError({ statusCode: 400, statusMessage: insightsErr.message ?? 'Failed to delete job insights' })
  }

  const { error: notificationsErr } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('metadata->>job_id', jobId)
  if (notificationsErr) {
    throw createError({ statusCode: 400, statusMessage: notificationsErr.message ?? 'Failed to delete job notifications' })
  }

  const { data: deletedJob, error } = await supabase
    .from('sim_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message ?? 'Failed to delete job' })
  }
  if (!deletedJob) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  return { success: true }
})
