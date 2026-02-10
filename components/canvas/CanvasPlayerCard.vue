<template>
  <div v-if="selectedPlayer" class="w-72 bg-card/95 backdrop-blur shadow-xl rounded-lg overflow-hidden border border-border flex flex-col">
    <!-- Header / Drag Handle -->
    <div 
      class="h-8 bg-muted/50 border-b border-border flex items-center px-3 cursor-move hover:bg-muted/80 transition-colors"
      @mousedown="$emit('start-drag', $event)"
    >
      <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Player Details</span>
    </div>

    <div class="p-3 space-y-3">
      <!-- Player Header -->
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
          :style="{ background: posColor(selectedPlayer.position) }"
        >
          {{ selectedPlayer.designation }}
        </div>
        <div>
          <p class="text-sm font-semibold leading-none text-foreground">
            {{ selectedPlayer.name ?? 'Unnamed' }}
            <span v-if="selectedPlayer.number" class="text-muted-foreground ml-1">#{{ selectedPlayer.number }}</span>
          </p>
          <p class="text-[10px] text-muted-foreground mt-0.5 font-medium">{{ POSITION_LABELS[selectedPlayer.position] ?? selectedPlayer.position }}</p>
        </div>
      </div>

      <!-- Designation -->
      <div class="space-y-1.5">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Designation</label>
        <Select :model-value="selectedPlayer.designation" @update:model-value="(v: any) => $emit('update-designation', selectedPlayer!.id, v)">
          <SelectTrigger class="h-7 text-xs bg-muted/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="d in availableDesignations" :key="d" :value="d">
              {{ d }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
          <p class="text-[9px] text-muted-foreground font-medium mb-0.5">YARD LINE</p>
          <p class="text-xs font-mono font-bold text-foreground">{{ yardLine }}</p>
        </div>
        <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
          <p class="text-[9px] text-muted-foreground font-medium mb-0.5">FROM SIDELINE</p>
          <p class="text-xs font-mono font-bold text-foreground">{{ sidelineDistance }}</p>
        </div>
      </div>

      <!-- Route Info -->
      <div v-if="selectedPlayer.route && selectedPlayer.route.segments.length > 0" class="space-y-2 pt-2 border-t border-border/50">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Route Segments</p>
          <Button size="sm" variant="ghost" class="h-5 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2" @click="$emit('clear-route', selectedPlayer.id)">
            Clear
          </Button>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <div
            v-for="(seg, i) in selectedPlayer.route.segments"
            :key="i"
            class="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground font-medium flex items-center gap-1"
          >
            <span>{{ seg.type }}</span>
            <span v-if="seg.readOrder" class="bg-primary text-primary-foreground text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full -mr-1 shadow-sm">{{ seg.readOrder }}</span>
          </div>
        </div>
      </div>

      <!-- Analytics -->
      <div v-if="routeAnalytics" class="space-y-2 pt-2 border-t border-border/50">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Analytics</p>
          <span class="text-[9px] text-muted-foreground/60 font-mono">SPD: {{ playerSpeedAttr }}/10</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[9px] text-muted-foreground font-medium mb-0.5">EST. TIME</p>
            <p class="text-sm font-mono font-bold text-emerald-500 leading-none">{{ routeAnalytics.totalDuration.toFixed(2) }}s</p>
          </div>
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[9px] text-muted-foreground font-medium mb-0.5">DISTANCE</p>
            <p class="text-sm font-mono font-bold leading-none text-foreground">{{ routeAnalytics.totalDistance.toFixed(1) }} <span class="text-[9px] font-normal text-muted-foreground">yd</span></p>
          </div>
        </div>
        
        <!-- Timeline -->
        <div class="space-y-px pl-1 pt-1">
          <div v-for="(seg, i) in routeAnalytics.segments" :key="i" class="flex items-center text-[10px] gap-2 h-5 relative group">
            <!-- Connector line -->
            <div v-if="i < routeAnalytics.segments.length - 1" class="absolute left-[2.5px] top-2.5 bottom-[-8px] w-px bg-border group-last:hidden" />
            
            <div 
              class="w-1.5 h-1.5 rounded-full z-10 shrink-0 ring-2 ring-card" 
              :class="seg.isCut ? 'bg-amber-500' : 'bg-muted-foreground'" 
            />
            <span class="text-muted-foreground min-w-[3rem] font-medium">
              {{ i === 0 ? 'Start' : (seg.isCut ? 'Cut' : 'Leg') }}
            </span>
            <span class="font-mono text-foreground font-medium">{{ seg.cumulativeTime.toFixed(2) }}s</span>
            <span class="text-muted-foreground ml-auto font-mono text-[9px]">{{ seg.distance.toFixed(1) }}yd</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasPlayer, Player } from '~/lib/types'
import { POSITION_COLORS, POSITION_LABELS, OFFENSE_DESIGNATIONS, DEFENSE_DESIGNATIONS } from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useRouteAnalysis } from '~/composables/useRouteAnalysis'

const props = defineProps<{
  selectedPlayer: CanvasPlayer | null
  allRoster: Player[]
  fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number }
  playType: 'offense' | 'defense'
}>()

const emit = defineEmits<{
  'update-designation': [playerId: string, designation: string]
  'clear-route': [playerId: string]
  'start-drag': [event: MouseEvent]
}>()

const { analyzeRoute } = useRouteAnalysis()

function posColor(pos: string) {
  return POSITION_COLORS[pos] ?? '#888888'
}

const POSITION_DESIGNATION_MAP: Record<string, string[]> = {
  // Offense
  QB: ['Q'],
  WR: ['X', 'Y', 'Z'],
  C: ['C'],
  // Defense
  RSH: ['R'],
  DB: ['D1', 'D2', 'D3', 'D4'],
  MLB: ['D1', 'D2', 'D3', 'D4'],
}

const rosterPlayer = computed(() => {
  if (!props.selectedPlayer) return null
  return props.allRoster.find(
    (p) => p.name === props.selectedPlayer?.name && p.number === props.selectedPlayer?.number
  )
})

const playerAttributes = computed(() => {
  if (!rosterPlayer.value) return null
  return props.playType === 'offense' 
    ? rosterPlayer.value.offense_attributes 
    : rosterPlayer.value.defense_attributes
})

const playerSpeedAttr = computed(() => {
  return playerAttributes.value?.speed ?? 5
})

const routeAnalytics = computed(() => {
  if (!props.selectedPlayer || !props.selectedPlayer.route) return null
  return analyzeRoute(props.selectedPlayer, props.fieldSettings, playerAttributes.value)
})

const availableDesignations = computed(() => {
  if (!props.selectedPlayer) return []

  if (rosterPlayer.value) {
    const posField = props.playType === 'offense' ? 'offense_positions' : 'defense_positions'
    const positions = rosterPlayer.value[posField] as string[] | undefined
    
    if (positions && positions.length > 0) {
      const allowed = new Set<string>()
      positions.forEach((pos) => {
        const designations = POSITION_DESIGNATION_MAP[pos]
        if (designations) {
          designations.forEach((d) => allowed.add(d))
        }
      })
      if (allowed.size > 0) {
        const standardOrder = props.playType === 'offense' ? OFFENSE_DESIGNATIONS : DEFENSE_DESIGNATIONS
        return standardOrder.filter((d) => allowed.has(d))
      }
    }
  }

  return props.playType === 'offense'
    ? [...OFFENSE_DESIGNATIONS]
    : [...DEFENSE_DESIGNATIONS]
})

const yardLine = computed(() => {
  if (!props.selectedPlayer) return '—'
  const { field_length, endzone_size } = props.fieldSettings
  const totalLength = field_length + endzone_size * 2
  const yardFromTop = props.selectedPlayer.y * totalLength
  const relativeYard = yardFromTop - endzone_size
  const displayYard = Math.round(field_length - relativeYard)
  return `${Math.max(0, Math.min(field_length, displayYard))} yd`
})

const sidelineDistance = computed(() => {
  if (!props.selectedPlayer) return '—'
  const { field_width } = props.fieldSettings
  const distFromLeft = props.selectedPlayer.x * field_width
  const distFromCenter = Math.abs(distFromLeft - field_width / 2)
  return `${distFromCenter.toFixed(1)} yd`
})
</script>
