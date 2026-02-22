<template>
  <div ref="wrapperRef" class="relative w-full h-full overflow-hidden bg-background">
    <canvas
      ref="canvasRef"
      class="w-full h-full"
      :class="canvasCursor"
      @dragover.prevent
      @drop="handleDrop"
    />
    <!-- Delete route chip when user clicked on a route (hide in simulation mode and if that player no longer has a route) -->
    <div
      v-if="routeDeleteChip && chipPlayerHasRoute && !props.simulationMode"
      class="absolute z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-destructive text-destructive-foreground text-xs font-medium shadow-lg border border-destructive/80"
      :style="routeDeleteChipStyle"
    >
      <Trash2 class="w-3 h-3" />
      <button type="button" class="hover:underline" @click="confirmDeleteRoute">Delete route</button>
    </div>
    <!-- Suggest Play loading overlay -->
    <div
      v-if="suggestPlayLoading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-background/80 rounded-lg"
    >
      <div class="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <span>Suggesting play…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer, Player } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import type { ViewTransform } from '~/composables/useCanvasRenderer'
import { computeFitContentBounds, useCanvasRenderer } from '~/composables/useCanvasRenderer'
import { useRouteAnalysis } from '~/composables/useRouteAnalysis'
import { useTheme } from '~/composables/useTheme'
import { Trash2 } from 'lucide-vue-next'

const theme = useTheme()

const props = defineProps<{
  initialData?: CanvasData
  playType: 'offense' | 'defense'
  fieldSettings?: {
    field_length: number
    field_width: number
    endzone_size: number
    line_of_scrimmage: number
    first_down?: number
  }
  starters?: Player[]
  allRoster?: Player[]
  starterPositionMap?: Record<string, string>
  viewMode?: 'fit' | 'full'
  /** Overlay defense from another play (ghost style) */
  ghostPlayers?: CanvasPlayer[]
  /** When false, hide player names on the field (default true) */
  showPlayerNames?: boolean
  /** Default for marker label when player has no showLabel set (from settings: number / position / both / none) */
  defaultPlayerLabelOnCanvas?: 'number' | 'position' | 'both' | 'none'
  /** Suggested route preview for one player (from Player Details Suggest) — drawn on canvas until Accept/Deny */
  suggestedRoutePreview?: { playerId: string; route: { segments: { type: string; points: { x: number; y: number }[] }[] } } | null
  /** Animated positions from simulation (overrides player x/y in renderer) */
  animatedPositions?: Map<string, { x: number; y: number }>
  /** Animated ball from simulation */
  animatedBall?: { x: number; y: number; visible: boolean; inFlight: boolean }
  /** When true: no selection ring, no interaction, no route-delete chip */
  simulationMode?: boolean
}>()

const emit = defineEmits<{
  save: [data: CanvasData]
  'suggest-play-error': [message: string]
  /** Emitted when user starts editing (e.g. drag) while simulation overlay is shown — parent should reset sim */
  'exit-simulation': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

const routeDeleteChip = ref<{ playerId: string; clientX: number; clientY: number } | null>(null)

const routeDeleteChipStyle = computed(() => {
  if (!routeDeleteChip.value || !wrapperRef.value) return {}
  const rect = wrapperRef.value.getBoundingClientRect()
  return {
    left: `${routeDeleteChip.value.clientX - rect.left + 8}px`,
    top: `${routeDeleteChip.value.clientY - rect.top}px`,
  }
})

function onSelectRoute(playerId: string, clientX: number, clientY: number) {
  const player = canvasData.value.players.find((p) => p.id === playerId)
  const isRusher = player?.side === 'defense' && (player?.designation === 'R' || player?.position === 'RSH')
  if (isRusher) return // Rusher's path to QB cannot be deleted
  routeDeleteChip.value = { playerId, clientX, clientY }
}

function onDeselectRoute() {
  routeDeleteChip.value = null
}

function confirmDeleteRoute() {
  if (routeDeleteChip.value) {
    clearRoute(routeDeleteChip.value.playerId)
    routeDeleteChip.value = null
    requestRender()
  }
}

const {
  canvasData,
  selectedTool,
  selectedPlayerId,
  selectedPlayer,
  zoom,
  panOffset,
  isDirty,
  activeSegmentIndex,
  loadCanvasData,
  setTool,
  selectPlayer,
  updatePlayerPosition,
  startRouteSegment,
  addPointToSegment,
  finalizeSegment,
  clearRoute,
  deleteRouteSegment,
  clearAllRoutes,
  assignReadOrder,
  addMotionPoint,
  setPlayerDesignation,
  resetFormation,
  setZoom,
  getExportData,
  addPlayerToCanvasData,
  removePlayerFromCanvasData,
  updatePlayerAttribute,
  updateCoverageZonePosition,
  pushHistory,
  pushHistoryBeforeDrag,
  pushHistoryAfterDrag,
  undo,
  redo,
  seedHistory,
  canUndo,
  canRedo,
} = useCanvas()

const chipPlayerHasRoute = computed(() => {
  if (!routeDeleteChip.value) return false
  const player = canvasData.value.players.find((p) => p.id === routeDeleteChip.value!.playerId)
  return (player?.route?.segments?.length ?? 0) > 0
})

const { render } = useCanvasRenderer()

const contentBoundsRef = computed(() => {
  if (props.viewMode !== 'fit') return undefined
  if (!props.ghostPlayers?.length && props.playType !== 'defense') return undefined
  const fs = fieldSettings.value
  const totalLength = fs.field_length + fs.endzone_size * 2
  return computeFitContentBounds(canvasData.value.players, props.ghostPlayers ?? [], totalLength, {
    endzoneSize: fs.endzone_size,
    fieldLength: fs.field_length,
    lineOfScrimmage: fs.line_of_scrimmage,
    playType: props.playType,
  })
})
const { buildRouteForType } = useRouteAnalysis()
const { suggestPlay } = useSuggestPlay()

const suggestPlayLoading = ref(false)
const suggestPlayError = ref<string | null>(null)

const fieldSettings = computed(() => props.fieldSettings ?? DEFAULT_FIELD_SETTINGS)
const allRoster = computed(() => props.allRoster ?? props.starters ?? [])

const canvasCursor = computed(() => {
  const tool = selectedTool.value
  if (tool === 'straight' || tool === 'curve' || tool === 'option') return 'cursor-crosshair'
  if (tool === 'select') return 'cursor-pointer'
  if (tool === 'erase') return 'cursor-cell'
  if (tool === 'motion') return 'cursor-crosshair'
  if (tool === 'readorder') return 'cursor-pointer'
  return 'cursor-default'
})

function onSelectPlayerForMove(playerId: string) {
  setTool('select')
  selectPlayer(playerId)
}

const lastViewTransform = ref<ViewTransform | null>(null)
const selectionAnimationId = ref<number | null>(null)

function requestRender() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const view = render(ctx, canvasRef.value, canvasData.value, {
    fieldLength: fieldSettings.value.field_length,
    fieldWidth: fieldSettings.value.field_width,
    endzoneSize: fieldSettings.value.endzone_size,
    lineOfScrimmage: fieldSettings.value.line_of_scrimmage,
    firstDownYardLine: fieldSettings.value.first_down ?? Math.floor(fieldSettings.value.field_length / 2),
    zoom: zoom.value,
    panOffset: panOffset.value,
    selectedPlayerId: selectedPlayerId.value,
    viewMode: props.viewMode ?? 'fit',
    playType: props.playType,
    ghostPlayers: props.ghostPlayers,
    showPlayerNames: props.showPlayerNames !== false,
    defaultPlayerLabelOnCanvas: props.defaultPlayerLabelOnCanvas ?? 'position',
    suggestedRoutePreview: props.suggestedRoutePreview ?? null,
    animatedPositions: props.animatedPositions,
    animatedBall: props.animatedBall,
    simulationMode: props.simulationMode,
    darkMode: theme.resolvedDark.value,
  })
  lastViewTransform.value = view ?? null
}

const viewModeRef = computed(() => props.viewMode ?? 'fit')

const { setupListeners, removeListeners } = useCanvasInteraction(canvasRef, {
  canvasData,
  selectedTool,
  selectedPlayerId,
  activeSegmentIndex,
  zoom,
  panOffset,
  fieldSettings,
  viewMode: viewModeRef,
  contentBounds: contentBoundsRef,
  lastViewTransform,
  onSelectPlayer: selectPlayer,
  onMovePlayer: updatePlayerPosition,
  onStartSegment: startRouteSegment,
  onAddPoint: addPointToSegment,
  onFinalizeSegment: finalizeSegment,
  onAddMotionPoint: addMotionPoint,
  onAssignReadOrder: assignReadOrder,
  onClearRoute: clearRoute,
  onRequestRender: requestRender,
  onSelectPlayerForMove: onSelectPlayerForMove,
  onDragStart: (playerId?: string) => {
    if (props.simulationMode) emit('exit-simulation')
    pushHistoryBeforeDrag(playerId)
  },
  onDragEnd: pushHistoryAfterDrag,
  onSelectRoute: onSelectRoute,
  onDeselectRoute: onDeselectRoute,
  onMoveCoverageZone: updateCoverageZonePosition,
})

function handleSave() {
  emit('save', getExportData())
  isDirty.value = false
}

async function handleAiAction(action: string) {
  if (action !== 'suggest-play' || props.playType !== 'offense') return

  pushHistory()
  suggestPlayLoading.value = true
  suggestPlayError.value = null
  const fs = {
    field_length: fieldSettings.value.field_length,
    field_width: fieldSettings.value.field_width,
    endzone_size: fieldSettings.value.endzone_size,
    line_of_scrimmage: fieldSettings.value.line_of_scrimmage,
  }
  const roster = allRoster.value
  const players = canvasData.value.players

  try {
    const result = await suggestPlay(players, roster, fs)
    if (!result) {
      suggestPlayError.value = 'Could not parse play from API'
      return
    }
    const offensePlayers = players
      .filter((p) => p.side === 'offense' && (p.designation || '').toUpperCase() !== 'Q' && (p.position || '').toUpperCase() !== 'QB')
      .sort((a, b) => {
        const aIsC = (a.position || a.designation || '').toUpperCase() === 'C'
        const bIsC = (b.position || b.designation || '').toUpperCase() === 'C'
        if (aIsC && !bIsC) return -1
        if (!aIsC && bIsC) return 1
        return a.x - b.x
      })
    const allowedRouteTypes = ['fly', 'post', 'corner', 'in', 'out', 'curl', 'slant', 'center', 'center_seam', 'option_out_in'] as const
    for (let i = 0; i < offensePlayers.length && i < result.routes.length; i++) {
      const p = offensePlayers[i]
      const r = result.routes[i]
      let routeType = (r?.routeType || '').toLowerCase().trim()
      if (!allowedRouteTypes.includes(routeType as any)) routeType = 'slant'
      const built = buildRouteForType(p, fs, routeType as any)
      if (built) p.route = built
    }
    offensePlayers.forEach((p, index) => {
      p.primaryTarget = index === 0
      const segs = p.route?.segments
      if (segs?.length) {
        const last = segs[segs.length - 1]
        if (last) last.readOrder = index + 1
      }
    })
    const qbMotion = (result.qbMotion || 'none').toLowerCase()
    if (qbMotion && qbMotion !== 'none') {
      const qb = players.find((p) => p.side === 'offense' && ((p.position || '').toUpperCase() === 'QB' || (p.designation || '').toUpperCase() === 'Q'))
      if (qb) {
        const dx = qbMotion.includes('right') ? 0.06 : qbMotion.includes('left') ? -0.06 : 0
        if (dx !== 0) {
          // QB rollout: left or right only, never past the LOS (keep same y as QB)
          const pts = [
            { x: qb.x + dx, y: qb.y },
            { x: qb.x + dx * 2, y: qb.y },
          ]
          qb.motionPath = [...pts]
          if (!qb.route) qb.route = { segments: [] }
          const rollSeg = qb.route.segments.find((s) => s.type === 'rollout')
          if (rollSeg) rollSeg.points = [...pts]
          else qb.route.segments.unshift({ type: 'rollout', points: [...pts] })
        }
      }
    } else {
      const qb = players.find((p) => p.side === 'offense' && ((p.position || '').toUpperCase() === 'QB' || (p.designation || '').toUpperCase() === 'Q'))
      if (qb) {
        qb.motionPath = null
        if (qb.route?.segments) {
          const idx = qb.route.segments.findIndex((s) => s.type === 'rollout')
          if (idx >= 0) {
            qb.route.segments.splice(idx, 1)
            if (qb.route.segments.length === 0) qb.route = null
          }
        }
      }
    }
    isDirty.value = true
    requestRender()
  } catch (e: any) {
    const msg = e?.message || 'Suggest Play failed'
    suggestPlayError.value = msg
    emit('suggest-play-error', msg)
  } finally {
    suggestPlayLoading.value = false
  }
}

function addPlayerToField(player: Player) {
  if (canvasData.value.players.length >= 5) return
  // Use team-assigned position if available, otherwise fall back to player's first listed position
  const assigned = props.starterPositionMap?.[player.id]
  const posField = props.playType === 'offense' ? 'offense_positions' : 'defense_positions'
  const position = assigned ?? (player[posField] as string[])?.[0] ?? 'WR'

  addPlayerToCanvasData(player, position, props.playType, {
    los: fieldSettings.value.line_of_scrimmage,
    length: fieldSettings.value.field_length,
    endzone: fieldSettings.value.endzone_size,
  })
  requestRender()
}

function removePlayerFromField(playerId: string) {
  removePlayerFromCanvasData(playerId)
  requestRender()
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const playerId = e.dataTransfer?.getData('text/player-id')
  if (!playerId) return
  const player = allRoster.value.find((p) => p.id === playerId)
  if (!player) return
  if (canvasData.value.players.length >= 5) return
  addPlayerToField(player)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = parent.clientWidth * dpr
  canvas.height = parent.clientHeight * dpr
  canvas.style.width = `${parent.clientWidth}px`
  canvas.style.height = `${parent.clientHeight}px`

  requestRender()
}

watch([canvasData, zoom, panOffset, selectedPlayerId, () => props.viewMode, () => props.ghostPlayers, () => props.showPlayerNames, () => props.suggestedRoutePreview, () => props.simulationMode, () => theme.resolvedDark.value], () => {
  requestRender()
}, { deep: true })

// Re-render when simulation animated positions or ball change (driven at 60fps by simulation engine)
watch([() => props.animatedPositions, () => props.animatedBall], () => {
  requestRender()
})

// Animation loop while a player is selected (for spinning dotted ring)
watch(selectedPlayerId, (id) => {
  if (selectionAnimationId.value != null) {
    cancelAnimationFrame(selectionAnimationId.value)
    selectionAnimationId.value = null
  }
  if (!id) return
  function tick() {
    requestRender()
    selectionAnimationId.value = requestAnimationFrame(tick)
  }
  selectionAnimationId.value = requestAnimationFrame(tick)
}, { immediate: true })


watch(() => props.initialData, (data) => {
  if (data) {
    loadCanvasData(data)
    nextTick(() => seedHistory())
  }
}, { immediate: true })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    if (!props.simulationMode) setupListeners()

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    if (canvasRef.value?.parentElement) {
      resizeObserver.observe(canvasRef.value.parentElement)
    }

    // If new play (no initialData), enforce formation with current field settings
    if (!props.initialData) {
      resetFormation(props.playType, props.starters, {
        los: fieldSettings.value.line_of_scrimmage,
        length: fieldSettings.value.field_length,
        endzone: fieldSettings.value.endzone_size,
      }, props.starterPositionMap)
      nextTick(() => seedHistory())
    }
  })
})

onUnmounted(() => {
  if (selectionAnimationId.value != null) {
    cancelAnimationFrame(selectionAnimationId.value)
  }
  removeListeners()
  resizeObserver?.disconnect()
})

function setDirty(value: boolean) {
  isDirty.value = value
}

// Expose state and methods for parent page to wire to side panels
defineExpose({
  canvasData,
  selectedPlayer,
  selectedPlayerId,
  selectedTool,
  isDirty,
  setDirty,
  zoom,
  panOffset,
  selectPlayer,
  setTool,
  clearRoute,
  deleteRouteSegment,
  clearAllRoutes,
  setPlayerDesignation,
  updatePlayerAttribute,
  addPlayerToField,
  removePlayerFromField,
  getExportData,
  resetFormation,
  requestRender,
  handleSave,
  handleAiAction,
  fieldSettings,
  allRoster,
  undo,
  redo,
  canUndo,
  canRedo,
  seedHistory,
})
</script>
