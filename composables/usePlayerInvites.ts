import type { PlayerInvite } from '~/lib/types'

export function usePlayerInvites(teamId: Ref<string | null>) {
  const invites = ref<PlayerInvite[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function fetchInvites() {
    if (!user.value || !teamId.value) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('player_invites')
        .select('*')
        .eq('team_id', teamId.value)
        .eq('invited_by', user.value.id)
        .is('used_at', null)
        .order('created_at', { ascending: false })
      if (err) throw err
      invites.value = (data ?? []) as PlayerInvite[]
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load invites'
    } finally {
      loading.value = false
    }
  }

  async function createInvite(playerId: string | null, email: string, role: 'player' | 'coach' = 'player'): Promise<PlayerInvite | null> {
    if (!teamId.value) return null
    error.value = null
    try {
      const res = await $fetch<PlayerInvite>('/api/invites/create', {
        method: 'POST',
        body: { team_id: teamId.value, player_id: playerId, email, role },
      })
      invites.value.unshift(res)
      return res
    } catch (e: any) {
      error.value = e.data?.message ?? e.message ?? 'Failed to create invite'
      throw e
    }
  }

  async function revokeInvite(inviteId: string) {
    await client.from('player_invites').delete().eq('id', inviteId)
    invites.value = invites.value.filter((i) => i.id !== inviteId)
  }

  watch(teamId, () => {
    invites.value = []
    if (teamId.value) fetchInvites()
  })

  return {
    invites: readonly(invites),
    loading: readonly(loading),
    error: readonly(error),
    fetchInvites,
    createInvite,
    revokeInvite,
  }
}
