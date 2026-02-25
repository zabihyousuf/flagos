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
        const raw = data as FieldSettings
        const clamped = clampFieldSettings(raw)
        const needsFix =
          clamped.field_length !== raw.field_length ||
          clamped.field_width !== raw.field_width ||
          clamped.endzone_size !== raw.endzone_size ||
          clamped.line_of_scrimmage !== raw.line_of_scrimmage ||
          (raw.first_down != null && clamped.first_down !== raw.first_down)
        settings.value = needsFix ? { ...raw, ...clamped } : raw
        if (needsFix) {
          updateSettings(clamped)
        }
      } else {
        // Create default settings for this user (only columns that exist in DB)
        const { field_length, field_width, endzone_size, line_of_scrimmage, first_down, default_play_view, default_play_type, show_ghost_defense_by_default, default_ghost_defense_play_id, sidebar_start_collapsed, show_player_names_on_canvas, default_offense_starter_count, default_defense_starter_count, theme } = DEFAULT_FIELD_SETTINGS
        const preferred = user.value?.user_metadata?.preferred_starter_count as number | undefined
        const count = typeof preferred === 'number' && preferred >= 5 && preferred <= 8 ? preferred : (default_offense_starter_count ?? default_defense_starter_count ?? 5)
        const { data: newData, error: createErr } = await client
          .from('field_settings')
          .insert({
            user_id: user.value.id,
            field_length,
            field_width,
            endzone_size,
            line_of_scrimmage,
            first_down,
            default_play_view,
            default_play_type,
            show_ghost_defense_by_default,
            default_ghost_defense_play_id,
            sidebar_start_collapsed,
            show_player_names_on_canvas,
            default_offense_starter_count: count,
            default_defense_starter_count: count,
            theme,
          })
          .select()
          .single()

        if (createErr) throw createErr
        settings.value = newData as FieldSettings
        if (typeof preferred === 'number' && preferred >= 5 && preferred <= 8) {
          const authClient = useSupabaseClient()
          const meta = { ...user.value?.user_metadata, preferred_starter_count: undefined }
          await authClient.auth.updateUser({ data: meta })
        }
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /** Clamp field settings to valid ranges (field length/width, endzone, LOS not in endzone, first down between LOS and endzone). */
  function clampFieldSettings(merged: FieldSettings): Partial<FieldSettings> {
    const fieldLength = Math.max(50, Math.min(100, merged.field_length ?? 70))
    const fieldWidth = Math.max(25, Math.min(50, merged.field_width ?? 40))
    const endzoneSize = Math.max(5, Math.min(10, merged.endzone_size ?? 10))
    const losMax = Math.max(1, fieldLength - 1)
    const lineOfScrimmage = Math.max(1, Math.min(losMax, merged.line_of_scrimmage ?? 25))
    const firstDown = Math.max(lineOfScrimmage, Math.min(losMax, merged.first_down ?? Math.floor(fieldLength / 2)))
    return {
      field_length: fieldLength,
      field_width: fieldWidth,
      endzone_size: endzoneSize,
      line_of_scrimmage: lineOfScrimmage,
      first_down: firstDown,
    }
  }

  const DIMENSION_KEYS = ['field_length', 'field_width', 'endzone_size', 'line_of_scrimmage', 'first_down'] as const

  /** Apply updates in the background without blocking the UI (no loading spinner). */
  async function updateSettings(updates: Partial<FieldSettings>) {
    if (!settings.value) return
    const hasDimensionUpdate = DIMENSION_KEYS.some((k) => updates[k] != null)
    const merged = { ...settings.value, ...updates }
    const applied = hasDimensionUpdate ? { ...merged, ...clampFieldSettings(merged) } : merged
    const previous = { ...settings.value }
    settings.value = { ...applied, updated_at: new Date().toISOString() }
    error.value = null
    try {
      const payload: Partial<FieldSettings> = { ...updates, updated_at: new Date().toISOString() as any }
      if (hasDimensionUpdate) Object.assign(payload, clampFieldSettings(applied))
      const { data, error: err } = await client
        .from('field_settings')
        .update(payload)
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
