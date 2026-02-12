<template>
  <div class="relative w-full h-full overflow-hidden bg-background">
    <canvas
      ref="canvasRef"
      class="w-full h-full"
      :class="canvasCursor"
      @dragover.prevent
      @drop="handleDrop"
    />
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, Player } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { useRouteAnalysis } from '~/composables/useRouteAnalysis'

const props = defineProps<{
  initialData?: CanvasData
  playType: 'offense' | 'defense'
  fieldSettings?: {
    field_length: number
    field_width: number
    endzone_size: number
    line_of_scrimmage: number
  }
  starters?: Player[]
  allRoster?: Player[]
  starterPositionMap?: Record<string, string>
  viewMode?: 'fit' | 'full'
}>()

const emit = defineEmits<{
  save: [data: CanvasData]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

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
} = useCanvas()

const { render } = useCanvasRenderer()
const { generateRandomRoute } = useRouteAnalysis()

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

function requestRender() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  render(ctx, canvasRef.value, canvasData.value, {
    fieldLength: fieldSettings.value.field_length,
    fieldWidth: fieldSettings.value.field_width,
    endzoneSize: fieldSettings.value.endzone_size,
    lineOfScrimmage: fieldSettings.value.line_of_scrimmage,
    zoom: zoom.value,
    panOffset: panOffset.value,
    selectedPlayerId: selectedPlayerId.value,
    viewMode: props.viewMode ?? 'fit',
  })
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
  onSelectPlayer: selectPlayer,
  onMovePlayer: updatePlayerPosition,
  onStartSegment: startRouteSegment,
  onAddPoint: addPointToSegment,
  onFinalizeSegment: finalizeSegment,
  onAddMotionPoint: addMotionPoint,
  onAssignReadOrder: assignReadOrder,
  onClearRoute: clearRoute,
  onRequestRender: requestRender,
})

function handleSave() {
  emit('save', getExportData())
  isDirty.value = false
}

function handleAiAction(action: string) {
  if (action === 'random-play') {
    canvasData.value.players.forEach(p => {
      const route = generateRandomRoute(p, fieldSettings.value)
      if (route) {
        p.route = route
      }
    })
    isDirty.value = true
    requestRender()
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

watch([canvasData, zoom, panOffset, selectedPlayerId, () => props.viewMode], () => {
  requestRender()
}, { deep: true })

watch(() => props.initialData, (data) => {
  if (data) {
    loadCanvasData(data)
  }
}, { immediate: true })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    setupListeners()

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
    }
  })
})

onUnmounted(() => {
  removeListeners()
  resizeObserver?.disconnect()
})

// Expose state and methods for parent page to wire to side panels
defineExpose({
  canvasData,
  selectedPlayer,
  selectedPlayerId,
  selectedTool,
  isDirty,
  zoom,
  panOffset,
  selectPlayer,
  setTool,
  clearRoute,
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
})
</script>
