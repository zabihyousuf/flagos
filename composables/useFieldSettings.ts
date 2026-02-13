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

  /** Apply updates in the background without blocking the UI (no loading spinner). */
  async function updateSettings(updates: Partial<FieldSettings>) {
    if (!settings.value) return
    // Enforce LOS cannot pass first down (top to bottom) when either is updated
    const normalized = { ...updates }
    if (updates.line_of_scrimmage != null || updates.first_down != null) {
      const cur = settings.value
      const los = updates.line_of_scrimmage ?? cur.line_of_scrimmage ?? 0
      const fd = updates.first_down ?? cur.first_down ?? 0
      if (updates.line_of_scrimmage != null) normalized.line_of_scrimmage = Math.min(los, fd)
      if (updates.first_down != null) normalized.first_down = Math.max(fd, los)
    }
    const previous = { ...settings.value }
    settings.value = { ...settings.value, ...normalized, updated_at: new Date().toISOString() }
    error.value = null
    try {
      // @ts-ignore
      const { data, error: err } = await client
        .from('field_settings')
        .update({
          ...normalized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', previous.id)
        .select()
        .single()

      if (err) throw err
      settings.value = data as FieldSettings
    } catch (e: any) {
      error.value = e.message
      // Revert optimistic update on failure
      settings.value = previous
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
