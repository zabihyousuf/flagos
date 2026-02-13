<template>
  <div class="h-full w-full flex flex-col overflow-hidden py-4">
    <!-- Header Bar: 3-zone layout so toolbar stays visually centered -->
    <div class="h-12 bg-card flex items-center px-4 shrink-0 gap-4 rounded-lg shadow-md">
      <!-- Left: Breadcrumbs + title + play type -->
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <button
          class="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1 shrink-0"
          @click="goBack"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span class="truncate max-w-[120px]">{{ playbookName ?? 'Playbooks' }}</span>
        </button>
        <ChevronRight class="w-3 h-3 text-muted-foreground/50 shrink-0" />
        
        <!-- Editable Play Name (narrower so play type fits) -->
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
          <span class="text-[14px] font-semibold text-muted-foreground uppercase tracking-wider">Play type</span>
          <div class="flex items-center bg-muted rounded-full p-0.5">
            <button
              class="px-2 py-0.5 text-[14px] font-medium rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              :class="currentPlay.play_type === 'offense'
                ? 'bg-primary/15 text-primary shadow-sm border border-primary/30'
                : 'text-primary/70 hover:bg-primary/10 hover:text-primary'"
              :disabled="playId !== 'new'"
              @click="handleTypeChange('offense')"
            >
              <Swords class="w-3 h-3" />
              <span>Offensive</span>
            </button>
            <button
              class="px-2 py-0.5 text-[14px] font-medium rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              :class="currentPlay.play_type === 'defense'
                ? 'bg-destructive/15 text-destructive shadow-sm border border-destructive/30'
                : 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'"
              :disabled="playId !== 'new'"
              @click="handleTypeChange('defense')"
            >
              <Shield class="w-3 h-3" />
              <span>Defensive</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Center: Toolbar -->
      <div class="flex-1 flex justify-center min-w-0">
        <CanvasToolbar
          v-if="canvasReady"
          :selected-tool="cSelectedTool"
          @select-tool="onSetTool"
          @clear-routes="onClearAllRoutes"
          @ai-action="onAiAction"
        />
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
                    <span class="text-[13px] font-medium">{{ ghostLabel }}</span>
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
              class="text-[14px]"
              :class="!ghostPlayers.length ? 'bg-accent' : ''"
              @click="setGhostFromPlay(null)"
            >
              <span class="truncate">None</span>
            </DropdownMenuItem>
            <template v-if="defensePlaysForGhost.length === 0 && !ghostPlaysLoading">
              <DropdownMenuItem disabled class="text-muted-foreground text-[13px]">
                No defense plays in this playbook
              </DropdownMenuItem>
            </template>
            <template v-else-if="ghostPlaysLoading">
              <DropdownMenuItem disabled class="text-muted-foreground text-[13px]">
                Loading…
              </DropdownMenuItem>
            </template>
            <DropdownMenuItem
              v-for="play in defensePlaysForGhost"
              :key="play.id"
              class="text-[14px]"
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
                  class="px-2.5 py-1 text-[13px] font-medium rounded transition-colors"
                  :class="viewMode === 'fit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="viewMode = 'fit'"
                >
                  <Maximize2 class="w-3 h-3 inline-block mr-1" />
                  Fit
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Zoom to the line of scrimmage</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  class="px-2.5 py-1 text-[13px] font-medium rounded transition-colors"
                  :class="viewMode === 'full' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="viewMode = 'full'"
                >
                  <Fullscreen class="w-3 h-3 inline-block mr-1" />
                  Full
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Show the full field</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

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

    <!-- Loading State: Only show on initial load (not on save) -->
    <div v-if="loading && !currentPlay" class="flex-1 flex items-center justify-center text-muted-foreground bg-background">
      Loading play...
    </div>

    <!-- Three-column body: spacing below header, rounded shadowed panels -->
    <div v-else-if="currentPlay" class="flex-1 flex overflow-hidden min-h-0 mt-3 gap-3">
      <!-- Left: Roster Panel -->
      <div class="w-60 shrink-0 rounded-xl shadow-md overflow-hidden bg-card">
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

      <!-- Center: Canvas (same space always; right column reserves width so this doesn't shift) -->
      <div class="flex-1 min-w-0 flex justify-center items-center">
        <div class="w-full h-full max-w-4xl max-h-full min-w-0">
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
            @save="handleSaveData"
            class="w-full h-full block"
          />
        </div>
      </div>

      <!-- Right: Player Details (always reserve width so canvas stays fixed when panel opens/closes) -->
      <div class="w-72 shrink-0 flex flex-col min-w-0">
        <div v-if="cSelectedPlayer" class="rounded-xl shadow-md overflow-hidden bg-card flex-1 min-h-0">
          <CanvasPlayerCard
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
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer, CanvasTool, Player } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { ArrowLeft, ChevronRight, Check, Maximize2, Fullscreen, ChevronDown } from 'lucide-vue-next'
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
import { Swords, Shield } from 'lucide-vue-next'

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

const viewMode = ref<'fit' | 'full'>('fit')

// Restore saved view mode when play loads
watch(
  () => [playId.value, currentPlay.value?.canvas_data?.view_mode] as const,
  ([id, saved]) => {
    if (id === 'new') {
      viewMode.value = 'fit'
      return
    }
    if (saved === 'fit' || saved === 'full') viewMode.value = saved
  },
  { immediate: true }
)
const canvasRef = ref<InstanceType<typeof PlayCanvas> | null>(null)
const canvasReady = ref(false)

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
  const fs = fieldSettings.value
  return {
    field_length: fs.field_length,
    field_width: fs.field_width,
    endzone_size: fs.endzone_size,
    line_of_scrimmage: fs.line_of_scrimmage,
    first_down: fs.first_down ?? Math.floor(fs.field_length / 2),
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
    if (canvasRef.value) canvasRef.value.isDirty = false
    return
  }
  await saveCanvasData(currentPlay.value.id, payload)
  if (canvasRef.value) {
    canvasRef.value.isDirty = false
  }
}

// ─── Draft Logic ───
const saveDialogOpen = ref(false)
const isSaving = ref(false)

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
  }

  // Reset canvas for new type
  nextTick(() => {
    canvasRef.value?.resetFormation(type, starters.value, {
      los: fieldSettingsData.value.line_of_scrimmage,
      length: fieldSettingsData.value.field_length,
      endzone: fieldSettingsData.value.endzone_size,
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
      starters.value
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
    initDraftPlay()
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
        },
        starterPositionMap.value
      )
      nextTick(() => canvasRef.value?.seedHistory())
    }
  }
})

onMounted(async () => {
  if (playId.value === 'new') {
    initDraftPlay()
  } else {
    // Load existing play
    await fetchPlay(playId.value)
  }

  // Execute fetches concurrently
  await Promise.all([
    fetchSettings(),
    fetchPlayers(),
    fetchProfile(),
    fetchTeams()
  ])
  
  if (currentPlay.value?.playbook_id) {
    fetchPlaybookName(currentPlay.value.playbook_id)
  }

  // Wait for PlayCanvas to mount and expose its API
  await nextTick()
  canvasReady.value = true

  if (playId.value !== 'new' && currentPlay.value?.play_type === 'offense') {
    await restoreGhostDefense()
  }

  // If draft, ensure formation is reset/loaded WITH correct starters
  if (playId.value === 'new' && currentPlay.value) {
    // Since we awaited Promise.all above, `starters` (computed) should now have data
    await nextTick()
    canvasRef.value?.resetFormation(
      currentPlay.value.play_type,
      starters.value,
      {
        los: fieldSettingsData.value.line_of_scrimmage,
        length: fieldSettingsData.value.field_length,
        endzone: fieldSettingsData.value.endzone_size,
      },
      starterPositionMap.value
    )
    // Seed undo history with starters formation so undo doesn't go back to default formation
    await nextTick()
    canvasRef.value?.seedHistory()
  }
})
</script>
