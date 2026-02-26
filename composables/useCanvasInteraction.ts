import type { CanvasData, CanvasPlayer, CanvasTool } from '~/lib/types'
import type { ContentBounds, ViewTransform } from '~/composables/useCanvasRenderer'
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
  /** When set (e.g. ghost defense in fit view), use same transform as renderer so hit-test matches */
  contentBounds?: Ref<ContentBounds | undefined>
  /** When set, use this transform (from last render) so hit-test exactly matches drawn frame; overrides contentBounds */
  lastViewTransform?: Ref<ViewTransform | null>
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
  /** When select tool and user starts dragging a player or zone, call with that player's id for per-player undo */
  onDragStart?: (playerId?: string) => void
  /** When user releases after dragging, call with the player id that was dragged */
  onDragEnd?: (playerId?: string) => void
  /** When user clicks on a route (select tool, no player hit), call with playerId and click client position for delete chip */
  onSelectRoute?: (playerId: string, clientX: number, clientY: number) => void
  /** When user clicks empty (deselect), call so delete chip can be hidden */
  onDeselectRoute?: () => void
  /** When user drags an unlocked coverage zone, call with playerId and clamped field coords (0-1) */
  onMoveCoverageZone?: (playerId: string, x: number, y: number) => void
}

export function useCanvasInteraction(canvasRef: Ref<HTMLCanvasElement | null>, options: InteractionOptions) {
  const isDragging = ref(false)
  const dragPlayerId = ref<string | null>(null)
  const dragZonePlayerId = ref<string | null>(null)
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
      viewMode: options.viewMode?.value,
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

    const view =
      options.lastViewTransform?.value != null
        ? options.lastViewTransform.value
        : computeViewTransform(logicalW, logicalH, fieldRect, {
            fieldLength: fs.field_length,
            endzoneSize: fs.endzone_size,
            lineOfScrimmage: fs.line_of_scrimmage,
            viewMode: options.viewMode?.value,
            contentBounds: options.contentBounds?.value,
          })

    const effectiveZoom = view.zoom * options.zoom.value
    const effectivePanX = view.panX + options.panOffset.value.x
    const effectivePanY = view.panY + options.panOffset.value.y

    // Map from display (bounding rect) to logical canvas size so hit-test matches render in all view modes
    const scaleX = logicalW / (rect.width || 1)
    const scaleY = logicalH / (rect.height || 1)
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const cx = (mx - effectivePanX) / effectiveZoom
    const cy = (my - effectivePanY) / effectiveZoom

    const fx = (cx - fieldRect.offsetX) / fieldRect.fieldW
    const fy = (cy - fieldRect.offsetY) / fieldRect.fieldH

    return { x: fx, y: fy }
  }

  function findPlayerAt(coords: { x: number; y: number }): CanvasPlayer | null {
    const fieldRect = getFieldRect()
    if (!fieldRect) return null
    const isFitView = options.viewMode?.value === 'fit'
    const radiusPx = isFitView ? Math.max(10, fieldRect.fieldW * 0.028) : Math.max(14, fieldRect.fieldW * 0.04)
    const radius = radiusPx / fieldRect.fieldW
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

  /** Find defense player whose unlocked coverage zone circle contains the point (for zone drag) */
  function findCoverageZoneAt(coords: { x: number; y: number }): CanvasPlayer | null {
    const fieldRect = getFieldRect()
    if (!fieldRect) return null
    const fs = options.fieldSettings.value
    const yardHeightPx = fieldRect.fieldH / (fs.field_length + fs.endzone_size * 2)

    for (const player of [...options.canvasData.value.players].reverse()) {
      if (player.side !== 'defense' || !player.coverageZoneUnlocked || !player.coverageRadius) continue
      if (player.designation === 'R' || player.position === 'RSH') continue
      const zx = (player.coverageZoneX != null ? player.coverageZoneX : player.x) * fieldRect.fieldW
      const zy = (player.coverageZoneY != null ? player.coverageZoneY : player.y) * fieldRect.fieldH
      const cx = coords.x * fieldRect.fieldW
      const cy = coords.y * fieldRect.fieldH
      const pixRadius = player.coverageRadius * yardHeightPx
      const dist = Math.sqrt((cx - zx) ** 2 + (cy - zy) ** 2)
      if (dist <= pixRadius) return player
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
    const threshold = 0.02
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
        options.onDragStart?.(player.id)
        options.onSelectPlayer(player.id)
        isDragging.value = true
        dragPlayerId.value = player.id
      } else {
        const zonePlayer = findCoverageZoneAt(coords)
        if (zonePlayer && options.onMoveCoverageZone) {
          options.onDragStart?.(zonePlayer.id)
          options.onSelectPlayer(zonePlayer.id)
          dragZonePlayerId.value = zonePlayer.id
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
            options.onDragStart?.(player.id)
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
        let cx = Math.max(0, Math.min(1, coords.x))
        let cy = Math.max(0, Math.min(1, coords.y))
        // Offense: motion cannot go past the line of scrimmage
        const fs = options.fieldSettings.value
        const totalLength = fs.field_length + fs.endzone_size * 2
        const losY = (fs.endzone_size + fs.field_length - fs.line_of_scrimmage) / totalLength
        const player = options.canvasData.value.players.find((p) => p.id === selectedId)
        if (player?.side === 'offense') {
          cy = Math.max(cy, losY)
        }
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

    if (dragZonePlayerId.value && options.onMoveCoverageZone) {
      const coords = getFieldCoords(e)
      if (coords) {
        const clampedX = Math.max(0, Math.min(1, coords.x))
        const clampedY = Math.max(0, Math.min(1, coords.y))
        options.onMoveCoverageZone(dragZonePlayerId.value, clampedX, clampedY)
        options.onRequestRender()
      }
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    const draggedId = dragPlayerId.value ?? dragZonePlayerId.value ?? undefined
    if (isDragging.value || dragZonePlayerId.value) {
      options.onDragEnd?.(draggedId)
    }
    isDragging.value = false
    dragPlayerId.value = null
    dragZonePlayerId.value = null
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
