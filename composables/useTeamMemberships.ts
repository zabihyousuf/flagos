import type { TeamMembership } from '~/lib/types'

const ACTIVE_TEAM_KEY = 'flagos-active-team-id'

const memberships = ref<TeamMembership[]>([])
// Read synchronously at module init so watchers see the value immediately
const activeTeamId = ref<string | null>(
  import.meta.client ? localStorage.getItem(ACTIVE_TEAM_KEY) : null
)
const loading = ref(false)

export function useTeamMemberships() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  function setActiveTeam(teamId: string | null) {
    activeTeamId.value = teamId
    if (import.meta.client) {
      if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
      else localStorage.removeItem(ACTIVE_TEAM_KEY)
    }
  }

  async function fetchMemberships() {
    if (!user.value) return
    loading.value = true
    try {
      const { data } = await client
        .from('team_memberships')
        .select('*, role, team:teams(id, name, description, is_joinable, user_id, created_at, updated_at)')
        .eq('user_id', user.value.id)
        .order('joined_at', { ascending: false })
      memberships.value = (data ?? []) as TeamMembership[]

      // If active team was removed or no longer a member, clear it
      if (activeTeamId.value && !memberships.value.some((m) => m.team_id === activeTeamId.value)) {
        setActiveTeam(null)
      }
    } finally {
      loading.value = false
    }
  }

  async function leaveTeam(teamId: string) {
    if (!user.value) return
    await client
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.value.id)
    memberships.value = memberships.value.filter((m) => m.team_id !== teamId)
    if (activeTeamId.value === teamId) setActiveTeam(null)
  }

  return {
    memberships: readonly(memberships),
    activeTeamId: readonly(activeTeamId),
    loading: readonly(loading),
    setActiveTeam,
    fetchMemberships,
    leaveTeam,
  }
}
