<template>
  <div v-if="showAny" class="space-y-1.5">
    <p
      v-if="reachable && queueBusy"
      class="text-sm text-muted-foreground"
    >
      The simulation queue is busy ({{ totalQueued }} jobs waiting). Your job will start when capacity is available.
    </p>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'

const engine = useEngineClient()
const reachable = ref(false)
const totalQueued = ref(0)
const totalRunning = ref(0)
const hasToastedUnreachable = ref(false)

const hasEngineUrl = computed(() => !!engine.baseUrl)

const queueBusy = computed(() => totalQueued.value > 5)

const showAny = computed(() => {
  if (!hasEngineUrl.value) return false
  if (!reachable.value) return true
  return queueBusy.value
})

async function poll() {
  if (!engine.baseUrl) return
  const { ok, data } = await engine.get<{ queue?: { total_queued?: number; total_running?: number } }>('/api/v1/health')
  if (ok && data) {
    reachable.value = true
    hasToastedUnreachable.value = false
    totalQueued.value = data.queue?.total_queued ?? 0
    totalRunning.value = data.queue?.total_running ?? 0
  } else {
    if (hasEngineUrl.value && !hasToastedUnreachable.value) {
      hasToastedUnreachable.value = true
      toast.error('Simulation engine is unreachable. Check your connection or try again later.')
    }
    reachable.value = false
  }
}

let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!engine.baseUrl) return
  poll()
  interval = setInterval(poll, 15000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>
