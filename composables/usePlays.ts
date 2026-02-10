import type { Play, CanvasData, Player } from '~/lib/types'
import { getDefaultFormation } from '~/lib/constants'

export function usePlays(playbookId?: Ref<string | undefined>) {
  const client = useSupabaseDB()
  const plays = ref<Play[]>([])
  const currentPlay = ref<Play | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
      plays.value = (data ?? []) as Play[]
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
      currentPlay.value = data as Play
      return data as Play
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
  ) {
    loading.value = true
    error.value = null
    try {
      const canvasData = getDefaultFormation(playType, starters)
      const { data, error: err } = await client
        .from('plays')
        .insert({
          playbook_id: pbId,
          user_id: 'admin',
          name,
          play_type: playType,
          formation,
          canvas_data: canvasData,
        })
        .select()
        .single()

      if (err) throw err
      plays.value.push(data as Play)
      return data as Play
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
      if (index !== -1) plays.value[index] = data as Play
      if (currentPlay.value?.id === id) currentPlay.value = data as Play
      return data as Play
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveCanvasData(id: string, canvasData: CanvasData) {
    return updatePlay(id, { canvas_data: canvasData } as Partial<Play>)
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
  }
}
