import type { SimJobTeamShare } from '~/lib/types'

export function useSimJobShares() {
  const shares = ref<SimJobTeamShare[]>([])
  const loading = ref(false)

  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function assertOwnJob(jobId: string): Promise<void> {
    if (!user.value) throw new Error('Not authenticated')
    const { data, error } = await client
      .from('sim_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.value.id)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Job not found')
  }

  async function fetchSharesForJob(jobId: string) {
    loading.value = true
    try {
      try {
        await assertOwnJob(jobId)
      } catch {
        shares.value = []
        return
      }
      const { data } = await client
        .from('sim_job_team_shares')
        .select('*')
        .eq('job_id', jobId)
      shares.value = (data ?? []) as SimJobTeamShare[]
    } finally {
      loading.value = false
    }
  }

  async function fetchSharedJobIds(): Promise<string[]> {
    const { data } = await client
      .from('sim_job_team_shares')
      .select('job_id')
    return (data ?? []).map((r: { job_id: string }) => r.job_id)
  }

  async function shareJob(jobId: string, teamId: string): Promise<void> {
    if (!user.value) return
    await assertOwnJob(jobId)
    await client.from('sim_job_team_shares').insert({
      job_id: jobId,
      team_id: teamId,
      shared_by: user.value.id,
    })
    await fetchSharesForJob(jobId)
  }

  async function unshareJob(jobId: string, teamId: string): Promise<void> {
    await assertOwnJob(jobId)
    await client
      .from('sim_job_team_shares')
      .delete()
      .eq('job_id', jobId)
      .eq('team_id', teamId)
    shares.value = shares.value.filter((s) => s.team_id !== teamId)
  }

  return {
    shares: readonly(shares),
    loading: readonly(loading),
    fetchSharesForJob,
    fetchSharedJobIds,
    shareJob,
    unshareJob,
  }
}
