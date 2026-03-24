/**
 * User favorites for plays (table: play_favorites). RLS: own rows only.
 */
export function usePlayFavorites() {
  const client = useSupabaseDB()
  const user = useSupabaseUser()
  /** Play IDs the current user has starred */
  const favoritePlayIds = ref<string[]>([])
  const loading = ref(false)

  function isFavorite(playId: string) {
    return favoritePlayIds.value.includes(playId)
  }

  async function fetchFavorites() {
    const u = user.value
    if (!u) {
      favoritePlayIds.value = []
      return
    }
    loading.value = true
    try {
      const { data, error } = await client
        .from('play_favorites')
        .select('play_id')
        .eq('user_id', u.id)
      if (error) throw error
      favoritePlayIds.value = (data ?? []).map((r) => r.play_id)
    } catch (e) {
      console.error('fetchFavorites:', e)
      favoritePlayIds.value = []
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(playId: string) {
    const u = user.value
    if (!u) return
    const was = isFavorite(playId)
    if (was) {
      const { error } = await client
        .from('play_favorites')
        .delete()
        .eq('user_id', u.id)
        .eq('play_id', playId)
      if (!error) {
        favoritePlayIds.value = favoritePlayIds.value.filter((id) => id !== playId)
      }
    } else {
      const { error } = await client.from('play_favorites').insert({
        user_id: u.id,
        play_id: playId,
      })
      if (!error) {
        favoritePlayIds.value = [...favoritePlayIds.value, playId]
      }
    }
  }

  watch(
    user,
    (u) => {
      if (u) fetchFavorites()
      else favoritePlayIds.value = []
    },
    { immediate: true },
  )

  return {
    favoritePlayIds,
    loading,
    isFavorite,
    fetchFavorites,
    toggleFavorite,
  }
}
