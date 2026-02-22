import type { CanvasPlayer, Play } from '~/lib/types'

export function useSharePlay() {
  const client = useSupabaseDB()
  const user = useSupabaseUser()

  const sharing = ref(false)

  async function fetchGhostPlayers(ghostPlayId: string): Promise<CanvasPlayer[]> {
    const { data } = await client
      .from('plays')
      .select('canvas_data')
      .eq('id', ghostPlayId)
      .single()
    return (data?.canvas_data as any)?.players ?? []
  }

  async function buildSnapshot(play: Play, liveGhostPlayers?: CanvasPlayer[]) {
    const snapshot: any = { ...play.canvas_data }
    if (liveGhostPlayers?.length) {
      snapshot._ghost_players = liveGhostPlayers
    } else if (play.play_type === 'offense' && play.canvas_data?.ghost_defense_play_id) {
      const ghost = await fetchGhostPlayers(play.canvas_data.ghost_defense_play_id)
      if (ghost.length) {
        snapshot._ghost_players = ghost
      }
    }
    return snapshot
  }

  async function getOrCreateShareLink(play: Play, options?: { ghostPlayers?: CanvasPlayer[] }): Promise<{ token: string; isNew: boolean } | null> {
    if (!user.value) return null
    sharing.value = true

    try {
      const snapshot = await buildSnapshot(play, options?.ghostPlayers)

      const { data: existing } = await client
        .from('shared_plays')
        .select('share_token')
        .eq('play_id', play.id)
        .eq('user_id', user.value.id)
        .eq('is_active', true)
        .single()

      if (existing) {
        await client
          .from('shared_plays')
          .update({
            play_snapshot: snapshot,
            play_name: play.name,
            play_type: play.play_type,
            play_formation: play.formation || null,
            updated_at: new Date().toISOString(),
          })
          .eq('play_id', play.id)
          .eq('user_id', user.value.id)
          .eq('is_active', true)

        return { token: existing.share_token, isNew: false }
      }

      const { data: created, error } = await client
        .from('shared_plays')
        .insert({
          play_id: play.id,
          user_id: user.value.id,
          play_snapshot: snapshot,
          play_name: play.name,
          play_type: play.play_type,
          play_formation: play.formation || null,
        })
        .select('share_token')
        .single()

      if (error) throw error
      return created ? { token: created.share_token, isNew: true } : null
    } catch (err) {
      console.error('Failed to create share link:', err)
      return null
    } finally {
      sharing.value = false
    }
  }

  async function revokeShareLink(playId: string): Promise<boolean> {
    if (!user.value) return false
    try {
      const { error } = await client
        .from('shared_plays')
        .update({ is_active: false })
        .eq('play_id', playId)
        .eq('user_id', user.value.id)
        .eq('is_active', true)

      return !error
    } catch {
      return false
    }
  }

  async function hasActiveShare(playId: string): Promise<string | null> {
    if (!user.value) return null
    const { data } = await client
      .from('shared_plays')
      .select('share_token')
      .eq('play_id', playId)
      .eq('user_id', user.value.id)
      .eq('is_active', true)
      .single()

    return data?.share_token ?? null
  }

  function buildShareUrl(token: string): string {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/shared/${token}`
  }

  return {
    sharing: readonly(sharing),
    getOrCreateShareLink,
    revokeShareLink,
    hasActiveShare,
    buildShareUrl,
  }
}
