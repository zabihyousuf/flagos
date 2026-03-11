<template>
  <Card class="overflow-hidden">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">{{ scenario.name }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <template v-if="skeleton">
        <div class="flex items-center gap-4">
          <Skeleton class="h-16 w-16 rounded-full shrink-0" />
          <div class="space-y-2 flex-1">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-3 w-32" />
          </div>
        </div>
        <Skeleton class="h-6 w-28 rounded-full" />
        <div class="flex gap-1 h-12 items-end">
          <Skeleton v-for="i in 8" :key="i" class="h-full flex-1 rounded-t" />
        </div>
      </template>
      <template v-else-if="result">
        <div class="flex items-center gap-4">
          <div class="relative h-16 w-16 shrink-0">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-muted stroke-current"
                stroke-width="2"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-primary stroke-current transition-all duration-500"
                stroke-width="2"
                stroke-dasharray="100"
                stroke-linecap="round"
                fill="none"
                :stroke-dashoffset="100 - result.success_rate"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{{ Math.round(result.success_rate) }}%</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">Success rate</p>
            <p class="text-xs text-muted-foreground">{{ result.iterations_completed.toLocaleString() }} iterations</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <Badge v-if="mostCommonOutcome" variant="secondary" class="text-xs">
            {{ formatOutcome(mostCommonOutcome) }}
          </Badge>
        </div>
        <div v-if="hasYardsData" class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">Yards gained</p>
          <div class="flex gap-0.5 items-end h-12">
            <div
              v-for="bar in yardBuckets"
              :key="bar.bucket"
              class="flex-1 min-w-0 flex flex-col items-center gap-0.5"
            >
              <div
                class="w-full rounded-t bg-primary/70 transition-all min-h-[4px]"
                :style="{ height: barHeight(bar.count) + 'px' }"
              />
              <span class="text-[10px] text-muted-foreground truncate w-full text-center">{{ bar.bucket }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.penalties_rate != null && result.penalties_rate > 0.05" class="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs">
          <span>Penalties: {{ (result.penalties_rate * 100).toFixed(1) }}%</span>
          <span v-if="result.most_common_penalty">({{ result.most_common_penalty }})</span>
        </div>
        <p v-if="insightLine && result.iterations_completed >= 1000" class="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
          {{ insightLine }}
        </p>
      </template>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { ScenarioResult } from '~/composables/usePlayLabJob'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'

const props = defineProps<{
  scenario: { key: string; name: string }
  result: ScenarioResult | null
  iterations: number
  skeleton: boolean
}>()

const mostCommonOutcome = computed(() => {
  const r = props.result
  if (!r?.outcome_counts) return null
  const entries = Object.entries(r.outcome_counts) as [string, number][]
  if (entries.length === 0) return null
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
})

const yardBuckets = computed(() => {
  const r = props.result?.yards_histogram
  if (!r || typeof r !== 'object') return []
  const entries = Object.entries(r).map(([k, v]) => [Number(k), v] as [number, number]).filter(([k]) => !Number.isNaN(k))
  if (entries.length === 0) return []
  entries.sort((a, b) => a[0] - b[0])
  const max = Math.max(...entries.map((e) => e[1]), 1)
  return entries.map(([k, v]) => ({ bucket: k, count: v, pct: v / max }))
})

const hasYardsData = computed(() => yardBuckets.value.length > 0)

const maxBar = computed(() => Math.max(...yardBuckets.value.map((b) => b.count), 1))

function barHeight(count: number) {
  return Math.max(4, (count / maxBar.value) * 40)
}

function formatOutcome(key: string) {
  return key.replace(/_/g, ' ')
}

const insightLine = computed(() => {
  const r = props.result
  if (!r || r.iterations_completed < 1000) return ''
  const rate = Math.round(r.success_rate)
  const outcome = mostCommonOutcome.value ? formatOutcome(mostCommonOutcome.value) : 'attempts'
  if (rate >= 70) return `Beats this scenario ${rate}% of the time. Most common result: ${outcome}.`
  if (rate <= 40) return `Struggles against this scenario — success rate ${rate}%. Most often: ${outcome}.`
  return `Success rate ${rate}% against this scenario. Most common outcome: ${outcome}.`
})
</script>
