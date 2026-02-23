import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Delete the authenticated user's account and all associated data.
 * Uses the service role to call auth.admin.deleteUser().
 * User data in public tables is removed via ON DELETE CASCADE from auth.users.
 *
 * Requires SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY (service_role key, not anon).
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const serviceKey = config.supabase?.serviceKey || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Server misconfigured: missing SUPABASE_SERVICE_KEY',
    })
  }

  const supabaseAdmin = createClient(config.public.supabase.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message ?? 'Failed to delete account',
    })
  }

  return { success: true }
})
