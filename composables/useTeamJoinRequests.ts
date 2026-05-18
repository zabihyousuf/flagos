import type { TeamJoinRequest } from '~/lib/types'

export function useTeamJoinRequests() {
  const sentRequests = ref<TeamJoinRequest[]>([])
  const receivedRequests = ref<TeamJoinRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function fetchSentRequests() {
    if (!user.value) return
    const { data } = await client
      .from('team_join_requests')
      .select('*, team:teams(id, name, description, is_joinable, user_id, created_at, updated_at)')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    sentRequests.value = (data ?? []) as TeamJoinRequest[]
  }

  async function fetchReceivedRequests(teamId: string) {
    const { data } = await client
      .from('team_join_requests')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    receivedRequests.value = (data ?? []) as TeamJoinRequest[]
  }

  async function submitRequest(teamId: string, message?: string): Promise<void> {
    if (!user.value) return
    error.value = null
    const { error: err } = await client.from('team_join_requests').insert({
      user_id: user.value.id,
      team_id: teamId,
      message: message ?? null,
    })
    if (err) {
      error.value = err.message
      throw err
    }
    await fetchSentRequests()
  }

  async function respondToRequest(requestId: string, decision: 'approved' | 'rejected'): Promise<void> {
    await $fetch(`/api/join-requests/${requestId}/respond`, {
      method: 'POST',
      body: { decision },
    })
    receivedRequests.value = receivedRequests.value.filter((r) => r.id !== requestId)
  }

  return {
    sentRequests: readonly(sentRequests),
    receivedRequests: readonly(receivedRequests),
    loading: readonly(loading),
    error: readonly(error),
    fetchSentRequests,
    fetchReceivedRequests,
    submitRequest,
    respondToRequest,
  }
}
