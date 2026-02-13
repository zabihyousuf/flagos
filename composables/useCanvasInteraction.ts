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
  /** When route tool is active and user clicks a player (no selection yet), switch to move mode instead of selecting for route */
  onSelectPlayerForMove?: (playerId: string) => void
  /** When select tool and user starts dragging a player (mousedown on player), call once so undo can save state before move */
  onDragStart?: () => void
  /** When user releases after dragging a player, call so we can save state after move for undo stack */
  onDragEnd?: () => void
  /** When user clicks on a route (select tool, no player hit), call with playerId and click client position for delete chip */
  onSelectRoute?: (playerId: string, clientX: number, clientY: number) => void
  /** When user clicks empty (deselect), call so delete chip can be hidden */
  onDeselectRoute?: () => void
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

  /** Distance from point (px, py) to line segment (ax,ay)-(bx,by) in 0-1 field coords */
  function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const qx = ax + t * dx
    const qy = ay + t * dy
    return Math.sqrt((px - qx) ** 2 + (py - qy) ** 2)
  }

  /** Find player whose route path is near the given field coords (for delete chip) */
  function findRouteAt(coords: { x: number; y: number }): CanvasPlayer | null {
    const threshold = 0.04
    for (const player of [...options.canvasData.value.players].reverse()) {
      if (!player.route?.segments?.length) continue
      let lastX = player.x
      let lastY = player.y
      for (const seg of player.route.segments) {
        for (const pt of seg.points) {
          const d = pointToSegmentDist(coords.x, coords.y, lastX, lastY, pt.x, pt.y)
          if (d < threshold) return player
          lastX = pt.x
          lastY = pt.y
        }
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
        options.onDragStart?.()
        options.onSelectPlayer(player.id)
        isDragging.value = true
        dragPlayerId.value = player.id
      } else {
        const routePlayer = findRouteAt(coords)
        if (routePlayer && options.onSelectRoute) {
          options.onSelectRoute(routePlayer.id, e.clientX, e.clientY)
          options.onSelectPlayer(routePlayer.id)
        } else {
          options.onDeselectRoute?.()
          options.onSelectPlayer(null)
        }
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
        // Route tool active, no player selected: switch to move and select (do not start route)
        const player = findPlayerAt(coords)
        if (player) {
          if (options.onSelectPlayerForMove) {
            options.onSelectPlayerForMove(player.id)
            isDragging.value = true
            dragPlayerId.value = player.id
          } else {
            options.onSelectPlayer(player.id)
          }
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
        const fs = options.fieldSettings.value
        const totalLength = fs.field_length + fs.endzone_size * 2
        const losY = (fs.endzone_size + fs.field_length - fs.line_of_scrimmage) / totalLength
        // Defenders cannot pass the line of scrimmage; rushers must stay 7 yards behind LOS
        if (player?.side === 'defense') {
          const isRusher = player.designation === 'R' || player.position === 'RSH'
          const maxY = isRusher ? losY - 7 / totalLength : losY
          clampedY = Math.min(clampedY, maxY)
        }
        // Offensive players cannot pass the LOS (stay on offense side)
        if (player?.side === 'offense') {
          clampedY = Math.max(clampedY, losY)
        }
        options.onMovePlayer(dragPlayerId.value, clampedX, clampedY)
        options.onRequestRender()
      }
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    if (isDragging.value) {
      options.onDragEnd?.()
    }
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
