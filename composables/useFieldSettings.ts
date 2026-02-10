import type { FieldSettings } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'

export function useFieldSettings() {
  const client = useSupabaseDB()
  const settings = ref<FieldSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSettings() {
    const user = useSupabaseUser()
    
    if (!user.value) {
      // Retry when user becomes available
      const unwatch = watch(user, (u) => {
        if (u) {
          unwatch()
          fetchSettings()
        }
      })
      return
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('field_settings')
        .select('*')
        .eq('user_id', user.value.id)
        .maybeSingle()

      if (err) throw err

      if (data) {
        settings.value = data as FieldSettings
      } else {
        // Create default settings for this user
        // @ts-ignore
        const { data: newData, error: createErr } = await client
          .from('field_settings')
          .insert({
            user_id: user.value.id,
            ...DEFAULT_FIELD_SETTINGS,
          })
          .select()
          .single()

        if (createErr) throw createErr
        settings.value = newData as FieldSettings
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: Partial<FieldSettings>) {
    if (!settings.value) return
    loading.value = true
    error.value = null
    try {
      // @ts-ignore
      const { data, error: err } = await client
        .from('field_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.value.id)
        .select()
        .single()

      if (err) throw err
      settings.value = data as FieldSettings
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  }
}
