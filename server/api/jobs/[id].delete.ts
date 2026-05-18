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

  const { data: job, error: jobError } = await supabase
    .from('sim_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (jobError) {
    throw createError({ statusCode: 400, statusMessage: jobError.message ?? 'Failed to verify job ownership' })
  }
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const resultCleanup = await supabase.from('sim_results').delete().eq('job_id', jobId)
  if (resultCleanup.error) {
    throw createError({ statusCode: 400, statusMessage: resultCleanup.error.message ?? 'Failed to delete job results' })
  }

  const recordingCleanup = await supabase.from('sim_recordings').delete().eq('job_id', jobId)
  if (recordingCleanup.error) {
    throw createError({ statusCode: 400, statusMessage: recordingCleanup.error.message ?? 'Failed to delete job recordings' })
  }

  const insightCleanup = await supabase.from('sim_insights').delete().eq('job_id', jobId)
  if (insightCleanup.error) {
    throw createError({ statusCode: 400, statusMessage: insightCleanup.error.message ?? 'Failed to delete job insights' })
  }

  const notificationCleanup = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('metadata->>job_id', jobId)
  if (notificationCleanup.error) {
    throw createError({ statusCode: 400, statusMessage: notificationCleanup.error.message ?? 'Failed to delete job notifications' })
  }

  const { error } = await supabase
    .from('sim_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', user.id)

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message ?? 'Failed to delete job' })
  }

  return { success: true }
})
