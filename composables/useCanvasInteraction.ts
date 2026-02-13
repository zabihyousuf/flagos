import type { CanvasData, CanvasPlayer, CanvasTool } from '~/lib/types'
import { computeFieldRect, computeViewTransform } from '~/composables/useCanvasRenderer'

interface InteractionOptions {
  canvasData: Ref<CanvasData>
  selectedTool: Ref<CanvasTool>
  selectedPlayerId: Ref<string | null>
  activeSegmentIndex: Ref<number | null>
  zoom: Ref<number>
  panOffset: Ref<{ x: number; y: number }>
  fieldSettings: Ref<{ field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number }>
  viewMode?: Ref<'fit' | 'full'>
  onSelectPlayer: (id: string | null) => void
  onMovePlayer: (id: string, x: number, y: number) => void
  onStartSegment: (playerId: string, x: number, y: number) => void
  onAddPoint: (playerId: string, x: number, y: number) => void
  onFinalizeSegment: () => void
  onAddMotionPoint: (playerId: string, x: number, y: number) => void
  onAssignReadOrder: (playerId: string) => void
  onClearRoute: (playerId: string) => void
  onRequestRender: () => void
}

export function useCanvasInteraction(canvasRef: Ref<HTMLCanvasElement | null>, options: InteractionOptions) {
  const isDragging = ref(false)
  const dragPlayerId = ref<string | null>(null)
  const isPanning = ref(false)
  const lastPanPos = ref({ x: 0, y: 0 })

  function getFieldRect() {
    const canvas = canvasRef.value
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const logicalW = canvas.width / dpr
    const logicalH = canvas.height / dpr
    const fs = options.fieldSettings.value
    return computeFieldRect(logicalW, logicalH, {
      fieldLength: fs.field_length,
      fieldWidth: fs.field_width,
      endzoneSize: fs.endzone_size,
      zoom: options.zoom.value,
    })
  }

  function getFieldCoords(e: MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.value
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const fieldRect = getFieldRect()
    if (!fieldRect) return null

    const dpr = window.devicePixelRatio || 1
    const logicalW = canvas.width / dpr
    const logicalH = canvas.height / dpr
    const fs = options.fieldSettings.value

    const view = computeViewTransform(logicalW, logicalH, fieldRect, {
      fieldLength: fs.field_length,
      endzoneSize: fs.endzone_size,
      lineOfScrimmage: fs.line_of_scrimmage,
      viewMode: options.viewMode?.value,
    })

    const effectiveZoom = view.zoom * options.zoom.value
    const effectivePanX = view.panX + options.panOffset.value.x
    const effectivePanY = view.panY + options.panOffset.value.y

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const cx = (mx - effectivePanX) / effectiveZoom
    const cy = (my - effectivePanY) / effectiveZoom

    const fx = (cx - fieldRect.offsetX) / fieldRect.fieldW
    const fy = (cy - fieldRect.offsetY) / fieldRect.fieldH

    return { x: fx, y: fy }
  }

  function findPlayerAt(coords: { x: number; y: number }): CanvasPlayer | null {
    const fieldRect = getFieldRect()
    if (!fieldRect) return null

    const radius = Math.max(14, fieldRect.fieldW * 0.04) / fieldRect.fieldW
    const aspectScale = fieldRect.fieldH / fieldRect.fieldW

    for (const player of [...options.canvasData.value.players].reverse()) {
      const dx = player.x - coords.x
      const dy = player.y - coords.y
      const dyScaled = dy * aspectScale
      if (Math.sqrt(dx * dx + dyScaled * dyScaled) < radius * 1.5) {
        return player
      }
    }
    return null
  }

  function isDrawingTool(tool: CanvasTool): boolean {
    return tool === 'straight' || tool === 'curve' || tool === 'option'
  }

  function handleMouseDown(e: MouseEvent) {
    const coords = getFieldCoords(e)
    if (!coords) return

    // Middle mouse for panning
    if (e.button === 1) {
      isPanning.value = true
      lastPanPos.value = { x: e.clientX, y: e.clientY }
      return
    }

    const tool = options.selectedTool.value

    if (tool === 'select') {
      const player = findPlayerAt(coords)
      if (player) {
        options.onSelectPlayer(player.id)
        isDragging.value = true
        dragPlayerId.value = player.id
      } else {
        options.onSelectPlayer(null)
      }
    } else if (isDrawingTool(tool)) {
      const selectedId = options.selectedPlayerId.value
      if (selectedId) {
        // Clamp to field bounds
        const cx = Math.max(0, Math.min(1, coords.x))
        const cy = Math.max(0, Math.min(1, coords.y))
        
        if (options.activeSegmentIndex.value === null) {
          // Start a new segment
          options.onStartSegment(selectedId, cx, cy)
        } else {
          // Add point to existing segment
          options.onAddPoint(selectedId, cx, cy)
        }
        options.onRequestRender()
      } else {
        // Click on player to select for drawing
        const player = findPlayerAt(coords)
        if (player) {
          options.onSelectPlayer(player.id)
        }
      }
    } else if (tool === 'motion') {
      const selectedId = options.selectedPlayerId.value
      if (selectedId) {
        const cx = Math.max(0, Math.min(1, coords.x))
        const cy = Math.max(0, Math.min(1, coords.y))
        options.onAddMotionPoint(selectedId, cx, cy)
        options.onRequestRender()
      } else {
        const player = findPlayerAt(coords)
        if (player) {
          options.onSelectPlayer(player.id)
        }
      }
    } else if (tool === 'readorder') {
      // Click on a player to assign read order to their last route segment
      const player = findPlayerAt(coords)
      if (player) {
        options.onAssignReadOrder(player.id)
        options.onRequestRender()
      }
    } else if (tool === 'erase') {
      const player = findPlayerAt(coords)
      if (player && player.route) {
        options.onClearRoute(player.id)
        options.onRequestRender()
      }
    }
  }

  function handleDoubleClick(_e: MouseEvent) {
    // Double-click finalizes the current segment
    if (options.activeSegmentIndex.value !== null) {
      options.onFinalizeSegment()
      options.onRequestRender()
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning.value) {
      const dx = e.clientX - lastPanPos.value.x
      const dy = e.clientY - lastPanPos.value.y
      options.panOffset.value = {
        x: options.panOffset.value.x + dx,
        y: options.panOffset.value.y + dy,
      }
      lastPanPos.value = { x: e.clientX, y: e.clientY }
      options.onRequestRender()
      return
    }

    if (isDragging.value && dragPlayerId.value) {
      const coords = getFieldCoords(e)
      if (coords) {
        let clampedX = Math.max(0, Math.min(1, coords.x))
        let clampedY = Math.max(0, Math.min(1, coords.y))
        const player = options.canvasData.value.players.find((p) => p.id === dragPlayerId.value)
        if (player?.side === 'defense' && (player.designation === 'R' || player.position === 'RSH')) {
          const fs = options.fieldSettings.value
          const totalLength = fs.field_length + fs.endzone_size * 2
          const losY = (fs.endzone_size + fs.field_length - fs.line_of_scrimmage) / totalLength
          const maxY = losY - 7 / totalLength
          clampedY = Math.min(clampedY, maxY)
        }
        options.onMovePlayer(dragPlayerId.value, clampedX, clampedY)
        options.onRequestRender()
      }
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    isDragging.value = false
    dragPlayerId.value = null
    isPanning.value = false
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.5, Math.min(2, options.zoom.value + delta))
    options.zoom.value = newZoom
    options.onRequestRender()
  }

  function setupListeners() {
    const canvas = canvasRef.value
    if (!canvas) return

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('dblclick', handleDoubleClick)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)
    // Zoom disabled
    // canvas.addEventListener('wheel', handleWheel, { passive: false })
  }

  function removeListeners() {
    const canvas = canvasRef.value
    if (!canvas) return

    canvas.removeEventListener('mousedown', handleMouseDown)
    canvas.removeEventListener('dblclick', handleDoubleClick)
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseup', handleMouseUp)
    canvas.removeEventListener('mouseleave', handleMouseUp)
    canvas.removeEventListener('wheel', handleWheel)
  }

  return {
    setupListeners,
    removeListeners,
  }
}
