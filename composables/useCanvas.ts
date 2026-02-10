import type { CanvasData, CanvasPlayer, CanvasRoute, CanvasTool, Player, RouteSegment } from '~/lib/types'
import { getDefaultFormation } from '~/lib/constants'

/**
 * Migrate old v1 canvas data (flat route.points[]) to v2 (route.segments[])
 */
function migrateCanvasData(data: CanvasData): CanvasData {
  if (data.version >= 2) return data
  const migrated: CanvasData = {
    version: 2,
    annotations: data.annotations ?? [],
    players: data.players.map((p) => {
      const player: CanvasPlayer = {
        ...p,
        designation: p.designation ?? (p as any).label ?? p.position,
        motionPath: p.motionPath ?? null,
      }
      // Migrate old route format
      if (player.route) {
        const oldRoute = player.route as any
        if (oldRoute.points && !oldRoute.segments) {
          player.route = {
            segments: oldRoute.points.length > 0
              ? [{ points: oldRoute.points, type: oldRoute.type === 'straight' ? 'straight' : 'curve' as const }]
              : [],
          }
        }
      }
      return player
    }),
  }
  return migrated
}

export function useCanvas() {
  const canvasData = ref<CanvasData>(getDefaultFormation('offense'))
  const selectedTool = ref<CanvasTool>('select')
  const selectedPlayerId = ref<string | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  const isDirty = ref(false)
  const activeSegmentIndex = ref<number | null>(null) // track which segment is being drawn
  const nextReadOrder = ref(1) // auto-incrementing read order counter

  const selectedPlayer = computed(() => {
    if (!selectedPlayerId.value) return null
    return canvasData.value.players.find((p) => p.id === selectedPlayerId.value) ?? null
  })

  function loadCanvasData(data: CanvasData) {
    canvasData.value = migrateCanvasData(JSON.parse(JSON.stringify(data)))
    isDirty.value = false
    // Calculate next readOrder from existing routes
    let maxOrder = 0
    canvasData.value.players.forEach((p) => {
      p.route?.segments?.forEach((seg) => {
        if (seg.readOrder && seg.readOrder > maxOrder) maxOrder = seg.readOrder
      })
    })
    nextReadOrder.value = maxOrder + 1
  }

  function setTool(tool: CanvasTool) {
    // Finalize any active segment when switching tools
    if (activeSegmentIndex.value !== null) {
      finalizeSegment()
    }
    selectedTool.value = tool
    if (tool !== 'select' && tool !== 'straight' && tool !== 'curve' && tool !== 'option') {
      // Don't deselect for drawing tools — user needs a selected player
    }
  }

  function selectPlayer(id: string | null) {
    if (activeSegmentIndex.value !== null) {
      finalizeSegment()
    }
    selectedPlayerId.value = id
  }

  function updatePlayerPosition(id: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === id)
    if (player) {
      player.x = x
      player.y = y
      isDirty.value = true
    }
  }

  // ─── Segment-based route drawing ───────────────────────

  function startRouteSegment(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return

    if (!player.route) {
      player.route = { segments: [] }
    }

    const type = selectedTool.value === 'option' ? 'option'
      : selectedTool.value === 'straight' ? 'straight'
        : 'curve'

    player.route.segments.push({
      points: [{ x, y }],
      type: type as 'straight' | 'curve' | 'option',
    })
    activeSegmentIndex.value = player.route.segments.length - 1
    isDirty.value = true
  }

  function addPointToSegment(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route || activeSegmentIndex.value === null) return

    const segment = player.route.segments[activeSegmentIndex.value]
    if (!segment) return

    segment.points.push({ x, y })
    isDirty.value = true
  }

  function finalizeSegment() {
    activeSegmentIndex.value = null
  }

  function clearRoute(playerId: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (player) {
      player.route = null
      isDirty.value = true
    }
  }

  function clearAllRoutes() {
    canvasData.value.players.forEach((p) => {
      p.route = null
      p.motionPath = null
    })
    nextReadOrder.value = 1
    isDirty.value = true
  }

  // ─── Read order ────────────────────────────────────────

  function assignReadOrder(playerId: string, segmentIndex?: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route || player.route.segments.length === 0) return

    // Assign to last segment if no index given
    const idx = segmentIndex ?? player.route.segments.length - 1
    const segment = player.route.segments[idx]
    if (!segment) return

    if (segment.readOrder) {
      // Toggle off if already has one
      segment.readOrder = undefined
    } else {
      segment.readOrder = nextReadOrder.value++
    }
    isDirty.value = true
  }

  // ─── Motion / QB rollout ───────────────────────────────

  function addMotionPoint(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return

    if (!player.motionPath) {
      player.motionPath = []
    }
    player.motionPath.push({ x, y })
    isDirty.value = true
  }

  function clearMotionPath(playerId: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (player) {
      player.motionPath = null
      isDirty.value = true
    }
  }

  // ─── Player designation ────────────────────────────────

  function setPlayerDesignation(playerId: string, designation: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (player) {
      player.designation = designation
      isDirty.value = true
    }
  }

  // ─── Player management (roster) ────────────────────────

  function updatePlayerLabel(playerId: string, label: string) {
    // Kept for backwards compat — maps to designation
    setPlayerDesignation(playerId, label)
  }

  function updatePlayerSide(playerId: string, side: 'offense' | 'defense') {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (player) {
      player.side = side
      isDirty.value = true
    }
  }

  function resetFormation(
    side: 'offense' | 'defense', 
    starters?: Player[],
    settings?: { los: number, length: number, endzone: number }
  ) {
    canvasData.value = getDefaultFormation(side, starters, settings)
    nextReadOrder.value = 1
    isDirty.value = true
  }

  function setZoom(val: number) {
    zoom.value = Math.max(0.5, Math.min(2, val))
  }

  function getExportData(): CanvasData {
    return JSON.parse(JSON.stringify(canvasData.value))
  }

  function addPlayerToCanvasData(
    player: Player, 
    position: string, 
    side: 'offense' | 'defense',
    settings?: { los: number, length: number, endzone: number }
  ) {
    if (canvasData.value.players.length >= 5) return
    const alreadyOnField = canvasData.value.players.some(
      (p) => p.name === player.name && p.number === player.number,
    )
    if (alreadyOnField) return

    const id = `p${Date.now()}`
    
    // Default Y
    let yPos = side === 'offense' ? 0.6 : 0.4
    if (settings) {
       const total = settings.length + settings.endzone * 2
       const losY = (settings.endzone + settings.length - settings.los) / total
       // Place new player at LOS
       yPos = losY
    }

    const xPos = 0.2 + Math.random() * 0.6

    // Use player position as designation (or default)
    const designation = position ?? (side === 'offense' ? 'WR' : 'DB')

    canvasData.value.players.push({
      id,
      x: xPos,
      y: yPos,
      position,
      designation,
      side,
      route: null,
      motionPath: null,
      number: player.number,
      name: player.name,
    })
    isDirty.value = true
  }

  function removePlayerFromCanvasData(playerId: string) {
    canvasData.value.players = canvasData.value.players.filter((p) => p.id !== playerId)
    if (selectedPlayerId.value === playerId) {
      selectedPlayerId.value = null
    }
    isDirty.value = true
  }

  return {
    canvasData,
    selectedTool,
    selectedPlayerId,
    selectedPlayer,
    zoom,
    panOffset,
    isDirty,
    activeSegmentIndex,
    nextReadOrder,
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
    clearMotionPath,
    setPlayerDesignation,
    updatePlayerLabel,
    updatePlayerSide,
    resetFormation,
    setZoom,
    getExportData,
    addPlayerToCanvasData,
    removePlayerFromCanvasData,
  }
}
