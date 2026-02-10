<template>
  <div class="relative w-full h-full overflow-hidden bg-[#1a1e2e]">
    <!-- Canvas Background -->
    <div class="absolute inset-0 z-0">
      <canvas
        ref="canvasRef"
        class="w-full h-full"
        :class="canvasCursor"
        @dragover.prevent
        @drop="handleDrop"
      />
    </div>

    <!-- Draggable Player Details Card -->
    <div 
      v-if="selectedPlayer"
      class="absolute z-10"
      :style="{ left: `${playerCardPos.x}px`, top: `${playerCardPos.y}px` }"
    >
      <CanvasPlayerCard
        :selected-player="selectedPlayer"
        :all-roster="allRoster"
        :field-settings="fieldSettings"
        :play-type="playType"
        @update-designation="setPlayerDesignation"
        @clear-route="clearRoute"
        @start-drag="dragPlayerCard"
      />
    </div>

    <!-- Draggable Roster Card -->
    <div 
      class="absolute z-10"
      :style="{ left: `${rosterCardPos.x}px`, top: `${rosterCardPos.y}px` }"
    >
      <CanvasRosterCard
        :players="canvasData.players"
        :selected-player-id="selectedPlayerId"
        :all-roster="allRoster"
        :play-type="playType"
        @select-player="selectPlayer"
        @remove-player="removePlayerFromField"
        @add-player="addPlayerToField"
        @start-drag="dragRosterCard"
      />
    </div>

    <!-- Draggable Bottom Toolbar -->
    <div 
      class="absolute z-20"
      :style="{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }"
    >
      <!-- Drag Handle for Toolbar -->
      <div 
        class="absolute -top-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-background/80 backdrop-blur-md border border-border/50 rounded-full cursor-move hover:bg-muted flex items-center justify-center shadow-lg transition-all group z-30"
        @mousedown="dragToolbar"
      >
        <div class="w-8 h-1 bg-muted-foreground/30 rounded-full group-hover:bg-muted-foreground/50 transition-colors" />
      </div>
      <CanvasToolbar
        :selected-tool="selectedTool"
        :is-dirty="isDirty"
        @select-tool="setTool"
        @clear-routes="clearAllRoutes"
        @save="handleSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, Player } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'

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
}>()

const emit = defineEmits<{
  save: [data: CanvasData]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Draggable State
import { useDraggableElement } from '~/composables/useDraggableElement'
import CanvasPlayerCard from './CanvasPlayerCard.vue'
import CanvasRosterCard from './CanvasRosterCard.vue'

const { position: playerCardPos, startDrag: dragPlayerCard } = useDraggableElement({ x: 0, y: 0 })
const { position: rosterCardPos, startDrag: dragRosterCard } = useDraggableElement({ x: 0, y: 0 })
const { position: toolbarPos, startDrag: dragToolbar } = useDraggableElement({ x: 0, y: 0 })

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    setupListeners()

    // Set initial positions relative to the canvas container
    if (canvasRef.value && canvasRef.value.parentElement) {
      const parent = canvasRef.value.parentElement
      const width = parent.clientWidth
      const height = parent.clientHeight

      // Right-aligned Player Card
      // Approx 320px width + padding
      playerCardPos.value = { 
        x: width - 350, 
        y: 80 
      }
      
      // Left-aligned Roster Card
      // Positioned below the header
      rosterCardPos.value = { 
        x: 20, 
        y: 80 
      }
      
      // Center toolbar
      toolbarPos.value = { 
        x: (width / 2) - 300, 
        y: height - 100 
      }
    }

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    if (canvasRef.value?.parentElement) {
      resizeObserver.observe(canvasRef.value.parentElement)
    }


    // NEW: If new play (no initialData), enforce formation with current field settings
    if (!props.initialData) {
      resetFormation(props.playType, props.starters, {
        los: fieldSettings.value.line_of_scrimmage,
        length: fieldSettings.value.field_length,
        endzone: fieldSettings.value.endzone_size,
      })
    }

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    if (canvasRef.value?.parentElement) {
      resizeObserver.observe(canvasRef.value.parentElement)
    }
  })
})

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
} = useCanvas()

const { render } = useCanvasRenderer()

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
  })
}

const { setupListeners, removeListeners } = useCanvasInteraction(canvasRef, {
  canvasData,
  selectedTool,
  selectedPlayerId,
  activeSegmentIndex,
  zoom,
  panOffset,
  fieldSettings,
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

function addPlayerToField(player: Player) {
  if (canvasData.value.players.length >= 5) return
  const posField = props.playType === 'offense' ? 'offense_positions' : 'defense_positions'
  const position = (player[posField] as string[])?.[0] ?? 'WR'
  
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

watch([canvasData, zoom, panOffset, selectedPlayerId], () => {
  requestRender()
}, { deep: true })

watch(() => props.initialData, (data) => {
  if (data) {
    loadCanvasData(data)
  }
}, { immediate: true })

let resizeObserver: ResizeObserver | null = null



onUnmounted(() => {
  removeListeners()
  resizeObserver?.disconnect()
})
</script>
