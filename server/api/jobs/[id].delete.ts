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
    throw createError({ statusCode: 400, statusMessage: jobErr.message ?? 'Failed to load job' })
  }

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const childDeletes = await Promise.all([
    supabase.from('sim_job_team_shares').delete().eq('job_id', jobId),
    supabase.from('sim_recordings').delete().eq('job_id', jobId),
    supabase.from('sim_results').delete().eq('job_id', jobId),
    supabase.from('sim_insights').delete().eq('job_id', jobId),
    supabase.from('notifications').delete().eq('user_id', user.id).eq('metadata->>job_id', jobId),
  ])

  const childErr = childDeletes.find((res) => res.error)?.error
  if (childErr) {
    throw createError({ statusCode: 400, statusMessage: childErr.message ?? 'Failed to delete job artifacts' })
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
