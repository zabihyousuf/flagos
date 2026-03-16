<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">Summary</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-muted-foreground">Overall success rate</p>
          <p class="text-xl font-bold tabular-nums">{{ overallSuccessRate }}%</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Best situation</p>
          <p class="text-sm font-medium truncate" :title="bestScenario?.name">{{ bestScenario?.name ?? '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Worst situation</p>
          <p class="text-sm font-medium truncate" :title="worstScenario?.name">{{ worstScenario?.name ?? '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Total runs</p>
          <p class="text-sm font-medium">{{ result.total_iterations?.toLocaleString() ?? '—' }}</p>
          <p class="text-[10px] text-muted-foreground/80 mt-0.5">Simulation runs across all situations</p>
        </div>
      </div>
      <p v-if="recommendation" class="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{{ recommendation }}</p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { BatchSimResult } from '~/composables/usePlayLabJob'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps<{
  result: BatchSimResult
  playName: string
}>()

const overallSuccessRate = computed(() => {
  const list = props.result.scenario_results ?? []
  if (list.length === 0) return 0
  const sum = list.reduce((a: number, s: any) => a + s.success_rate, 0)
  return Math.round(sum / list.length)
})

const bestScenario = computed(() => {
  const list = props.result.scenario_results ?? []
  if (list.length === 0) return null
  return list.reduce((a: any, b: any) => (b.success_rate > a.success_rate ? b : a))
})

const worstScenario = computed(() => {
  const list = props.result.scenario_results ?? []
  if (list.length === 0) return null
  return list.reduce((a: any, b: any) => (b.success_rate < a.success_rate ? b : a))
})

const recommendation = computed(() => {
  const best = bestScenario.value
  const worst = worstScenario.value
  const overall = overallSuccessRate.value
  if (!best || !worst) return ''
  const parts: string[] = []
  if (overall >= 60) parts.push(`${props.playName} performs well overall (${overall}% success).`)
  else if (overall <= 40) parts.push(`${props.playName} struggles overall (${overall}% success).`)
  parts.push(`Best against: ${best.scenario_name} (${Math.round(best.success_rate)}%).`)
  parts.push(`Weakest against: ${worst.scenario_name} (${Math.round(worst.success_rate)}%).`)
  return parts.join(' ')
})
</script>
