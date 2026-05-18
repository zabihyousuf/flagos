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

  const { data: job, error: fetchErr } = await supabase
    .from('sim_jobs')
    .select('id, user_id')
    .eq('id', jobId)
    .maybeSingle()

  if (fetchErr) {
    throw createError({ statusCode: 400, statusMessage: fetchErr.message ?? 'Failed to fetch job' })
  }
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }
  if (job.user_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to delete this job' })
  }

  await supabase.from('sim_recordings').delete().eq('job_id', jobId)
  await supabase.from('sim_results').delete().eq('job_id', jobId)
  await supabase.from('sim_insights').delete().eq('job_id', jobId)
  await supabase.from('sim_job_team_shares').delete().eq('job_id', jobId)
  await supabase.from('notifications').delete().eq('metadata->>job_id', jobId)

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
