<template>
  <div class="h-full w-full flex flex-col overflow-hidden py-4 px-4">
    <!-- Header Bar: 3-zone layout so toolbar stays visually centered -->
    <div class="h-12 bg-card flex items-center px-4 shrink-0 gap-2 lg:gap-4 rounded-lg shadow-md">
      <!-- Left: Play name + play type -->
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <!-- Editable Play Name -->
        <div class="w-36 shrink-0" v-if="currentPlay">
          <input
            v-model="currentPlay.name"
            class="w-full bg-transparent text-sm font-medium truncate border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors"
            @change="handleNameChange"
          />
        </div>
        <span v-else class="text-sm font-medium">Loading...</span>

        <!-- Play type: Offensive / Defensive (disabled for saved plays) -->
        <div class="flex items-center gap-2 ml-2 shrink-0" v-if="currentPlay">
          <span class="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Play type</span>
          <div class="flex items-center bg-muted rounded-full p-0.5">
            <button
              class="px-2 py-0.5 text-[12px] font-medium rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              :class="currentPlay.play_type === 'offense'
                ? 'bg-primary/15 text-primary shadow-sm border border-primary/30'
                : 'text-primary/70 hover:bg-primary/10 hover:text-primary'"
              :disabled="playId !== 'new'"
              @click="handleTypeChange('offense')"
            >
              <Swords class="w-3 h-3" />
              <span>Offense</span>
            </button>
            <button
              class="px-2 py-0.5 text-[12px] font-medium rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              :class="currentPlay.play_type === 'defense'
                ? 'bg-destructive/15 text-destructive shadow-sm border border-destructive/30'
                : 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'"
              :disabled="playId !== 'new'"
              @click="handleTypeChange('defense')"
            >
              <Shield class="w-3 h-3" />
              <span>Defense</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Center: Toolbar -->
      <div class="flex-1 flex justify-center items-center min-w-0 gap-1.5">
        <CanvasToolbar
          v-if="canvasReady"
          :selected-tool="cSelectedTool"
          :can-set-primary-target="canSetPrimaryTarget"
          :selected-player-is-primary="selectedPlayerIsPrimary"
          :suggest-play-disabled="true"
          :motion-tool-disabled="motionToolDisabled"
          :read-order-disabled="readOrderDisabled"
          :route-tools-disabled="currentPlay?.play_type === 'defense'"
          :erase-tool-disabled="currentPlay?.play_type === 'defense'"
          :show-zone-position-button="showZonePositionButton"
          :zone-position-unlocked="zonePositionUnlocked"
          @select-tool="onSetTool"
          @clear-routes="onClearAllRoutes"
          @ai-action="onAiAction"
          @set-primary-target="onSetPrimaryTarget"
          @toggle-zone-position="onToggleZonePosition"
        />
        <TooltipProvider v-if="currentPlay?.play_type === 'offense' && playTest.simulationState.value !== 'play_over'">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                :disabled="loading || playTest.isRunning.value || !anyOffensePlayerHasRoute"
                @click="runPlayTest"
              >
                <Play class="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Test play</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider v-else-if="currentPlay?.play_type === 'offense' && playTest.simulationState.value === 'play_over'">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                @click="playTest.clearOverlay()"
              >
                <RotateCcw class="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Reset play test</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <!-- Right: Ghost defense (offense only) + View Toggle + Save -->
      <div class="flex-1 min-w-0 flex items-center justify-end gap-2">
        <!-- Ghost defense overlay: pick a defensive play to show as ghosts -->
        <DropdownMenu v-if="currentPlay?.play_type === 'offense'" v-model:open="ghostDropdownOpen">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 gap-1.5"
                    :class="ghostPlayers.length ? 'border-primary/50 text-primary bg-primary/5' : ''"
                  >
                    <Shield class="w-3.5 h-3.5" />
                    <span class="text-[12px] font-medium">{{ ghostLabel }}</span>
                    <ChevronDown class="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Overlay a defensive play on the field to see coverage and rush paths</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" class="w-56 max-h-[280px] overflow-y-auto">
            <DropdownMenuItem
              class="text-[12px]"
              :class="!ghostPlayers.length ? 'bg-accent' : ''"
              @click="setGhostFromPlay(null)"
            >
              <span class="truncate">None</span>
            </DropdownMenuItem>
            <template v-if="defensePlaysForGhost.length === 0 && !ghostPlaysLoading">
              <DropdownMenuItem disabled class="text-muted-foreground text-[12px]">
                No defense plays in this playbook
              </DropdownMenuItem>
            </template>
            <template v-else-if="ghostPlaysLoading && defensePlaysForGhost.length === 0">
              <DropdownMenuItem disabled class="text-muted-foreground text-[12px]">
                Loading…
              </DropdownMenuItem>
            </template>
            <DropdownMenuItem
              v-for="play in defensePlaysForGhost"
              :key="play.id"
              class="text-[12px]"
              :class="ghostPlayId === play.id ? 'bg-accent' : ''"
              @click="setGhostFromPlay(play)"
            >
              <span class="truncate">{{ play.name }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div class="flex items-center bg-muted rounded-md p-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="px-2 py-0.5 text-[11px] font-medium rounded transition-colors"
                  :class="viewMode === 'fit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="viewMode = 'fit'"
                >
                  <Maximize2 class="w-2.5 h-2.5 inline-block mr-0.5" />
                  Fit
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Fill the canvas with the field (top to bottom)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="px-2 py-0.5 text-[11px] font-medium rounded transition-colors"
                  :class="viewMode === 'full' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="viewMode = 'full'"
                >
                  <Fullscreen class="w-2.5 h-2.5 inline-block mr-0.5" />
                  Full
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Center the field and show all of it</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TooltipProvider v-if="playId !== 'new'">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8"
                @click="shareDialogOpen = true"
              >
                <Share2 class="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Share play</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          size="sm"
          class="h-8 px-3"
          :disabled="(!cIsDirty && playId !== 'new') || loading"
          @click="handleSaveClick"
        >
          <Check class="w-3.5 h-3.5 mr-1" />
          {{ playId === 'new' ? 'Save Play' : 'Save Changes' }}
        </Button>
      </div>
    </div>

    <SavePlayDialog
      v-model:open="saveDialogOpen"
      :default-name="currentPlay?.name"
      :saving="isSaving"
      @save="onConfirmSave"
    />

    <SharePlayDialog
      v-model:open="shareDialogOpen"
      :play="currentPlay"
      :ghost-players="ghostPlayers"
    />

    <!-- Loading State: Only show on initial load (not on save) -->
    <div v-if="loading && !currentPlay" class="flex-1 flex items-center justify-center text-muted-foreground bg-background">
      Loading play...
    </div>

    <!-- Three-column body: spacing below header, rounded shadowed panels -->
    <div v-else-if="currentPlay" class="flex-1 flex overflow-hidden min-h-0 mt-3 gap-3">
      <!-- Left: Roster Panel (narrower at 1024px so center canvas fits) -->
      <div class="min-w-[200px] w-52 lg:w-60 shrink-0 rounded-xl shadow-md overflow-hidden bg-card">
        <CanvasRosterCard
          v-if="canvasReady"
          :players="cPlayers"
          :selected-player-id="cSelectedPlayerId"
          :all-roster="roster"
          :play-type="currentPlay.play_type"
          @select-player="onSelectPlayer"
          @remove-player="onRemovePlayer"
          @add-player="onAddPlayer"
          @add-placeholder-player="onAddPlaceholderPlayer"
        />
      </div>

      <!-- Center: Fit = canvas at bottom filling space; Full = centered so whole field is centered -->
      <div
        class="flex-1 min-w-0 flex flex-col items-center play-canvas-column"
        :class="viewMode === 'full' ? 'justify-center' : 'justify-end'"
      >
        <div
          class="w-full max-w-3xl xl:max-w-4xl min-w-0 play-canvas-wrapper"
          :class="viewMode === 'fit' ? 'play-canvas-wrapper-fit' : ''"
        >
          <div class="relative w-full h-full">
            <PlayCanvas
              ref="canvasRef"
              :initial-data="currentPlay.canvas_data"
              :play-type="currentPlay.play_type"
              :field-settings="fieldSettingsData"
              :starters="starters"
              :all-roster="roster"
              :starter-position-map="starterPositionMap"
              :view-mode="viewMode"
              :ghost-players="ghostPlayers"
              :show-player-names="fieldSettings?.show_player_names_on_canvas !== false"
              :default-player-label-on-canvas="fieldSettings?.default_player_label_on_canvas ?? 'position'"
              :suggested-route-preview="suggestedRoutePreview"
              :animated-positions="(playTest.isRunning.value || playTest.simulationState.value === 'play_over') ? playTest.animatedPositions.value : undefined"
              :animated-ball="(playTest.isRunning.value || playTest.simulationState.value === 'play_over') ? playTest.animatedBall.value : undefined"
              :simulation-mode="playTest.isRunning.value || playTest.simulationState.value === 'play_over'"
              @save="handleSaveData"
              @suggest-play-error="onSuggestPlayError"
              @exit-simulation="playTest.clearOverlay()"
              class="w-full h-full block"
            />
          </div>
        </div>
      </div>

      <!-- Right: Player Details (narrower at 1024px) -->
      <div class="w-64 xl:w-72 shrink-0 flex flex-col min-w-0">
        <div v-if="cSelectedPlayer" class="rounded-xl shadow-md overflow-hidden bg-card flex-1 min-h-0">
          <CanvasPlayerCard
            :selected-player="cSelectedPlayer"
            :all-roster="roster"
            :field-settings="fieldSettingsData"
            :play-type="currentPlay.play_type"
            :can-undo="cCanUndo"
            :can-redo="cCanRedo"
            @update-designation="onSetPlayerDesignation"
            @update-attribute="onUpdatePlayerAttribute"
            @clear-route="onClearRoute"
            @delete-segment="onDeleteSegment"
            @suggest-route-preview="suggestedRoutePreview = $event"
            @undo="onUndo"
            @redo="onRedo"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer, CanvasTool, Player, RouteSegment } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { Check, Maximize2, Fullscreen, ChevronDown, Play, RotateCcw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import PlayCanvas from '~/components/canvas/PlayCanvas.vue'
import CanvasToolbar from '~/components/canvas/CanvasToolbar.vue'
import CanvasRosterCard from '~/components/canvas/CanvasRosterCard.vue'
import CanvasPlayerCard from '~/components/canvas/CanvasPlayerCard.vue'
import SavePlayDialog from '~/components/play/SavePlayDialog.vue'
import { Swords, Shield, Share2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'canvas',
})

const route = useRoute()
const router = useRouter()
const playId = computed(() => route.params.id as string)

const { currentPlay, loading, fetchPlay, saveCanvasData, initDraftPlay, createPlay, updatePlay } = usePlays()
const { confirm } = useConfirm()
const { settings: fieldSettings, fetchSettings } = useFieldSettings()
const { players, fetchPlayers } = usePlayers()
const { profile, fetchProfile } = useProfile()
const { teams, fetchTeams } = useTeams()
const playTest = usePlayTest()

const viewMode = ref<'fit' | 'full'>('fit')

// Restore saved view mode when play loads; use default from settings for new plays
watch(
  () => [playId.value, currentPlay.value?.canvas_data?.view_mode, fieldSettings.value?.default_play_view] as const,
  ([id, saved, defaultView]) => {
    if (id === 'new') {
      viewMode.value = defaultView === 'full' ? 'full' : 'fit'
      return
    }
    if (saved === 'fit' || saved === 'full') viewMode.value = saved
  },
  { immediate: true }
)
const canvasRef = ref<InstanceType<typeof PlayCanvas> | null>(null)
const canvasReady = ref(false)

/** Suggested route preview (from Player Details Suggest) — drawn on canvas until Accept/Deny */
const suggestedRoutePreview = ref<{ playerId: string; route: { segments: RouteSegment[] } } | null>(null)

// Ghost defense overlay (offense only): show a defensive play as semi-transparent overlay
const ghostPlayers = ref<CanvasPlayer[]>([])
const ghostPlayId = ref<string | null>(null)
const ghostDropdownOpen = ref(false)
const defensePlaysForGhost = ref<Array<{ id: string; name: string; canvas_data: CanvasData }>>([])
const ghostPlaysLoading = ref(false)
const ghostLabel = computed(() =>
  ghostPlayers.value.length
    ? (defensePlaysForGhost.value.find((p) => p.id === ghostPlayId.value)?.name ?? 'Ghost defense')
    : 'Defense'
)

// Safe computed accessors — proxyRefs auto-unwraps exposed refs, so no .value needed
const cPlayers = computed(() => canvasRef.value?.canvasData?.players ?? [])
const cSelectedPlayerId = computed(() => canvasRef.value?.selectedPlayerId ?? null)
const cSelectedPlayer = computed(() => canvasRef.value?.selectedPlayer ?? null)
const cSelectedTool = computed<CanvasTool>(() => canvasRef.value?.selectedTool ?? 'select')

// Clear suggested route preview when selected player changes
watch(cSelectedPlayerId, () => {
  suggestedRoutePreview.value = null
})
const cIsDirty = computed(() => {
  const d = canvasRef.value?.isDirty
  return typeof d === 'object' && d != null && 'value' in d ? (d as { value: boolean }).value : (d === true)
})

const canSetPrimaryTarget = computed(() => {
  if (currentPlay.value?.play_type !== 'offense') return false
  const p = cSelectedPlayer.value
  if (!p) return false
  if (p.side !== 'offense') return false
  if ((p.position || '').toUpperCase() === 'QB' || (p.designation || '').toUpperCase() === 'Q') return false
  if (!p.route?.segments?.length) return false
  return true
})

/** Motion tool disabled on defense; or when C (cannot motion). QB can use Motion for rollout. */
const motionToolDisabled = computed(() => {
  if (currentPlay.value?.play_type === 'defense') return true
  const p = cSelectedPlayer.value
  if (!p) return false
  const pos = (p.position || '').toUpperCase()
  const des = (p.designation || '').toUpperCase()
  return pos === 'C' || des === 'C'
})

/** Read progression (1, 2, 3…) is offense only; also disable when no offense players have routes */
const anyOffensePlayerHasRoute = computed(() =>
  cPlayers.value.some((p) => p.side === 'offense' && (p.route?.segments?.length ?? 0) > 0)
)
const readOrderDisabled = computed(
  () => currentPlay.value?.play_type === 'defense' || !anyOffensePlayerHasRoute.value
)
const selectedPlayerIsPrimary = computed(() => !!cSelectedPlayer.value?.primaryTarget)

/** Defense only: show zone position button when a coverage player (non-rusher) is selected */
const showZonePositionButton = computed(() => {
  if (currentPlay.value?.play_type !== 'defense') return false
  const p = cSelectedPlayer.value
  if (!p) return false
  return p.designation !== 'R' && p.position !== 'RSH'
})
const zonePositionUnlocked = computed(() => !!cSelectedPlayer.value?.coverageZoneUnlocked)

function onToggleZonePosition() {
  const p = cSelectedPlayer.value
  if (!p) return
  canvasRef.value?.updatePlayerAttribute(p.id, {
    coverageZoneUnlocked: !p.coverageZoneUnlocked,
    ...(p.coverageZoneUnlocked ? { coverageZoneX: undefined, coverageZoneY: undefined } : {}),
  })
}
const cCanUndo = computed(() => {
  const c = canvasRef.value?.canUndo
  return typeof c === 'object' && c != null && 'value' in c ? (c as { value: boolean }).value : !!c
})
const cCanRedo = computed(() => {
  const c = canvasRef.value?.canRedo
  return typeof c === 'object' && c != null && 'value' in c ? (c as { value: boolean }).value : !!c
})

// Wrapper functions — safe to call even if ref not ready
function onSelectPlayer(id: string) { canvasRef.value?.selectPlayer(id) }
function onRemovePlayer(id: string) { canvasRef.value?.removePlayerFromField(id) }
function onAddPlayer(player: Player) { canvasRef.value?.addPlayerToField(player) }
function onAddPlaceholderPlayer() { canvasRef.value?.addPlaceholderWrToField() }
function onSetTool(tool: CanvasTool) { canvasRef.value?.setTool(tool) }
function onClearAllRoutes() {
  if (!canvasRef.value || !currentPlay.value) return
  canvasRef.value.resetFormation(
    currentPlay.value.play_type,
    starters.value,
    {
      los: fieldSettingsData.value.line_of_scrimmage,
      length: fieldSettingsData.value.field_length,
      endzone: fieldSettingsData.value.endzone_size,
      default_offense_starter_count: (fieldSettingsData.value as any).default_offense_starter_count ?? 5,
      default_defense_starter_count: (fieldSettingsData.value as any).default_defense_starter_count ?? 5,
    },
    starterPositionMap.value
  )
  nextTick(() => {
    canvasRef.value?.seedHistory()
    canvasRef.value?.requestRender()
  })
}
function onAiAction(action: string) { canvasRef.value?.handleAiAction(action) }
function onSetPrimaryTarget() {
  const id = cSelectedPlayerId.value
  if (id) canvasRef.value?.updatePlayerAttribute(id, { primaryTarget: true })
}
function onUndo() {
  canvasRef.value?.undo()
  nextTick(() => canvasRef.value?.requestRender())
}
function onRedo() {
  canvasRef.value?.redo()
  nextTick(() => canvasRef.value?.requestRender())
}
function onSuggestPlayError(_message: string) {
  // Error state is already reflected in the canvas/UI; optional: add toast here later.
}
function onSetPlayerDesignation(playerId: string, designation: string) { canvasRef.value?.setPlayerDesignation(playerId, designation) }
function onUpdatePlayerAttribute(playerId: string, attrs: Partial<CanvasPlayer>) { canvasRef.value?.updatePlayerAttribute(playerId, attrs) }
function onClearRoute(playerId: string) { canvasRef.value?.clearRoute(playerId) }
function onDeleteSegment(playerId: string, segmentIndex: number) { canvasRef.value?.deleteRouteSegment(playerId, segmentIndex) }

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
  const fs = fieldSettings.value
  return {
    field_length: fs.field_length,
    field_width: fs.field_width,
    endzone_size: fs.endzone_size,
    line_of_scrimmage: fs.line_of_scrimmage,
    first_down: fs.first_down ?? Math.floor(fs.field_length / 2),
    default_offense_starter_count: fs.default_offense_starter_count ?? 5,
    default_defense_starter_count: fs.default_defense_starter_count ?? 5,
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
  const payload: CanvasData = {
    ...data,
    ghost_defense_play_id: ghostPlayId.value ?? null,
    view_mode: viewMode.value,
  }
  if (playId.value === 'new') {
    currentPlay.value.canvas_data = payload
    canvasRef.value?.setDirty?.(false)
    return
  }
  await saveCanvasData(currentPlay.value.id, payload)
  canvasRef.value?.setDirty?.(false)
}

// ─── Draft Logic ───
const saveDialogOpen = ref(false)
const isSaving = ref(false)
const shareDialogOpen = ref(false)

function handleNameChange() {
  if (playId.value === 'new') return // Local update
  // Auto-save name change for existing plays? Or defer...
  // For now, let's treat name change as needing a save if we want auto-save
  // but "Save Changes" button handles it. We should probably update the DB immediately for name
  // to avoid desync, OR mark as dirty. Mark as dirty is harder since it's outside canvas.
  // Let's autosave name for existing plays for better UX:
  if (currentPlay.value && playId.value !== 'new') {
    updatePlay(currentPlay.value.id, { name: currentPlay.value.name })
  }
}

async function handleTypeChange(type: 'offense' | 'defense') {
  if (!currentPlay.value) return
  if (currentPlay.value.play_type === type) return

  if (cIsDirty.value) {
    const ok = await confirm({
      title: 'Switch play type?',
      description: 'If you switch, your current changes will be lost. Do you want to continue?',
      actionLabel: 'Switch',
      variant: 'default',
    })
    if (!ok) return
  }

  currentPlay.value.play_type = type

  // Ghost defense is offense-only; clear it when switching to defensive play
  if (type === 'defense') {
    ghostPlayers.value = []
    ghostPlayId.value = null
    // Offense-only tools: switch to select when going to defense
    const offenseOnlyTools: CanvasTool[] = ['straight', 'curve', 'option', 'motion', 'readorder', 'erase']
    if (canvasRef.value && offenseOnlyTools.includes(canvasRef.value.selectedTool)) {
      canvasRef.value.setTool('select')
    }
  }

  // Reset canvas for new type. Don't mark dirty here — only user edits set dirty,
  // so we won't show the switch-confirm modal when toggling offense ↔ defense with no edits.
  nextTick(() => {
    canvasRef.value?.selectPlayer(null)
    canvasRef.value?.resetFormation(type, starters.value, {
      los: fieldSettingsData.value.line_of_scrimmage,
      length: fieldSettingsData.value.field_length,
      endzone: fieldSettingsData.value.endzone_size,
      default_offense_starter_count: (fieldSettingsData.value as any).default_offense_starter_count ?? 5,
      default_defense_starter_count: (fieldSettingsData.value as any).default_defense_starter_count ?? 5,
    }, starterPositionMap.value)
  })

  if (playId.value !== 'new') {
    updatePlay(currentPlay.value.id, { play_type: type })
  }
}

function handleSaveClick() {
  if (playId.value === 'new') {
    saveDialogOpen.value = true
  } else {
    handleSave()
  }
}

async function onConfirmSave(data: { playbookId: string, name: string }) {
  if (!currentPlay.value) return
  
  isSaving.value = true
  try {
    // Ensure canvas data is up to date (include ghost defense selection)
    const canvasData: CanvasData = {
      ...(canvasRef.value?.getExportData() || currentPlay.value.canvas_data),
      ghost_defense_play_id: ghostPlayId.value ?? null,
      view_mode: viewMode.value,
    }

    // Create the play
    const newPlay = await createPlay(
      data.playbookId,
      data.name,
      currentPlay.value.play_type,
      currentPlay.value.formation,
      starters.value,
      fieldSettings.value
    )
    
    if (newPlay) {
      // Need to immediately update with the draft canvas data (routes, positions) 
      // because createPlay uses default formation
      await updatePlay(newPlay.id, { canvas_data: canvasData })
      
      saveDialogOpen.value = false
      router.replace(`/plays/${newPlay.id}`)
    }
  } catch (e) {
    console.error('Failed to save play:', e)
  } finally {
    isSaving.value = false
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

async function fetchDefensePlaysForGhost() {
  const client = useSupabaseDB()
  const user = useSupabaseUser()
  if (!user.value) return
  ghostPlaysLoading.value = true
  try {
    let query = client
      .from('plays')
      .select('id, name, canvas_data')
      .eq('user_id', user.value.id)
      .eq('play_type', 'defense')
      .order('updated_at', { ascending: false })
    if (currentPlay.value?.playbook_id) {
      query = query.eq('playbook_id', currentPlay.value.playbook_id)
    }
    const { data } = await query
    defensePlaysForGhost.value = (data ?? []) as Array<{ id: string; name: string; canvas_data: CanvasData }>
  } finally {
    ghostPlaysLoading.value = false
  }
}

function setGhostFromPlay(
  play: { id: string; name: string; canvas_data: CanvasData } | null
) {
  if (!play) {
    ghostPlayers.value = []
    ghostPlayId.value = null
    return
  }
  const players = play.canvas_data?.players ?? []
  ghostPlayers.value = JSON.parse(JSON.stringify(players))
  ghostPlayId.value = play.id
}

/** Restore ghost defense overlay from saved canvas_data.ghost_defense_play_id (on load) */
async function restoreGhostDefense() {
  const gid = currentPlay.value?.canvas_data?.ghost_defense_play_id
  if (!gid || currentPlay.value?.play_type !== 'offense') {
    ghostPlayers.value = []
    ghostPlayId.value = null
    return
  }
  await loadGhostPlayById(gid)
}

function runPlayTest() {
  if (!canvasRef.value || !currentPlay.value) return

  const canvasData = canvasRef.value.getExportData()
  const offensivePlayers = canvasData.players.filter(p => p.side === 'offense')

  // Pass ghost defense so they actively play zones/rush during test
  playTest.initialize(offensivePlayers, ghostPlayers.value, roster.value, fieldSettingsData.value)
  playTest.start()
}

async function loadGhostPlayById(gid: string) {
  if (!currentPlay.value || currentPlay.value.play_type !== 'offense') return
  const client = useSupabaseDB()
  const { data: play } = await client
    .from('plays')
    .select('id, name, canvas_data')
    .eq('id', gid)
    .single()
  if (play) {
    const typed = play as { id: string; name: string; canvas_data: CanvasData }
    ghostPlayId.value = typed.id
    ghostPlayers.value = JSON.parse(JSON.stringify(typed.canvas_data?.players ?? []))
    defensePlaysForGhost.value = [typed]
  } else {
    ghostPlayers.value = []
    ghostPlayId.value = null
  }
}

watch(ghostDropdownOpen, (open) => {
  if (open && currentPlay.value?.play_type === 'offense') {
    fetchDefensePlaysForGhost()
  }
})

// When navigating to /plays/new (e.g. after "New Play" in sidebar), re-init draft and canvas
watch(playId, async (id) => {
  if (id === 'new') {
    const defaultType = fieldSettings.value?.default_play_type ?? 'offense'
    initDraftPlay(defaultType, fieldSettings.value)
    ghostPlayers.value = []
    ghostPlayId.value = null
    playbookName.value = null
    await nextTick()
    if (canvasRef.value && currentPlay.value) {
      canvasRef.value.resetFormation(
        currentPlay.value.play_type,
        starters.value,
        {
          los: fieldSettingsData.value.line_of_scrimmage,
          length: fieldSettingsData.value.field_length,
          endzone: fieldSettingsData.value.endzone_size,
          default_offense_starter_count: (fieldSettingsData.value as any).default_offense_starter_count ?? 5,
          default_defense_starter_count: (fieldSettingsData.value as any).default_defense_starter_count ?? 5,
        },
        starterPositionMap.value
      )
      nextTick(() => canvasRef.value?.seedHistory())
    }
  }
})

onMounted(async () => {
  // Load settings first so defaults are available for new plays
  await fetchSettings()
  const defaultType = fieldSettings.value?.default_play_type ?? 'offense'

  if (playId.value === 'new') {
    initDraftPlay(defaultType, fieldSettings.value)
  } else {
    await fetchPlay(playId.value)
  }

  await Promise.all([
    fetchPlayers(),
    fetchProfile(),
    fetchTeams()
  ])
  
  if (currentPlay.value?.playbook_id) {
    fetchPlaybookName(currentPlay.value.playbook_id)
  }

  await nextTick()
  canvasReady.value = true

  if (playId.value !== 'new' && currentPlay.value?.play_type === 'offense') {
    await restoreGhostDefense()
  }

  // New play: apply default ghost defense if setting is on (offense only)
  if (playId.value === 'new' && currentPlay.value?.play_type === 'offense' && fieldSettings.value?.show_ghost_defense_by_default && fieldSettings.value.default_ghost_defense_play_id) {
    await loadGhostPlayById(fieldSettings.value.default_ghost_defense_play_id)
  }

  if (playId.value === 'new' && currentPlay.value) {
    await nextTick()
    canvasRef.value?.resetFormation(
      currentPlay.value.play_type,
      starters.value,
      {
        los: fieldSettingsData.value.line_of_scrimmage,
        length: fieldSettingsData.value.field_length,
        endzone: fieldSettingsData.value.endzone_size,
        default_offense_starter_count: (fieldSettingsData.value as any).default_offense_starter_count ?? 5,
        default_defense_starter_count: (fieldSettingsData.value as any).default_defense_starter_count ?? 5,
      },
      starterPositionMap.value
    )
    await nextTick()
    canvasRef.value?.seedHistory()
  }
})
</script>

<style scoped>
.play-canvas-wrapper {
  height: 82%;
  min-height: 55vh;
  max-height: 100%;
}
/* Fit mode: use full column height so the field fills the entire middle area */
.play-canvas-wrapper-fit {
  height: 100%;
  min-height: 0;
}
.play-canvas-wrapper :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
