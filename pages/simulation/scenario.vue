<template>
  <div class="flex flex-col h-screen bg-background">
    <!-- Header -->
    <div class="border-b bg-card shrink-0">
      <div class="flex items-center justify-between px-6 py-3">
        <div>
          <h1 class="text-xl font-bold tracking-tight font-display">Play Simulation</h1>
          <p class="text-xs text-muted-foreground">Run your plays against defenses</p>
        </div>
        <Button variant="ghost" size="icon" @click="$router.push('/simulation/game')">
          <X class="w-5 h-5" />
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar: Play Selection & Controls -->
      <div class="w-80 border-r bg-card overflow-y-auto shrink-0">
        <div class="p-4 space-y-5">
          <!-- Offensive Play -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <h3 class="text-sm font-semibold">Offensive Play</h3>
            </div>
            <Select v-model="selectedOffenseId">
              <SelectTrigger class="text-sm">
                <SelectValue placeholder="Select offense…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in offensePlays" :key="p.id" :value="p.id">
                  {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="selectedOffensePlay" class="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
              {{ selectedOffensePlay.formation || 'Custom formation' }}
            </div>
          </div>

          <!-- Defensive Play -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-red-500" />
              <h3 class="text-sm font-semibold">Defensive Play</h3>
            </div>
            <Select v-model="selectedDefenseId">
              <SelectTrigger class="text-sm">
                <SelectValue placeholder="Select defense…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in defensePlays" :key="p.id" :value="p.id">
                  {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="selectedDefensePlay" class="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
              {{ selectedDefensePlay.formation || 'Custom formation' }}
            </div>
          </div>

          <Separator />

          <!-- Controls -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold">Controls</h3>

            <Button
              class="w-full"
              :disabled="!canRun || simulation.isRunning.value"
              @click="runSimulation"
            >
              <PlayIcon class="w-4 h-4 mr-2" />
              {{ simulation.isRunning.value ? 'Running…' : 'Run Play' }}
            </Button>

            <div class="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="!simulation.isRunning.value"
                @click="simulation.pause()"
              >
                <Pause class="w-3.5 h-3.5 mr-1" />
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="simulation.simulationState.value === 'idle'"
                @click="handleReset"
              >
                <RotateCcw class="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>

            <!-- Speed slider -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium">
                Speed: {{ simulation.playbackSpeed.value.toFixed(2) }}x
              </label>
              <Slider
                :model-value="[simulation.playbackSpeed.value]"
                :min="0.25"
                :max="3"
                :step="0.25"
                @update:model-value="(v?: number[]) => { if (v?.[0] != null) simulation.playbackSpeed.value = v[0] }"
              />
              <div class="flex justify-between text-[10px] text-muted-foreground">
                <span>0.25x</span>
                <span>1x</span>
                <span>3x</span>
              </div>
            </div>
          </div>

          <Separator />

          <!-- Play State -->
          <div class="space-y-2">
            <h3 class="text-sm font-semibold">Play State</h3>
            <div class="p-2.5 rounded bg-muted/50 text-sm">
              <div class="font-medium capitalize">
                {{ simulation.simulationState.value.replace(/_/g, ' ') }}
              </div>
            </div>
          </div>

          <!-- Result -->
          <div v-if="result" class="space-y-2">
            <h3 class="text-sm font-semibold">Result</h3>
            <div
              class="p-3 rounded-lg"
              :class="{
                'bg-green-500/10 border border-green-500/20': result.outcome === 'completion' || result.outcome === 'touchdown',
                'bg-yellow-500/10 border border-yellow-500/20': result.outcome === 'incompletion',
                'bg-red-500/10 border border-red-500/20': result.outcome === 'interception' || result.outcome === 'sack',
                'bg-blue-500/10 border border-blue-500/20': result.outcome === 'scramble',
              }"
            >
              <div class="font-bold text-base capitalize">{{ result.outcome }}</div>
              <div class="text-sm mt-0.5">
                Yards: {{ result.yards > 0 ? '+' : '' }}{{ result.yards }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Simulation Canvas + Event Log -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Canvas -->
        <div class="flex-1 relative min-h-0">
          <SimulationCanvas
            v-if="offenseCanvasPlayers.length > 0"
            :offense-players="offenseCanvasPlayers"
            :defense-players="defenseCanvasPlayers"
            :field-settings="fieldSettingsData"
            :animated-positions="simulation.animatedPositions.value"
            :animated-ball="simulation.animatedBall.value"
          />
          <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select an offensive and defensive play to begin
          </div>
        </div>

        <!-- Event Log -->
        <div class="h-44 border-t bg-card overflow-y-auto shrink-0">
          <div class="p-3">
            <h3 class="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <Activity class="w-3.5 h-3.5" />
              Play-by-Play
            </h3>
            <div class="space-y-1">
              <div
                v-for="(ev, i) in simulation.events.value"
                :key="i"
                class="flex items-start gap-2.5 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span class="text-[10px] text-muted-foreground font-mono min-w-[2.5rem] pt-0.5">
                  {{ ev.time.toFixed(2) }}s
                </span>
                <div
                  class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  :class="eventDotColor(ev.type)"
                />
                <span class="text-sm">{{ ev.message }}</span>
              </div>

              <div v-if="simulation.events.value.length === 0" class="text-xs text-muted-foreground text-center py-6">
                Run a simulation to see play-by-play events.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayIcon, Pause, RotateCcw, X, Activity } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { Slider } from '~/components/ui/slider'
import SimulationCanvas from '~/components/canvas/SimulationCanvas.vue'
import type { Play, CanvasPlayer } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { usePlaySimulation } from '~/composables/usePlaySimulation'

definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()

// Plays
const offensePlays = ref<Play[]>([])
const defensePlays = ref<Play[]>([])
const selectedOffenseId = ref<string>('')
const selectedDefenseId = ref<string>('')

// Roster
const roster = ref<any[]>([])

// Field settings
const fieldSettings = ref<typeof DEFAULT_FIELD_SETTINGS | null>(null)

// Simulation
const simulation = usePlaySimulation()
const result = ref<{ outcome: string; yards: number } | null>(null)

const selectedOffensePlay = computed(() => offensePlays.value.find(p => p.id === selectedOffenseId.value))
const selectedDefensePlay = computed(() => defensePlays.value.find(p => p.id === selectedDefenseId.value))
const canRun = computed(() => !!selectedOffenseId.value && !!selectedDefenseId.value)

const offenseCanvasPlayers = computed<CanvasPlayer[]>(() =>
  selectedOffensePlay.value?.canvas_data?.players ?? []
)
const defenseCanvasPlayers = computed<CanvasPlayer[]>(() =>
  selectedDefensePlay.value?.canvas_data?.players ?? []
)

const fieldSettingsData = computed(() => {
  const fs = fieldSettings.value ?? DEFAULT_FIELD_SETTINGS
  return {
    field_length: fs.field_length,
    field_width: fs.field_width,
    endzone_size: fs.endzone_size,
    line_of_scrimmage: fs.line_of_scrimmage,
    first_down: fs.first_down ?? Math.floor(fs.field_length / 2),
  }
})

function eventDotColor(type: string): string {
  switch (type) {
    case 'snap': case 'motion': return 'bg-blue-500'
    case 'throw': return 'bg-orange-500'
    case 'catch': case 'touchdown': return 'bg-green-500'
    case 'incompletion': return 'bg-yellow-500'
    case 'interception': case 'sack': return 'bg-red-500'
    case 'flag_pull': return 'bg-purple-500'
    case 'scramble': return 'bg-sky-500'
    default: return 'bg-gray-400'
  }
}

// Watch for play over
watch(() => simulation.simulationState.value, (state) => {
  if (state === 'play_over') {
    result.value = simulation.getResult()
  }
})

function runSimulation() {
  if (!selectedOffensePlay.value || !selectedDefensePlay.value) return
  result.value = null

  simulation.initialize(
    offenseCanvasPlayers.value,
    defenseCanvasPlayers.value,
    roster.value,
    fieldSettingsData.value,
  )
  simulation.start()
}

function handleReset() {
  simulation.reset()
  result.value = null
}

// ── Data loading ────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadPlays(), loadRoster(), loadFieldSettings()])
})

onUnmounted(() => {
  simulation.pause()
})

async function loadPlays() {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return

  const [{ data: off }, { data: def }] = await Promise.all([
    supabase.from('plays').select('*').eq('user_id', user.user.id).eq('play_type', 'offense').order('updated_at', { ascending: false }),
    supabase.from('plays').select('*').eq('user_id', user.user.id).eq('play_type', 'defense').order('updated_at', { ascending: false }),
  ])
  if (off) offensePlays.value = off as unknown as Play[]
  if (def) defensePlays.value = def as unknown as Play[]
}

async function loadRoster() {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return
  const { data } = await supabase.from('players').select('*').eq('user_id', user.user.id)
  if (data) roster.value = data
}

async function loadFieldSettings() {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return
  const { data } = await supabase.from('field_settings').select('*').eq('user_id', user.user.id).single()
  if (data) fieldSettings.value = data as any
}
</script>
