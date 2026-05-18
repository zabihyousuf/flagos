import type { Profile } from '~/lib/types'

export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  if (!user.value) return

  const profile = useState<Profile | null>('profile')

  // Profile not yet loaded (direct URL hit) — fetch it once before deciding
  if (!profile.value) {
    const client = useSupabaseClient()
    const { data } = await client
      .from('profiles')
      .select('account_type')
      .eq('id', user.value.id)
      .single()
    if (data) profile.value = data as Profile
  }

  if (profile.value?.account_type === 'player') {
    return navigateTo('/dashboard')
  }
})
