<template>
  <div v-if="selectedPlayer" class="w-full h-full bg-card border-border flex flex-col overflow-hidden">
    <!-- Panel Header: Title left, Undo/Redo right -->
    <div class="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
      <span class="text-sm font-semibold text-foreground">Player Details</span>
      <div class="flex items-center gap-0.5 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7"
                :disabled="!canUndo"
                @click="$emit('undo')"
              >
                <Undo2 class="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Undo</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7"
                :disabled="!canRedo"
                @click="$emit('redo')"
              >
                <Redo2 class="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Redo</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <div class="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
      <!-- Row 1: Player name and identity (same for offense and defense) -->
      <div class="flex items-center gap-3 pb-3 border-b border-border/50">
        <div
          class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-base font-bold shadow-md ring-2 ring-border/20"
          :style="{ background: posColor(selectedPlayer.position) }"
        >
          {{ selectedPlayer.designation }}
        </div>
        <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-base font-bold text-foreground truncate">{{ selectedPlayer.name ?? 'Unnamed' }}</span>
              <span v-if="selectedPlayer.number" class="text-[13px] font-mono text-muted-foreground shrink-0">#{{ selectedPlayer.number }}</span>
            </div>
            <div class="mt-1.5">
              <Select
                :model-value="selectedPlayerRole"
                @update:model-value="(v) => handleRoleChange(v as string)"
              >
                <SelectTrigger class="h-6 text-[13px] bg-muted/30 border-border/50 w-full">
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="role in availableRoles"
                    :key="role.position"
                    :value="role.position"
                  >
                    <div class="flex items-center justify-between w-full min-w-[120px]">
                      <span>{{ role.label }}</span>
                      <span class="text-muted-foreground ml-2 text-[13px] uppercase">{{ role.position }}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      </div>

      <!-- Defense: Coverage controls at top so they’re the main focus -->
      <!-- Appearance: shape, color, label (saved with play) -->
      <div class="space-y-3 pb-3 border-b border-border/50">
        <p class="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Appearance on field</p>

        <div class="space-y-1.5">
          <label class="text-[13px] text-muted-foreground">Shape</label>
          <div class="flex gap-1">
            <button
              v-for="shape in (['circle', 'square', 'triangle'] as const)"
              :key="shape"
              class="flex-1 px-2 py-1.5 text-[12px] rounded border transition-colors capitalize"
              :class="(selectedPlayer.markerShape ?? 'circle') === shape ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'"
              @click="$emit('update-attribute', selectedPlayer.id, { markerShape: shape })"
            >
              {{ shape }}
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[13px] text-muted-foreground">Color</label>
          <div class="flex flex-wrap gap-1.5 items-center">
            <button
              v-for="c in markerColorPresets"
              :key="c"
              class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
              :class="(selectedPlayer.markerColor ?? posColor(selectedPlayer.position)) === c ? 'border-foreground ring-2 ring-offset-2 ring-offset-card ring-primary' : 'border-transparent'"
              :style="{ background: c }"
              :title="c"
              @click="$emit('update-attribute', selectedPlayer.id, { markerColor: c })"
            />
            <input
              type="color"
              class="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent shrink-0"
              :value="selectedPlayer.markerColor ?? posColor(selectedPlayer.position)"
              @input="(e: any) => $emit('update-attribute', selectedPlayer.id, { markerColor: e.target.value })"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[13px] text-muted-foreground">Show in marker</label>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="opt in (['number', 'position', 'both', 'none'] as const)"
              :key="opt"
              class="px-2 py-1 text-[12px] rounded border transition-colors capitalize"
              :class="(selectedPlayer.showLabel ?? 'position') === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'"
              @click="$emit('update-attribute', selectedPlayer.id, { showLabel: opt })"
            >
              {{ opt === 'position' ? 'Position' : opt === 'number' ? 'Number' : opt === 'both' ? 'Both' : 'None' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Defense: Coverage controls -->
      <div v-if="playType === 'defense' && !isRusher(selectedPlayer)" class="space-y-3 pb-3 border-b border-border/50">
        <p class="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Coverage</p>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-[13px] text-muted-foreground">Coverage radius</label>
            <span class="text-[13px] font-mono">{{ selectedPlayer.coverageRadius ?? 5 }} yd</span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            :value="selectedPlayer.coverageRadius ?? 5"
            class="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            @input="(e: any) => $emit('update-attribute', selectedPlayer!.id, { coverageRadius: parseInt(e.target.value) })"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-[13px] text-muted-foreground">Alignment</label>
          <div class="grid grid-cols-4 gap-1">
            <button
              v-for="align in ['tight', 'normal', 'soft', 'off']"
              :key="align"
              class="px-1 py-1 text-[13px] rounded border transition-colors capitalize"
              :class="(selectedPlayer.alignment || 'normal') === align ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'"
              @click="$emit('update-attribute', selectedPlayer!.id, { alignment: align as 'tight' | 'normal' | 'soft' | 'off' })"
            >
              {{ align }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Grid: position on field -->
      <div class="space-y-1.5">
        <p class="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Position on field</p>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[13px] text-muted-foreground font-medium mb-0.5">Yard line</p>
            <p class="text-base font-mono font-bold text-foreground">{{ yardLine }}</p>
          </div>
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[13px] text-muted-foreground font-medium mb-0.5">From sideline</p>
            <p class="text-base font-mono font-bold text-foreground">{{ sidelineDistance }}</p>
          </div>
        </div>
      </div>

      <!-- Route Info -->
      <div v-if="playType === 'offense'" class="space-y-2 pt-2 border-t border-border/50">
        <div class="flex items-center justify-between">
          <p class="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Route Segments</p>
          <div class="flex items-center gap-1">
            <Button
              v-if="!pendingRoute"
              size="sm"
              variant="ghost"
              class="h-5 px-2 text-[13px] text-primary hover:text-primary hover:bg-primary/10"
              @click="handleSuggestRoute"
            >
              <Sparkles class="w-3 h-3 mr-1" />
              Suggest
            </Button>
            <Button
              v-if="selectedPlayer.route && selectedPlayer.route.segments.length > 0 && !pendingRoute"
              size="sm"
              variant="ghost"
              class="h-5 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
              @click="$emit('clear-route', selectedPlayer.id)"
            >
              Delete route
            </Button>
          </div>
        </div>

        <!-- Pending Route Actions -->
        <div v-if="pendingRoute" class="flex items-center justify-between bg-muted/40 p-1.5 rounded border border-primary/20 mb-2">
          <span class="text-[13px] font-medium text-primary flex items-center gap-1">
            <Sparkles class="w-3 h-3" />
            Suggested Route
          </span>
          <div class="flex gap-1">
            <Button size="icon" class="h-6 w-6 rounded-full" variant="secondary" @click="acceptRoute">
              <Check class="w-3 h-3 text-emerald-500" />
            </Button>
            <Button size="icon" class="h-6 w-6 rounded-full" variant="ghost" @click="denyRoute">
              <X class="w-3 h-3 text-destructive" />
            </Button>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap min-h-[22px]">
          <div v-if="(!selectedPlayer.route || selectedPlayer.route.segments.length === 0) && !pendingRoute" class="text-[13px] text-muted-foreground italic px-2">
            No route assigned
          </div>
          <div
            v-for="(seg, i) in (pendingRoute ? pendingRoute.segments : selectedPlayer.route?.segments)"
            :key="i"
            class="text-[13px] pl-2 pr-1 py-0.5 rounded-full border text-foreground font-medium flex items-center gap-1 transition-colors group/seg"
            :class="pendingRoute ? 'bg-primary/10 border-primary/30' : 'bg-muted border-border'"
          >
            <span>{{ seg.type }}</span>
            <span v-if="seg.readOrder" class="bg-primary text-primary-foreground text-[11px] w-3.5 h-3.5 flex items-center justify-center rounded-full -mr-1 shadow-sm">{{ seg.readOrder }}</span>
            <button
              v-if="!pendingRoute && selectedPlayer.route?.segments"
              type="button"
              class="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
              title="Remove segment"
              @click.stop="$emit('delete-segment', selectedPlayer.id, i)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- QB throws here (primary target) -->
        <div v-if="selectedPlayer.route && selectedPlayer.route.segments.length > 0 && !pendingRoute" class="pt-1.5">
          <Button
            size="sm"
            :variant="selectedPlayer.primaryTarget ? 'default' : 'outline'"
            class="h-7 px-2 text-[13px] w-full"
            @click="$emit('update-attribute', selectedPlayer.id, { primaryTarget: !selectedPlayer.primaryTarget })"
          >
            <Target class="w-3 h-3 mr-1.5" />
            {{ selectedPlayer.primaryTarget ? 'QB throws here' : 'QB throws here (set as primary)' }}
          </Button>
        </div>
      </div>

      <!-- Analytics (route for offense, rush-to-QB for rushers) -->
      <div v-if="routeAnalytics" class="space-y-2 pt-2 border-t border-border/50">
        <div class="flex items-center justify-between">
          <p class="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
            {{ isRusher(selectedPlayer) ? 'Rush to QB' : 'Route analytics' }}
          </p>
          <span class="text-[13px] text-muted-foreground/60 font-mono">SPD: {{ playerSpeedAttr }}/10</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[13px] text-muted-foreground font-medium mb-0.5">
              {{ isRusher(selectedPlayer) ? 'TIME TO QB' : 'EST. TIME' }}
            </p>
            <p class="text-base font-mono font-bold text-emerald-500 leading-none">{{ routeAnalytics.totalDuration.toFixed(2) }}s</p>
          </div>
          <div class="bg-muted/30 rounded px-2.5 py-1.5 border border-border/50">
            <p class="text-[13px] text-muted-foreground font-medium mb-0.5">
              {{ isRusher(selectedPlayer) ? 'PATH TO QB' : 'DISTANCE' }}
            </p>
            <p class="text-base font-mono font-bold leading-none text-foreground">{{ routeAnalytics.totalDistance.toFixed(1) }} <span class="text-[13px] font-normal text-muted-foreground">yd</span></p>
          </div>
        </div>

        <!-- Timeline: segment duration (rush path vs route segments) -->
        <div class="space-y-px pl-1 pt-1">
          <div v-for="(seg, i) in routeAnalytics.segments" :key="i" class="flex items-center text-[13px] gap-2 h-5 relative group">
            <!-- Connector line -->
            <div v-if="i < routeAnalytics.segments.length - 1" class="absolute left-[2.5px] top-2.5 bottom-[-8px] w-px bg-border group-last:hidden" />

            <div
              class="w-1.5 h-1.5 rounded-full z-10 shrink-0 ring-2 ring-card"
              :class="seg.isCut ? 'bg-amber-500' : 'bg-muted-foreground'"
            />
            <span class="text-muted-foreground min-w-[3rem] font-medium">
              {{ segmentLabel(routeAnalytics.segments.length, i, seg, isRusher(selectedPlayer)) }}
            </span>
            <span class="font-mono text-foreground font-medium" :title="'Segment: ' + seg.duration.toFixed(2) + 's' + (routeAnalytics.segments.length > 1 ? ' · Total: ' + seg.cumulativeTime.toFixed(2) + 's' : '')">
              {{ seg.duration.toFixed(2) }}s
            </span>
            <span class="text-muted-foreground ml-auto font-mono text-[13px]">{{ seg.distance.toFixed(1) }}yd</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasPlayer, Player, RouteSegment } from '~/lib/types'
import {
  POSITION_COLORS,
  POSITION_LABELS,
  OFFENSE_DESIGNATIONS,
  DEFENSE_DESIGNATIONS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
  ATTRIBUTE_WEIGHTS,
} from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useRouteAnalysis } from '~/composables/useRouteAnalysis'
import { Sparkles, Check, X, Target, Undo2, Redo2 } from 'lucide-vue-next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'

const props = withDefaults(
  defineProps<{
    selectedPlayer: CanvasPlayer | null
    allRoster: Player[]
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number }
    playType: 'offense' | 'defense'
    canUndo?: boolean
    canRedo?: boolean
  }>(),
  { canUndo: false, canRedo: false }
)

const emit = defineEmits<{
  'update-designation': [playerId: string, designation: string]
  'update-attribute': [playerId: string, attributes: Partial<CanvasPlayer>]
  'clear-route': [playerId: string]
  'delete-segment': [playerId: string, segmentIndex: number]
  'suggest-route-preview': [payload: { playerId: string; route: { segments: RouteSegment[] } } | null]
  undo: []
  redo: []
}>()

const { analyzeRoute, generateRandomRoute, suggestRouteForPlayer } = useRouteAnalysis()

// State for suggested route
const pendingRoute = ref<{ segments: RouteSegment[] } | null>(null)

watch(() => props.selectedPlayer?.id, () => {
  pendingRoute.value = null
  emit('suggest-route-preview', null)
})

function posColor(pos: string) {
  return POSITION_COLORS[pos] ?? '#888888'
}

const markerColorPresets = Object.values(POSITION_COLORS)

function isRusher(player: CanvasPlayer | null): boolean {
  if (!player) return false
  return player.designation === 'R' || player.position === 'RSH'
}

const POSITION_DESIGNATION_MAP: Record<string, string[]> = {
  // Offense
  QB: ['Q'],
  WR: ['X', 'Y', 'Z'],
  C: ['C'],
  RB: ['H', 'F'],
  TE: ['Y'],
  // Defense
  RSH: ['R'],
  DB: ['D1', 'D2', 'D3', 'D4'],
  LB: ['D1', 'D2', 'D3', 'D4'],
  CB: ['D1', 'D2', 'D3', 'D4'],
  S: ['D1', 'D2', 'D3', 'D4'],
}

const rosterPlayer = computed(() => {
  if (!props.selectedPlayer) return null
  return props.allRoster.find(
    (p) => p.name === props.selectedPlayer?.name && p.number === props.selectedPlayer?.number
  )
})

const playerAttributes = computed(() => {
  if (!rosterPlayer.value) return null
  const specificAttrs = props.playType === 'offense'
    ? rosterPlayer.value.offense_attributes
    : rosterPlayer.value.defense_attributes

  return {
    ...rosterPlayer.value.universal_attributes,
    ...specificAttrs
  }
})

const playerSpeedAttr = computed(() => {
  return playerAttributes.value?.speed ?? 5
})

/** Route: Route/Start/Cut/Leg. Rusher: Rush/Start/Turn/Leg (time-to-QB path). */
function segmentLabel(totalSegments: number, index: number, seg: { isCut: boolean }, isRusherPlayer: boolean): string {
  if (totalSegments === 1) return isRusherPlayer ? 'Rush' : 'Route'
  if (index === 0) return 'Start'
  return seg.isCut ? (isRusherPlayer ? 'Turn' : 'Cut') : 'Leg'
}

const routeAnalytics = computed(() => {
  if (!props.selectedPlayer) return null
  const routeToAnalyze = pendingRoute.value ? pendingRoute.value : props.selectedPlayer.route
  if (!routeToAnalyze || !routeToAnalyze.segments || routeToAnalyze.segments.length === 0) return null

  const tempPlayer = { ...props.selectedPlayer, route: routeToAnalyze }
  return analyzeRoute(tempPlayer, props.fieldSettings, playerAttributes.value)
})

const availablePositions = computed(() => {
  if (rosterPlayer.value) {
    const posField = props.playType === 'offense' ? 'offense_positions' : 'defense_positions'
    const positions = rosterPlayer.value[posField] as string[]
    if (positions && positions.length > 0) {
      return positions
    }
  }

  return props.playType === 'offense'
    ? [...OFFENSE_POSITIONS]
    : [...DEFENSE_POSITIONS]
})

const availableRoles = computed(() => {
  if (!props.selectedPlayer) return []

  const positions = availablePositions.value
  const uniquePositions = new Set(positions)

  return Array.from(uniquePositions).map(pos => ({
    position: pos,
    label: POSITION_LABELS[pos] || pos
  }))
})

const selectedPlayerRole = computed(() => {
  return props.selectedPlayer?.position || ''
})

function weightedAttr(attributes: any, keys: string[]): number {
  return keys.reduce((sum, key) => {
    const v = attributes?.[key] ?? 0
    const w = ATTRIBUTE_WEIGHTS[key] ?? 1
    return sum + v * w
  }, 0)
}

function determineBestRole(player: CanvasPlayer, attributes: any): { position: string, designation: string } {
  const scores: Record<string, number> = {}

  availablePositions.value.forEach(pos => {
    let score = 0
    if (pos === 'QB') {
      score = weightedAttr(attributes, [
        'throwing_power', 'accuracy', 'decision_making', 'pocket_awareness',
        'release_quickness', 'throw_timing', 'throw_on_run', 'ball_security',
        'speed', 'agility', 'field_vision', 'reaction_time',
      ])
    }
    if (pos === 'WR') {
      score = weightedAttr(attributes, [
        'catching', 'route_running', 'release', 'separation', 'jump_ball',
        'ball_tracking', 'contested_catch', 'hands_consistency', 'after_catch_vision',
        'speed', 'acceleration', 'agility', 'change_of_direction', 'reach',
      ])
    }
    if (pos === 'C') {
      score = weightedAttr(attributes, [
        'snapping', 'snap_accuracy', 'snap_speed', 'snap_velocity',
        'agility', 'reaction_time', 'body_control_balance',
      ])
    }
    if (pos === 'RSH') {
      score = weightedAttr(attributes, [
        'rush', 'rush_moves', 'timing', 'get_off_burst', 'rush_angle_efficiency',
        'closing_burst_rush', 'rush_discipline', 'sack_flag_conversion',
        'speed', 'acceleration', 'reaction_time',
      ])
    }
    if (pos === 'DB') {
      score = weightedAttr(attributes, [
        'coverage', 'ball_hawking', 'zone_awareness', 'coverage_technique',
        'ball_skills_defensive', 'closing_burst', 'recovery_agility', 'flag_pull_technique',
        'play_recognition', 'flag_pulling', 'pursuit', 'speed', 'agility', 'change_of_direction',
      ])
    }
    if (pos === 'MLB') {
      score = weightedAttr(attributes, [
        'play_recognition', 'field_awareness', 'zone_recognition', 'pursuit_angle', 'coverage_support',
        'zone_awareness', 'coverage', 'flag_pulling', 'pursuit', 'speed', 'reaction_time',
      ])
    }
    scores[pos] = score
  })

  let bestPos = availablePositions.value[0]
  let maxScore = -1

  for (const [pos, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      bestPos = pos
    }
  }

  const designations = POSITION_DESIGNATION_MAP[bestPos]
  const bestDes = designations ? designations[0] : bestPos

  return { position: bestPos, designation: bestDes }
}

watch(() => props.selectedPlayer?.id, (newId, oldId) => {
  if (newId && newId !== oldId && props.selectedPlayer && playerAttributes.value) {
    const currentPos = props.selectedPlayer.position
    if (!availablePositions.value.includes(currentPos)) {
        const best = determineBestRole(props.selectedPlayer, playerAttributes.value)
        emit('update-attribute', props.selectedPlayer.id, { position: best.position, designation: best.designation })
    }
  }
}, { immediate: true })

function handleRoleChange(value: string) {
  if (!props.selectedPlayer) return
  const position = value

  const designations = POSITION_DESIGNATION_MAP[position]
  const designation = designations && designations.length > 0 ? designations[0] : position

  emit('update-attribute', props.selectedPlayer.id, { position, designation })
}

function handleSuggestRoute() {
  if (!props.selectedPlayer) return
  const route =
    props.playType === 'offense' && props.allRoster?.length
      ? suggestRouteForPlayer(props.selectedPlayer, props.allRoster, props.fieldSettings)
      : generateRandomRoute(props.selectedPlayer, props.fieldSettings)
  if (route) {
    pendingRoute.value = route
    emit('suggest-route-preview', { playerId: props.selectedPlayer.id, route })
  }
}

function acceptRoute() {
  if (pendingRoute.value && props.selectedPlayer) {
    emit('update-attribute', props.selectedPlayer.id, { route: pendingRoute.value })
    pendingRoute.value = null
    emit('suggest-route-preview', null)
  }
}

function denyRoute() {
  pendingRoute.value = null
  emit('suggest-route-preview', null)
}

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
  const distFromSideline = Math.min(distFromLeft, field_width - distFromLeft)
  return `${distFromSideline.toFixed(1)} yd`
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>
