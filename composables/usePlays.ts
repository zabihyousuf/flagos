import type { Play, CanvasData, Player } from '~/lib/types'
import type { FieldSettings } from '~/lib/types'
import { getDefaultFormation } from '~/lib/constants'

export function usePlays(playbookId?: Ref<string | undefined>) {
  const client = useSupabaseDB()
  const plays = ref<Play[]>([])
  const currentPlay = ref<Play | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function initDraftPlay(playType: 'offense' | 'defense' = 'offense', fieldSettings?: Partial<FieldSettings> | null) {
    const opts = fieldSettings
      ? {
          line_of_scrimmage: fieldSettings.line_of_scrimmage,
          field_length: fieldSettings.field_length,
          endzone_size: fieldSettings.endzone_size,
          default_offense_starter_count: fieldSettings.default_offense_starter_count ?? 5,
          default_defense_starter_count: fieldSettings.default_defense_starter_count ?? 5,
        }
      : undefined
    currentPlay.value = {
      id: 'new',
      playbook_id: '',
      user_id: '',
      name: 'Untitled Play',
      play_type: playType,
      formation: '',
      canvas_data: getDefaultFormation(playType, undefined, opts) as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  async function fetchPlays() {
    if (!playbookId?.value) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('plays')
        .select('*')
        .eq('playbook_id', playbookId.value)
        .order('created_at', { ascending: true })

      if (err) throw err
      plays.value = (data ?? []) as unknown as Play[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchPlay(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('plays')
        .select('*')
        .eq('id', id)
        .single()

      if (err) throw err
      currentPlay.value = data as unknown as Play
      return data as unknown as Play
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function createPlay(
    pbId: string,
    name: string,
    playType: 'offense' | 'defense',
    formation: string,
    starters?: Player[],
    fieldSettings?: Partial<FieldSettings> | null,
  ) {
    loading.value = true
    error.value = null
    try {
      const opts = fieldSettings
        ? {
            line_of_scrimmage: fieldSettings.line_of_scrimmage,
            field_length: fieldSettings.field_length,
            endzone_size: fieldSettings.endzone_size,
            default_offense_starter_count: fieldSettings.default_offense_starter_count ?? 5,
            default_defense_starter_count: fieldSettings.default_defense_starter_count ?? 5,
          }
        : undefined
      const canvasData = getDefaultFormation(playType, starters, opts)
      const user = useSupabaseUser()
      if (!user.value) throw new Error('Not authenticated')

      const { data, error: err } = await client
        .from('plays')
        .insert({
          playbook_id: pbId,
          user_id: user.value.id,
          name,
          play_type: playType,
          formation,
          canvas_data: canvasData,
        })
        .select()
        .single()

      if (err) throw err
      plays.value.push(data as unknown as Play)
      return data as unknown as Play
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePlay(id: string, updates: Partial<Play>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('plays')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const index = plays.value.findIndex((p) => p.id === id)
      if (index !== -1) plays.value[index] = data as unknown as Play
      if (currentPlay.value?.id === id) currentPlay.value = data as unknown as Play
      return data as unknown as Play
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveCanvasData(id: string, canvasData: CanvasData) {
    return updatePlay(id, { canvas_data: canvasData as any } as Partial<Play>)
  }

  async function deletePlay(id: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await client.from('plays').delete().eq('id', id)

      if (err) throw err
      plays.value = plays.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    plays,
    currentPlay,
    loading,
    error,
    fetchPlays,
    fetchPlay,
    createPlay,
    updatePlay,
    saveCanvasData,
    deletePlay,
    initDraftPlay,
  }
}
