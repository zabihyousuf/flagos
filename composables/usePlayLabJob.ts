import type { CanvasData, CanvasPlayer, FieldSettings, SimPlayer } from '~/lib/types'
import type { RosterError } from '~/composables/useSimRoster'

export interface PlayLabBatchRequest {
  offensive_play: CanvasData
  defensive_play: CanvasData | null
  defensive_players: SimPlayer[]
  field_settings: FieldSettings
  offensive_players: SimPlayer[]
  n_iterations: number
  variation_seed: null
  auto_generate?: boolean
}

function toEngineRoute(cp: CanvasPlayer): { x: number; y: number }[] {
  if (!cp.route?.segments) return []
  return cp.route.segments.flatMap((seg) => seg.points ?? []).map((pt) => ({
    x: pt.x,
    y: 1.0 - pt.y,
  }))
}

const VALID_ALIGNMENTS = new Set(['tight', 'normal', 'off'])

function toEnginePlayer(cp: CanvasPlayer): Record<string, unknown> {
  const isRusher = cp.position === 'RSH' || cp.designation === 'R'
  return {
    id: cp.id,
    position: cp.position,
    x: cp.x,
    y: 1.0 - cp.y,
    route: toEngineRoute(cp),
    alignment: cp.alignment && VALID_ALIGNMENTS.has(cp.alignment) ? cp.alignment : cp.alignment === 'soft' ? 'normal' : (cp.alignment ?? null),
    coverageRadius: cp.coverageRadius ?? 2.0,
    coverageZoneX: cp.coverageZoneX ?? null,
    coverageZoneY: cp.coverageZoneY != null ? 1.0 - cp.coverageZoneY : null,
    coverageZoneUnlocked: cp.coverageZoneUnlocked ?? false,
    isRusher,
  }
}

function toEngineCanvasData(cd: CanvasData): Record<string, unknown> {
  return {
    players: cd.players.map(toEnginePlayer),
    version: cd.version,
    annotations: cd.annotations ?? [],
  }
}

const DEFAULT_FIELD_FOR_ENGINE = {
  field_length: 50,
  field_width: 25,
  endzone_size: 7,
  line_of_scrimmage: 5,
  first_down: 25,
}

function toEngineFieldSettings(fs: FieldSettings): Record<string, unknown> {
  return {
    field_length: fs.field_length ?? DEFAULT_FIELD_FOR_ENGINE.field_length,
    field_width: fs.field_width ?? DEFAULT_FIELD_FOR_ENGINE.field_width,
    endzone_size: fs.endzone_size ?? DEFAULT_FIELD_FOR_ENGINE.endzone_size,
    line_of_scrimmage: fs.line_of_scrimmage ?? DEFAULT_FIELD_FOR_ENGINE.line_of_scrimmage,
    first_down: fs.first_down ?? DEFAULT_FIELD_FOR_ENGINE.first_down,
  }
}

export type JobState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

function mapBackendState(raw: string | undefined): JobState {
  if (!raw) return 'PENDING'
  const upper = raw.toUpperCase()
  if (upper === 'QUEUED') return 'PENDING'
  if (upper === 'RUNNING' || upper === 'COMPLETED' || upper === 'FAILED' || upper === 'CANCELLED') return upper as JobState
  return 'PENDING'
}

function normalizeJobStatus(raw: Record<string, any>): JobStatus {
  return {
    job_id: raw.job_id ?? raw.id ?? '',
    state: raw.state && ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(raw.state)
      ? raw.state
      : mapBackendState(raw.status),
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

export interface JobMetadata {
  offensive_play_name?: string
  offensive_play_id?: string
  defensive_play_name?: string
  defensive_play_id?: string
  team_id?: string
  notes?: string
  n_iterations?: number
  n_scenarios?: number
}

export interface JobStatus {
  job_id: string
  state: JobState
  progress_percent?: number
  progress_label?: string
  error?: string
  clamped?: boolean
  clamped_iterations?: number
  job_type?: string
  completed_at?: string
  job_metadata?: JobMetadata
  overall_success_rate?: number
}

export type PlayOutcome = 'TOUCHDOWN' | 'FLAG_PULLED' | 'INCOMPLETE' | 'SACK' | 'INTERCEPTION'

export interface ScenarioResult {
  scenario_name: string
  scenario_index: number
  success_rate: number
  iterations_completed: number
  outcome_counts: Record<PlayOutcome, number>
  yards_histogram: Record<number, number>
  penalties_rate?: number
  most_common_penalty?: string
}

export interface BatchSimResult {
  job_id: string
  // Backend result shape is richer; keep it flexible here
  [key: string]: any
}

export interface AggregatedYardStats {
  mean: number
  median: number
  std: number
  p25: number
  p75: number
  p95: number
}

export interface AggregatedStats {
  n_scenarios: number
  n_iterations: number
  success_rate: number
  yards_gained_stats: AggregatedYardStats
  outcome_distribution: Record<string, number>
  most_common_failure: string
}

export interface PartialBatchSimResult {
  scenarios_completed: number
  scenarios_total: number
  is_partial: boolean
  overall_success_rate: number
  per_scenario: any[]
  aggregated_by_down: Record<string, AggregatedStats>
  aggregated_by_field_zone: Record<string, AggregatedStats>
  aggregated_by_rush_count: Record<string, AggregatedStats>
  aggregated_by_press_rate_bucket: Record<string, AggregatedStats>
  best_10_scenarios: any[]
  worst_10_scenarios: any[]
}

function resultToPartial(data: any): PartialBatchSimResult {
  return {
    scenarios_completed: data.scenarios_completed ?? data.total_scenarios ?? 0,
    scenarios_total: data.scenarios_total ?? data.total_scenarios ?? 0,
    is_partial: data.is_partial ?? false,
    overall_success_rate: data.overall_success_rate ?? 0,
    per_scenario: data.per_scenario ?? [],
    aggregated_by_down: data.aggregated_by_down ?? {},
    aggregated_by_field_zone: data.aggregated_by_field_zone ?? {},
    aggregated_by_rush_count: data.aggregated_by_rush_count ?? {},
    aggregated_by_press_rate_bucket: data.aggregated_by_press_rate_bucket ?? {},
    best_10_scenarios: data.best_10_scenarios ?? [],
    worst_10_scenarios: data.worst_10_scenarios ?? [],
  }
}

function getStubBatchResult(jobId: string, nIterations: number, scenarioNames: string[]): BatchSimResult {
  const names = scenarioNames.length > 0 ? scenarioNames : ['Auto: Scenario 1', 'Auto: Scenario 2', 'Auto: Scenario 3']
  return {
    job_id: jobId,
    total_iterations: nIterations,
    scenario_results: names.map((name, i) => ({
      scenario_name: name,
      scenario_index: i,
      success_rate: 45 + Math.random() * 45,
      iterations_completed: nIterations,
      outcome_counts: {
        TOUCHDOWN: 1200 + Math.floor(Math.random() * 800),
        FLAG_PULLED: 2500 + Math.floor(Math.random() * 1000),
        INCOMPLETE: 800 + Math.floor(Math.random() * 400),
        SACK: 100 + Math.floor(Math.random() * 100),
        INTERCEPTION: 50 + Math.floor(Math.random() * 50),
      },
      yards_histogram: { 0: 800, 5: 1200, 10: 1800, 15: 1400, 20: 900, 25: 500, 30: 200 } as Record<number, number>,
      penalties_rate: i === 0 ? 0.07 : undefined,
      most_common_penalty: i === 0 ? 'Offensive holding' : undefined,
    })),
  }
}

export function usePlayLabJob() {
  const config = useRuntimeConfig()
  const engine = useEngineClient()
  const baseUrl = engine.baseUrl
  const useStub = !baseUrl

  const jobId = ref<string | null>(null)
  const status = ref<JobStatus | null>(null)
  const result = ref<BatchSimResult | null>(null)
  const partialResult = ref<PartialBatchSimResult | null>(null)
  const runError = ref<string | null>(null)
  const rosterErrors = ref<RosterError[]>([])
  const elapsedSeconds = ref(0)
  const isLoadedResult = ref(false)
  const loadedJobStatus = ref<JobStatus | null>(null)

  let statusTimer: ReturnType<typeof setInterval> | null = null
  let resultTimer: ReturnType<typeof setInterval> | null = null
  let elapsedTimer: ReturnType<typeof setInterval> | null = null
  let stubTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (statusTimer) {
      clearInterval(statusTimer)
      statusTimer = null
    }
    if (resultTimer) {
      clearInterval(resultTimer)
      resultTimer = null
    }
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    if (stubTimer) {
      clearTimeout(stubTimer)
      stubTimer = null
    }
  }

  function stopPolling() {
    clearTimers()
  }

  async function startJob(request: PlayLabBatchRequest, metadata: JobMetadata): Promise<boolean> {
    runError.value = null
    rosterErrors.value = []
    result.value = null
    partialResult.value = null
    status.value = null
    jobId.value = null
    elapsedSeconds.value = 0
    isLoadedResult.value = false
    loadedJobStatus.value = null
    clearTimers()

    if (useStub) {
      const id = `stub-${Date.now()}`
      jobId.value = id
      status.value = { job_id: id, state: 'PENDING', progress_percent: 0, progress_label: 'Starting...' }
      if (import.meta.client) {
        elapsedTimer = setInterval(() => {
          elapsedSeconds.value += 1
        }, 1000)
      }
      let step = 0
      const steps = [15, 25, 40, 55, 70, 85, 100]
      function runStubStep() {
        if (!jobId.value || jobId.value !== id) return
        const pct = steps[step] ?? 100
        const iter = Math.floor((request.n_iterations * (pct / 100)) * (0.9 + Math.random() * 0.2))
        status.value = {
          job_id: id,
          state: pct >= 100 ? 'COMPLETED' : 'RUNNING',
          progress_percent: pct,
          progress_label: `Running iteration ${Math.min(iter, request.n_iterations).toLocaleString()} of ${request.n_iterations.toLocaleString()}`,
        }
        partialResult.value = {
          scenarios_completed: Math.round((pct / 100) * 100),
          scenarios_total: 100,
          is_partial: pct < 100,
          overall_success_rate: 0.4 + Math.random() * 0.3,
          per_scenario: [],
          aggregated_by_down: {},
          aggregated_by_field_zone: {},
          aggregated_by_rush_count: {},
          aggregated_by_press_rate_bucket: {},
          best_10_scenarios: [],
          worst_10_scenarios: [],
        }
        if (pct >= 100) {
          result.value = getStubBatchResult(id, request.n_iterations, ['Auto: Scenario 1', 'Auto: Scenario 2', 'Auto: Scenario 3'])
          clearTimers()
          return
        }
        step += 1
        if (import.meta.client) stubTimer = setTimeout(runStubStep, 700)
      }
      if (import.meta.client) stubTimer = setTimeout(() => {
        status.value = { job_id: id, state: 'RUNNING', progress_percent: 0, progress_label: `Running iteration 0 of ${request.n_iterations.toLocaleString()}` }
        if (import.meta.client) stubTimer = setTimeout(runStubStep, 500)
      }, 400)
      return true
    }

    const { ok, data, status: httpStatus } = await engine.post<{ job_id: string }>('/api/v1/sim/play/batch', {
      offensive_play: toEngineCanvasData(request.offensive_play),
      defensive_play: request.defensive_play ? toEngineCanvasData(request.defensive_play) : null,
      defensive_players: request.defensive_players,
      field_settings: toEngineFieldSettings(request.field_settings),
      offensive_players: request.offensive_players,
      n_iterations: request.n_iterations,
      variation_seed: request.variation_seed,
      auto_generate: request.auto_generate ?? false,
      job_metadata: metadata,
    })
    if (!ok) {
      if (engine.engineError.value) runError.value = engine.engineError.value
      return false
    }
    if (!data?.job_id) return false
    jobId.value = data.job_id
    status.value = { job_id: data.job_id, state: 'PENDING' }
    if (import.meta.client) {
      elapsedTimer = setInterval(() => {
        elapsedSeconds.value += 1
      }, 1000)
    }
    return true
  }

  async function pollStatus() {
    if (!jobId.value || !baseUrl || useStub) return
    const { ok, data } = await engine.get<any>(`/api/v1/jobs/${jobId.value}`)
    if (!ok || !data) return
    const normalized = normalizeJobStatus(data)
    console.log('[poll-status]', normalized.state, normalized.progress_percent?.toFixed(0) + '%', normalized.progress_label)
    status.value = normalized
    if (normalized.state === 'COMPLETED' || normalized.state === 'FAILED' || normalized.state === 'CANCELLED') {
      clearTimers()
    }
  }

  async function pollResults() {
    if (!jobId.value || !baseUrl || useStub) return
    const currentState = status.value?.state
    if (!currentState || currentState === 'PENDING') return
    const { ok, data } = await engine.get<any>(`/api/v1/jobs/${jobId.value}/result`)
    if (!ok || !data) return
    const mapped = resultToPartial(data)
    console.log('[poll-results]', mapped.scenarios_completed, '/', mapped.scenarios_total, 'partial=', data.is_partial)
    partialResult.value = mapped
    if (!data.is_partial) {
      result.value = data as BatchSimResult
    }
  }

  function startPolling() {
    if (!jobId.value) return
    if (!import.meta.client) return
    statusTimer = setInterval(pollStatus, 2000)
    resultTimer = setInterval(pollResults, 3000)
    pollStatus()
    pollResults()
  }

  function attachToJob(id: string) {
    clearTimers()
    runError.value = null
    result.value = null
    partialResult.value = null
    status.value = { job_id: id, state: 'PENDING' as JobState }
    jobId.value = id
    elapsedSeconds.value = 0
    isLoadedResult.value = false
    loadedJobStatus.value = null
    if (import.meta.client) {
      elapsedTimer = setInterval(() => {
        elapsedSeconds.value += 1
      }, 1000)
    }
    startPolling()
  }

  async function probeEngine(): Promise<boolean> {
    if (!baseUrl || useStub) return false
    engine.clearEngineDown()
    const { ok } = await engine.get<{ queue?: { total_queued?: number } }>('/api/v1/health')
    if (ok) engine.clearRateLimit()
    return ok
  }

  async function getJobStatus(id: string): Promise<JobStatus | null> {
    if (useStub || !baseUrl) return null
    const { ok, data } = await engine.get<any>(`/api/v1/jobs/${id}`)
    return ok && data ? normalizeJobStatus(data) : null
  }

  async function cancelJob(): Promise<void> {
    if (!jobId.value) return
    if (useStub) {
      clearTimers()
      jobId.value = null
      status.value = null
      result.value = null
      elapsedSeconds.value = 0
      return
    }
    if (!baseUrl) return
    await engine.del(`/api/v1/jobs/${jobId.value}`)
    clearTimers()
    jobId.value = null
    status.value = null
    result.value = null
    partialResult.value = null
    elapsedSeconds.value = 0
    isLoadedResult.value = false
    loadedJobStatus.value = null
  }

  function reset() {
    clearTimers()
    jobId.value = null
    status.value = null
    result.value = null
    partialResult.value = null
    runError.value = null
    elapsedSeconds.value = 0
    isLoadedResult.value = false
    loadedJobStatus.value = null
  }

  async function loadResult(id: string): Promise<boolean> {
    if (!baseUrl) return false
    const [statusRes, resultRes] = await Promise.all([
      engine.get<any>(`/api/v1/jobs/${id}`),
      engine.get<any>(`/api/v1/jobs/${id}/result`),
    ])
    if (!statusRes.ok || !statusRes.data || !resultRes.ok || !resultRes.data) return false
    const normalized = normalizeJobStatus(statusRes.data)
    const resultData = resultRes.data
    jobId.value = id
    status.value = { ...normalized, state: 'COMPLETED' as JobState }
    result.value = resultData as BatchSimResult
    partialResult.value = resultToPartial(resultData)
    isLoadedResult.value = true
    loadedJobStatus.value = normalized
    return true
  }

  onUnmounted(() => {
    clearTimers()
  })

  const confidenceLevel = computed(() => {
    if (!partialResult.value) return 'idle' as const
    const total = partialResult.value.scenarios_total || 0
    const completed = partialResult.value.scenarios_completed || 0
    if (!total || completed <= 0) return 'calibrating' as const
    const pct = completed / total
    if (pct < 0.10) return 'calibrating' as const
    if (pct < 0.30) return 'early' as const
    if (pct < 0.60) return 'forming' as const
    if (pct < 0.90) return 'confident' as const
    return 'finalized' as const
  })

  return {
    jobId,
    status,
    result,
    partialResult,
    runError,
    rosterErrors,
    engineDown: engine.engineDown,
    elapsedSeconds,
    confidenceLevel,
    rateLimited: engine.rateLimited,
    retryAfterSeconds: engine.retryAfterSeconds,
    isLoadedResult,
    loadedJobStatus,
    startJob,
    startPolling,
    stopPolling,
    pollStatus,
    pollResults,
    cancelJob,
    reset,
    loadResult,
    attachToJob,
    getJobStatus,
    probeEngine,
  }
}
