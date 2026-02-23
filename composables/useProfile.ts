import type { Profile } from '~/lib/types'

export function useProfile() {
  const client = useSupabaseDB()
  const profile = useState<Profile | null>('profile', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProfile() {
    const user = useSupabaseUser()

    if (!user.value) {
      const unwatch = watch(user, (u) => {
        if (u) {
          unwatch()
          fetchProfile()
        }
      })
      return
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (err) throw err
      profile.value = data as Profile
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    const user = useSupabaseUser()
    const authClient = useSupabaseClient()
    if (!user.value || !profile.value) return null

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.value.id)
        .select()
        .single()

      if (err) throw err
      profile.value = data as Profile

      if (updates.display_name !== undefined) {
        await authClient.auth.updateUser({ data: { display_name: updates.display_name } })
      }

      return data as Profile
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  }
}
