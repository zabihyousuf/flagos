import type { TeamPlaybook, Playbook } from '~/lib/types'

export function useTeamPlaybooks() {
  const teamPlaybooks = ref<TeamPlaybook[]>([])
  const accessiblePlaybooks = ref<Playbook[]>([])
  const loading = ref(false)

  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function fetchTeamPlaybooks(teamId: string) {
    loading.value = true
    try {
      const { data } = await client
        .from('team_playbooks')
        .select('*, playbook:playbooks(id, name, description, user_id, created_at, updated_at)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
      teamPlaybooks.value = (data ?? []) as TeamPlaybook[]
    } finally {
      loading.value = false
    }
  }

  async function fetchAccessiblePlaybooks() {
    if (!user.value) return
    loading.value = true
    try {
      const { data } = await client
        .from('team_playbooks')
        .select('playbook:playbooks(id, name, description, user_id, created_at, updated_at)')
      const raw = (data ?? []) as { playbook: Playbook | null }[]
      const seen = new Set<string>()
      accessiblePlaybooks.value = raw
        .flatMap((row) => (row.playbook ? [row.playbook] : []))
        .filter((p) => {
          if (seen.has(p.id)) return false
          seen.add(p.id)
          return true
        })
    } finally {
      loading.value = false
    }
  }

  async function sharePlaybook(teamId: string, playbookId: string): Promise<void> {
    if (!user.value) return
    await client.from('team_playbooks').insert({
      team_id: teamId,
      playbook_id: playbookId,
      shared_by: user.value.id,
    })
    await fetchTeamPlaybooks(teamId)
  }

  async function unsharePlaybook(teamId: string, playbookId: string): Promise<void> {
    await client
      .from('team_playbooks')
      .delete()
      .eq('team_id', teamId)
      .eq('playbook_id', playbookId)
    teamPlaybooks.value = teamPlaybooks.value.filter((tp) => tp.playbook_id !== playbookId)
  }

  return {
    teamPlaybooks: readonly(teamPlaybooks),
    accessiblePlaybooks: readonly(accessiblePlaybooks),
    loading: readonly(loading),
    fetchTeamPlaybooks,
    fetchAccessiblePlaybooks,
    sharePlaybook,
    unsharePlaybook,
  }
}
