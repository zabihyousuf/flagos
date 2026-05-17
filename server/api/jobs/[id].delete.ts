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
    throw createError({ statusCode: 400, statusMessage: jobError.message ?? 'Failed to load job' })
  }

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const cleanupSteps = [
    supabase.from('sim_recordings').delete().eq('job_id', jobId),
    supabase.from('sim_results').delete().eq('job_id', jobId),
    supabase.from('sim_insights').delete().eq('job_id', jobId).eq('user_id', user.id),
    supabase.from('notifications').delete().eq('metadata->>job_id', jobId).eq('user_id', user.id),
  ] as const

  for (const cleanup of cleanupSteps) {
    const { error: cleanupError } = await cleanup
    if (cleanupError) {
      throw createError({ statusCode: 400, statusMessage: cleanupError.message ?? 'Failed to delete job data' })
    }
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
