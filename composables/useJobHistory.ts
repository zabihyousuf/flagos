import type { JobStatus, JobState } from '~/composables/usePlayLabJob'

function mapBackendStatus(raw: string): JobState {
  const upper = raw.toUpperCase()
  if (upper === 'QUEUED') return 'PENDING'
  if (upper === 'RUNNING' || upper === 'COMPLETED' || upper === 'FAILED' || upper === 'CANCELLED') return upper as JobState
  return 'PENDING'
}

function normalizeJob(raw: Record<string, any>): JobStatus {
  return {
    job_id: raw.job_id ?? raw.id ?? '',
    state: raw.state ?? mapBackendStatus(raw.status ?? 'queued'),
    progress_percent: raw.progress_percent ?? (raw.progress != null ? raw.progress * 100 : undefined),
    progress_label: raw.progress_label,
    error: raw.error,
    clamped: raw.clamped,
    clamped_iterations: raw.clamped_iterations,
    job_type: raw.job_type,
    completed_at: raw.completed_at,
    job_metadata: raw.job_metadata,
    overall_success_rate: raw.overall_success_rate,
  }
}

export function useJobHistory() {
  const engine = useEngineClient()
  const jobs = ref<JobStatus[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchJobs(status?: string): Promise<JobStatus[]> {
    loading.value = true
    error.value = null
    try {
      const path = status ? `/api/v1/jobs?status=${encodeURIComponent(status)}` : '/api/v1/jobs'
      const { ok, data } = await engine.get<any[]>(path)
      if (!ok) {
        if (engine.engineError.value) error.value = engine.engineError.value
        return []
      }
      jobs.value = Array.isArray(data) ? data.map(normalizeJob) : []
      return jobs.value
    } finally {
      loading.value = false
    }
  }

  return {
    jobs,
    loading,
    error,
    fetchJobs,
  }
}
