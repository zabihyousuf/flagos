<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- Header Bar -->
    <div class="h-12 border-b border-border bg-card flex items-center px-4 shrink-0 gap-4">
      <!-- Left: Breadcrumbs -->
      <div class="flex items-center gap-1.5 min-w-0 shrink-0">
        <button
          class="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
          @click="goBack"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span class="truncate max-w-[120px]">{{ playbookName ?? 'Playbooks' }}</span>
        </button>
        <ChevronRight class="w-3 h-3 text-muted-foreground/50 shrink-0" />
        <span class="text-sm font-medium truncate max-w-[140px]">{{ currentPlay?.name ?? '...' }}</span>
        <span
          v-if="currentPlay?.play_type"
          class="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0"
        >
          {{ currentPlay.play_type === 'offense' ? 'OFF' : 'DEF' }}
        </span>
      </div>

      <!-- Center: Toolbar -->
      <div class="flex-1 flex justify-center">
        <CanvasToolbar
          v-if="canvasReady"
          :selected-tool="cSelectedTool"
          @select-tool="onSetTool"
          @clear-routes="onClearAllRoutes"
          @ai-action="onAiAction"
        />
      </div>

      <!-- Right: View Toggle + Save -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center bg-muted rounded-md p-0.5">
          <button
            class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors"
            :class="viewMode === 'fit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'fit'"
          >
            <Maximize2 class="w-3 h-3 inline-block mr-1" />
            Fit
          </button>
          <button
            class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors"
            :class="viewMode === 'full' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'full'"
          >
            <Fullscreen class="w-3 h-3 inline-block mr-1" />
            Full
          </button>
        </div>

        <Button
          size="sm"
          class="h-8 px-3"
          :disabled="!cIsDirty"
          @click="handleSave"
        >
          <Check class="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-muted-foreground bg-background">
      Loading play...
    </div>

    <!-- Three-column body -->
    <div v-else-if="currentPlay" class="flex-1 flex overflow-hidden min-h-0">
      <!-- Left: Roster Panel -->
      <div class="w-60 shrink-0">
        <CanvasRosterCard
          v-if="canvasReady"
          :players="cPlayers"
          :selected-player-id="cSelectedPlayerId"
          :all-roster="roster"
          :play-type="currentPlay.play_type"
          @select-player="onSelectPlayer"
          @remove-player="onRemovePlayer"
          @add-player="onAddPlayer"
        />
      </div>

      <!-- Center: Canvas -->
      <div class="flex-1 min-w-0">
        <PlayCanvas
          ref="canvasRef"
          :initial-data="currentPlay.canvas_data"
          :play-type="currentPlay.play_type"
          :field-settings="fieldSettingsData"
          :starters="starters"
          :all-roster="roster"
          :starter-position-map="starterPositionMap"
          :view-mode="viewMode"
          @save="handleSaveData"
          class="w-full h-full block"
        />
      </div>

      <!-- Right: Player Details Panel (always reserves space for centering) -->
      <div class="w-72 shrink-0">
        <CanvasPlayerCard
          v-if="cSelectedPlayer"
          :selected-player="cSelectedPlayer"
          :all-roster="roster"
          :field-settings="fieldSettingsData"
          :play-type="currentPlay.play_type"
          @update-designation="onSetPlayerDesignation"
          @update-attribute="onUpdatePlayerAttribute"
          @clear-route="onClearRoute"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer, CanvasTool, Player } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { ArrowLeft, ChevronRight, Check, Maximize2, Fullscreen } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import PlayCanvas from '~/components/canvas/PlayCanvas.vue'
import CanvasToolbar from '~/components/canvas/CanvasToolbar.vue'
import CanvasRosterCard from '~/components/canvas/CanvasRosterCard.vue'
import CanvasPlayerCard from '~/components/canvas/CanvasPlayerCard.vue'

definePageMeta({
  layout: 'canvas',
})

const route = useRoute()
const router = useRouter()
const playId = computed(() => route.params.id as string)

const { currentPlay, loading, fetchPlay, saveCanvasData } = usePlays()
const { settings: fieldSettings, fetchSettings } = useFieldSettings()
const { players, fetchPlayers } = usePlayers()
const { profile, fetchProfile } = useProfile()
const { teams, fetchTeams } = useTeams()

const viewMode = ref<'fit' | 'full'>('fit')
const canvasRef = ref<InstanceType<typeof PlayCanvas> | null>(null)
const canvasReady = ref(false)

// Safe computed accessors — proxyRefs auto-unwraps exposed refs, so no .value needed
const cPlayers = computed(() => canvasRef.value?.canvasData?.players ?? [])
const cSelectedPlayerId = computed(() => canvasRef.value?.selectedPlayerId ?? null)
const cSelectedPlayer = computed(() => canvasRef.value?.selectedPlayer ?? null)
const cSelectedTool = computed<CanvasTool>(() => canvasRef.value?.selectedTool ?? 'select')
const cIsDirty = computed(() => canvasRef.value?.isDirty ?? false)

// Wrapper functions — safe to call even if ref not ready
function onSelectPlayer(id: string) { canvasRef.value?.selectPlayer(id) }
function onRemovePlayer(id: string) { canvasRef.value?.removePlayerFromField(id) }
function onAddPlayer(player: Player) { canvasRef.value?.addPlayerToField(player) }
function onSetTool(tool: CanvasTool) { canvasRef.value?.setTool(tool) }
function onClearAllRoutes() { canvasRef.value?.clearAllRoutes() }
function onAiAction(action: string) { canvasRef.value?.handleAiAction(action) }
function onSetPlayerDesignation(playerId: string, designation: string) { canvasRef.value?.setPlayerDesignation(playerId, designation) }
function onUpdatePlayerAttribute(playerId: string, attrs: Partial<CanvasPlayer>) { canvasRef.value?.updatePlayerAttribute(playerId, attrs) }
function onClearRoute(playerId: string) { canvasRef.value?.clearRoute(playerId) }

// Fetch playbook name for breadcrumb
const playbookName = ref<string | null>(null)

// Get the primary team (if set)
const primaryTeam = computed(() => {
  if (!profile.value?.default_team_id) return null
  return teams.value.find((t) => t.id === profile.value!.default_team_id) ?? null
})

// Extract players from the primary team
const teamPlayers = computed<Player[]>(() => {
  if (!primaryTeam.value?.team_players) return []
  return primaryTeam.value.team_players
    .filter((tp) => tp.player)
    .map((tp) => tp.player!)
})

// Starters: from team if set, otherwise empty (no auto-placement)
const starters = computed<Player[]>(() => {
  if (!currentPlay.value) return []
  const playType = currentPlay.value.play_type

  if (primaryTeam.value?.team_players) {
    return primaryTeam.value.team_players
      .filter((tp) => {
        if (!tp.player) return false
        return playType === 'offense' ? tp.offense_starter : tp.defense_starter
      })
      .map((tp) => tp.player!)
  }

  return []
})

// Map of player ID → team-assigned position (from auto-starter)
const starterPositionMap = computed<Record<string, string>>(() => {
  if (!primaryTeam.value?.team_players || !currentPlay.value) return {}
  const playType = currentPlay.value.play_type
  const map: Record<string, string> = {}
  primaryTeam.value.team_players.forEach((tp) => {
    if (!tp.player) return
    const pos = playType === 'offense' ? tp.offense_position : tp.defense_position
    if (pos) map[tp.player.id] = pos
  })
  return map
})

// Roster: team players if team set, otherwise all players
const roster = computed<Player[]>(() => {
  if (primaryTeam.value) {
    return teamPlayers.value
  }
  return players.value
})

const fieldSettingsData = computed(() => {
  if (!fieldSettings.value) return DEFAULT_FIELD_SETTINGS
  return {
    field_length: fieldSettings.value.field_length,
    field_width: fieldSettings.value.field_width,
    endzone_size: fieldSettings.value.endzone_size,
    line_of_scrimmage: fieldSettings.value.line_of_scrimmage,
  }
})

function goBack() {
  if (currentPlay.value?.playbook_id) {
    router.push(`/playbooks/${currentPlay.value.playbook_id}`)
  } else {
    router.push('/playbooks')
  }
}

function handleSave() {
  if (!canvasRef.value) return
  const data = canvasRef.value.getExportData()
  handleSaveData(data)
}

async function handleSaveData(data: CanvasData) {
  if (!currentPlay.value) return
  await saveCanvasData(currentPlay.value.id, data)
  if (canvasRef.value) {
    canvasRef.value.isDirty = false
  }
}

async function fetchPlaybookName(playbookId: string) {
  const client = useSupabaseDB()
  const { data } = await client
    .from('playbooks')
    .select('name')
    .eq('id', playbookId)
    .single()
  if (data) {
    playbookName.value = (data as any).name
  }
}

onMounted(async () => {
  await fetchPlay(playId.value)
  fetchSettings()
  fetchPlayers()
  fetchProfile()
  fetchTeams()
  if (currentPlay.value?.playbook_id) {
    fetchPlaybookName(currentPlay.value.playbook_id)
  }
  // Wait for PlayCanvas to mount and expose its API
  await nextTick()
  canvasReady.value = true
})
</script>
