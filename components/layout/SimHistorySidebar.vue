<template>
  <!-- Outer wrapper: zero-width on mobile (panel is fixed), flex-inline on desktop -->
  <div class="sim-history-outer" :class="isOpen ? 'sim-history-outer--open' : ''">
    <!-- Mobile backdrop -->
    <div
      v-if="isOpen"
      class="sim-history-backdrop"
      aria-hidden
      @click="close"
    />
    <!-- Panel -->
    <div
      class="sim-history-panel"
      :class="isOpen ? 'sim-history-panel--open' : ''"
    >
      <header class="shrink-0 flex items-start justify-between gap-2 p-4">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-foreground">{{ isPlayer ? 'Shared Simulations' : 'Simulation History' }}</h3>
          <p class="text-xs text-muted-foreground mt-0.5">{{ isPlayer ? 'Results shared by your team' : 'Play Lab results' }}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="!isPlayer && batchSimJobs.length > 0"
            type="button"
            class="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Delete all"
            :disabled="isRefreshing"
            @click="deleteAll"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Refresh"
            :disabled="isRefreshing"
            @click="refresh"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
            @click="close"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </header>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <template v-if="isRefreshing">
          <div class="p-3 space-y-2">
            <div
              v-for="i in 5"
              :key="i"
              class="rounded-lg p-3 space-y-2 shadow-sm bg-muted/30"
            >
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-3 w-1/2" />
              <div class="flex gap-2">
                <Skeleton class="h-5 w-12 rounded-full" />
                <Skeleton class="h-5 w-20" />
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="error">
          <div class="p-4 space-y-2">
            <p class="text-sm text-destructive">{{ error }}</p>
            <Button variant="outline" size="sm" @click="refresh">Retry</Button>
          </div>
        </template>

        <template v-else-if="pendingItems.length === 0 && completedItems.length === 0">
          <div class="flex flex-col items-center justify-center text-center p-6">
            <p class="text-sm font-medium text-foreground">{{ isPlayer ? 'No shared simulations' : 'No simulations yet' }}</p>
            <p class="text-xs text-muted-foreground mt-1">{{ isPlayer ? 'Your coach will share Play Lab results here' : 'Run a simulation in Play Lab to see results here' }}</p>
          </div>
        </template>

        <template v-else>
          <div class="p-3 space-y-4">
            <section v-if="pendingItems.length > 0" class="space-y-2">
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Pending</h4>
              <ul class="space-y-1">
                <li
                  v-for="job in pendingItems"
                  :key="job.job_id"
                  class="group relative rounded-lg transition-colors cursor-pointer"
                  :class="
                    job.job_id === currentJobId
                      ? 'bg-accent/70'
                      : 'hover:bg-accent/40'
                  "
                  @click="onSelectJob(job)"
                >
                  <div class="p-3 space-y-1.5">
                    <p class="text-sm font-medium text-foreground truncate pr-7">
                      {{ job.job_metadata?.offensive_play_name ?? 'Play' }}
                    </p>
                    <p class="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{{ job.state === 'RUNNING' ? 'Running…' : 'Queued' }}</span>
                      <span
                        v-if="job.progress_percent != null"
                        class="tabular-nums text-[11px] text-muted-foreground/80"
                      >
                        · {{ Math.round(job.progress_percent) }}%
                      </span>
                    </p>
                    <span class="text-xs text-muted-foreground">
                      {{ formatIterations(job.job_metadata?.n_iterations) }}
                    </span>
                  </div>
                  <button
                    v-if="!isPlayer"
                    type="button"
                    class="absolute top-1/2 -translate-y-1/2 right-2.5 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete job"
                    @click.stop="deleteJob(job.job_id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </li>
              </ul>
            </section>
            <section v-if="completedItems.length > 0" class="space-y-2">
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Completed</h4>
              <p class="text-[10px] text-muted-foreground/80 px-1">Runs = total sim runs; situations = defensive situations tested.</p>
              <ul class="space-y-1">
                <li
                  v-for="job in completedItems"
                  :key="job.job_id"
                  class="group relative rounded-lg transition-colors cursor-pointer"
                  :class="
                    job.job_id === currentJobId
                      ? 'bg-accent/70'
                      : 'hover:bg-accent/40'
                  "
                  @click="onSelectJob(job)"
                >
                  <div class="p-3 space-y-1.5">
                    <p class="text-sm font-medium text-foreground truncate pr-7">
                      {{ job.job_metadata?.offensive_play_name ?? 'Play' }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatDate(job.completed_at) }}
                    </p>
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        v-if="job.overall_success_rate != null"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="successPillClass(job.overall_success_rate)"
                      >
                        {{ Math.round(job.overall_success_rate * 100) }}%
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ formatScenarioCount(job.job_metadata) }}
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ formatIterations(job.job_metadata?.n_iterations) }}
                      </span>
                    </div>
                  </div>
                  <button
                    v-if="!isPlayer"
                    type="button"
                    class="absolute top-1/2 -translate-y-1/2 right-2.5 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete job"
                    @click.stop="deleteJob(job.job_id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Outer wrapper ──────────────────────────────────────────────── */
.sim-history-outer {
  /* Mobile: zero width — panel is fixed so it doesn't take flex space */
  width: 0;
  flex-shrink: 0;
  height: 100%;
  position: relative;
}

@media (min-width: 1024px) {
  .sim-history-outer {
    /* Desktop: participates in flex layout */
    overflow: hidden;
    transition: width 0.2s ease-out;
    width: 0;
    background: color-mix(in oklch, var(--color-background) 40%, transparent);
  }

  .sim-history-outer--open {
    width: 320px;
  }
}

/* ── Mobile backdrop ────────────────────────────────────────────── */
.sim-history-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: oklch(0 0 0 / 0.5);
}

@media (min-width: 1024px) {
  .sim-history-backdrop {
    display: none;
  }
}

/* ── Panel ──────────────────────────────────────────────────────── */
.sim-history-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
  transition: transform 0.2s ease-out;
  border-radius: 0;
  box-shadow: none;

  /* Mobile: fixed overlay from left, below the mobile topbar */
  position: fixed;
  top: 48px; /* mobile topbar height */
  bottom: 0;
  left: 0;
  z-index: 50;
  transform: translateX(-320px);
}

.sim-history-panel--open {
  transform: translateX(0);
  box-shadow: 2px 0 24px oklch(0 0 0 / 0.15);
}

@media (min-width: 1024px) {
  .sim-history-panel {
    position: relative;
    top: auto;
    bottom: auto;
    left: auto;
    z-index: auto;
    transform: translateX(-320px);
    border-radius: 0 12px 12px 0;
    box-shadow: none;
    height: 100%;
  }

  .sim-history-panel--open {
    transform: translateX(0);
    box-shadow: 1px 0 8px oklch(0 0 0 / 0.06);
  }
}
</style>

<script setup lang="ts">
import { X, RefreshCw, Trash2 } from 'lucide-vue-next'
import type { JobStatus } from '~/composables/usePlayLabJob'
import { useSimHistoryPanel } from '~/composables/useSimHistoryPanel'
import { useJobHistory } from '~/composables/useJobHistory'
import { usePlayLabJob } from '~/composables/usePlayLabJob'

const { isOpen, close } = useSimHistoryPanel()
const { jobs, loading, error, fetchJobs, fetchSharedJobs, deleteJob: deleteJobFromDb, deleteAllJobs } = useJobHistory()
const { jobId: currentJobId } = usePlayLabJob()
const { isPlayer } = useAccountType()

const isRefreshing = computed(() => loading.value)

const batchSimJobs = computed<JobStatus[]>(() =>
  jobs.value.filter((j) => j.job_type === 'batch_sim')
)

const pendingItems = computed<JobStatus[]>(() => {
  const list = batchSimJobs.value.filter(
    (j) => j.state === 'PENDING' || j.state === 'RUNNING'
  )
  return list.slice(0, 25)
})

const completedItems = computed<JobStatus[]>(() => {
  const list = batchSimJobs.value
    .filter((j) => j.state === 'COMPLETED' || j.state === 'FAILED')
    .sort((a, b) => {
      const at = a.completed_at ?? ''
      const bt = b.completed_at ?? ''
      return bt.localeCompare(at)
    })
  return list.slice(0, 50)
})

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** When auto_generate, show the actual scenario count the engine generated. */
function formatScenarioCount(metadata: { n_scenarios?: number; auto_generate?: boolean } | undefined): string {
  if (metadata?.auto_generate) {
    const n = metadata?.n_scenarios ?? 2000
    return `${n.toLocaleString()} situations`
  }
  const n = metadata?.n_scenarios ?? 0
  return n === 1 ? '1 situation' : `${n} situations`
}

/** Iterations per scenario. */
function formatIterations(n: number | undefined): string {
  const val = n ?? 0
  return val === 1 ? '1 run/scenario' : `${(val).toLocaleString()} runs/scenario`
}

function successPillClass(rate: number): string {
  if (rate < 0.4) return 'bg-destructive/90 text-destructive-foreground'
  if (rate < 0.65) return 'bg-amber-500/90 text-amber-950'
  return 'bg-emerald-600/90 text-white'
}

async function refresh() {
  if (isPlayer.value) {
    await fetchSharedJobs()
  } else {
    await fetchJobs()
  }
}

function onSelectJob(job: JobStatus) {
  close()
  emit('select-job', job)
}

const { confirm } = useConfirm()

const route = useRoute()

const { dismissByJobId } = useNotifications()

async function deleteJob(jobId: string) {
  const ok = await confirm({
    title: 'Delete simulation',
    description: 'This will permanently remove this simulation and its results. This action cannot be undone.',
    actionLabel: 'Delete',
    variant: 'destructive',
  })
  if (!ok) return
  const success = await deleteJobFromDb(jobId)
  if (!success) return
  dismissByJobId(jobId)
  const currentId = route.params.id as string | undefined
  if (currentId === jobId) {
    navigateTo('/blurai/playlab')
  }
}

async function deleteAll() {
  const count = batchSimJobs.value.length
  const ok = await confirm({
    title: 'Delete all simulations',
    description: `This will permanently remove all ${count} simulation${count === 1 ? '' : 's'} and their results. This action cannot be undone.`,
    actionLabel: 'Delete all',
    variant: 'destructive',
  })
  if (!ok) return
  const deletedJobIds = batchSimJobs.value.map((job) => job.job_id)
  const success = await deleteAllJobs()
  if (success) {
    // Clear notifications locally after the server has removed the jobs and linked notifications.
    for (const jobId of deletedJobIds) {
      dismissByJobId(jobId)
    }
    const currentId = route.params.id as string | undefined
    if (currentId) navigateTo('/blurai/playlab')
  }
}

const emit = defineEmits<{
  'select-job': [job: JobStatus]
}>()

watch(isOpen, (open) => {
  if (open) refresh()
})

// Re-fetch when role resolves (profile loads after sidebar may have already opened)
watch(isPlayer, () => {
  if (isOpen.value) refresh()
})
</script>
