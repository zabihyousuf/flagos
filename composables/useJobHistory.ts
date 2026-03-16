import type { JobStatus, JobState } from '~/composables/usePlayLabJob'

function mapDbStatus(raw: string): JobState {
  const upper = raw.toUpperCase()
  if (upper === 'QUEUED') return 'PENDING'
  if (upper === 'RUNNING' || upper === 'COMPLETED' || upper === 'FAILED' || upper === 'CANCELLED') return upper as JobState
  return 'PENDING'
}

export function useJobHistory() {
  const client = useSupabaseDB()
  const user = useSupabaseUser()
  const jobs = ref<JobStatus[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchJobs(): Promise<JobStatus[]> {
    if (!user.value) return []
    loading.value = true
    error.value = null
    try {
      const { data: jobRows, error: jobErr } = await client
        .from('sim_jobs')
        .select('id, job_type, status, progress, progress_label, error, completed_at, created_at, job_metadata')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: false })
        .limit(75)

      if (jobErr) throw jobErr
      if (!jobRows || jobRows.length === 0) {
        jobs.value = []
        return []
      }

      const completedIds = jobRows
        .filter((r: any) => r.status === 'completed')
        .map((r: any) => r.id)

      let rateMap = new Map<string, number>()
      if (completedIds.length > 0) {
        const { data: resultRows } = await client
          .from('sim_results')
          .select('job_id, result_json')
          .in('job_id', completedIds)

        if (resultRows) {
          for (const row of resultRows as any[]) {
            const rate = row.result_json?.overall_success_rate
            if (typeof rate === 'number') rateMap.set(row.job_id, rate)
          }
        }
      }

      jobs.value = jobRows.map((row: any): JobStatus => ({
        job_id: row.id,
        state: mapDbStatus(row.status),
        progress_percent: row.progress != null ? row.progress * 100 : undefined,
        progress_label: row.progress_label || undefined,
        error: row.error || undefined,
        job_type: row.job_type,
        completed_at: row.completed_at || undefined,
        job_metadata: row.job_metadata || undefined,
        overall_success_rate: rateMap.get(row.id),
      }))

      return jobs.value
    } catch (e: any) {
      error.value = e.message ?? 'Failed to fetch simulation history'
      return []
    } finally {
      loading.value = false
    }
  }

  async function deleteJob(jobId: string): Promise<boolean> {
    if (!user.value) return false
    try {
      await client.from('sim_recordings').delete().eq('job_id', jobId)
      await client.from('sim_results').delete().eq('job_id', jobId)
      const { error: err } = await client
        .from('sim_jobs')
        .delete()
        .eq('id', jobId)
        .eq('user_id', user.value.id)

      if (err) throw err
      jobs.value = jobs.value.filter((j) => j.job_id !== jobId)
      return true
    } catch (e: any) {
      error.value = e.message ?? 'Failed to delete job'
      return false
    }
  }

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    deleteJob,
  }
}
