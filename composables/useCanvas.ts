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

const HISTORY_CAP = 30

export function useCanvas() {
  const canvasData = ref<CanvasData>(getDefaultFormation('offense'))
  const selectedTool = ref<CanvasTool>('select')
  const selectedPlayerId = ref<string | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  const isDirty = ref(false)
  const activeSegmentIndex = ref<number | null>(null) // track which segment is being drawn
  const nextReadOrder = ref(1) // auto-incrementing read order counter

  const historyStack = ref<CanvasData[]>([])
  const historyIndex = ref(-1)

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

  /** Push current state to history (call before or after a mutation depending on convention). Used for undo/redo. */
  function pushHistory() {
    const snapshot = getExportData()
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    }
    historyStack.value.push(snapshot)
    if (historyStack.value.length > HISTORY_CAP) {
      historyStack.value.shift()
      historyIndex.value = Math.max(0, historyIndex.value - 1)
    }
    historyIndex.value = historyStack.value.length - 1
  }

  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    loadCanvasData(historyStack.value[historyIndex.value])
  }

  function redo() {
    if (historyIndex.value >= historyStack.value.length - 1) return
    historyIndex.value++
    loadCanvasData(historyStack.value[historyIndex.value])
  }

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value >= 0 && historyIndex.value < historyStack.value.length - 1)

  /** Call after loading initial play data so undo has a starting point */
  function seedHistory() {
    historyStack.value = [getExportData()]
    historyIndex.value = 0
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

  /** Call before starting a drag so we have state to undo to (called once per drag from interaction) */
  function pushHistoryBeforeDrag() {
    pushHistory()
  }

  /** Call after drag ends to save the new state to history */
  function pushHistoryAfterDrag() {
    pushHistory()
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
    pushHistory()
  }

  function addPointToSegment(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route || activeSegmentIndex.value === null) return

    const segment = player.route.segments[activeSegmentIndex.value]
    if (!segment) return

    segment.points.push({ x, y })
    isDirty.value = true
    pushHistory()
  }

  function finalizeSegment() {
    activeSegmentIndex.value = null
  }

  function clearRoute(playerId: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return
    const isRusher = player.side === 'defense' && (player.designation === 'R' || player.position === 'RSH')
    if (isRusher) return // Rusher's path to QB cannot be deleted
    player.route = null
    isDirty.value = true
    pushHistory()
  }

  function clearAllRoutes() {
    canvasData.value.players.forEach((p) => {
      const isRusher = p.side === 'defense' && (p.designation === 'R' || p.position === 'RSH')
      if (isRusher) return
      p.route = null
      p.motionPath = null
    })
    nextReadOrder.value = 1
    isDirty.value = true
    pushHistory()
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
    pushHistory()
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
    pushHistory()
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
      if (designation === 'R') {
        player.coverageRadius = undefined // Rushers do not cover a zone
      }
      isDirty.value = true
      pushHistory()
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

  function updatePlayerAttribute(playerId: string, attrs: Partial<CanvasPlayer>) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (player) {
      const wasRusher = player.position === 'RSH' || player.designation === 'R'
      if (attrs.primaryTarget === true) {
        canvasData.value.players.forEach((p) => { p.primaryTarget = false })
      }
      Object.assign(player, attrs)
      if (attrs.position === 'RSH' || attrs.designation === 'R') {
        player.coverageRadius = undefined // Rushers do not cover a zone
      }
      // If switched from rusher to non-rusher (e.g. DB), remove the line to QB and set default coverage
      const isRusher = player.position === 'RSH' || player.designation === 'R'
      if (wasRusher && !isRusher) {
        player.route = null
        player.motionPath = null
        player.coverageRadius = 5 // Default coverage radius for defenders
      }
      isDirty.value = true
      pushHistory()
    }
  }

  function updateCoverageZonePosition(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || player.side !== 'defense') return
    const isRusher = player.designation === 'R' || player.position === 'RSH'
    if (isRusher) return
    player.coverageZoneUnlocked = true
    player.coverageZoneX = Math.max(0, Math.min(1, x))
    player.coverageZoneY = Math.max(0, Math.min(1, y))
    isDirty.value = true
    // History is pushed by caller (e.g. pushHistoryBeforeDrag / pushHistoryAfterDrag for zone drag)
  }

  function resetFormation(
    side: 'offense' | 'defense',
    starters?: Player[],
    settings?: { los: number, length: number, endzone: number },
    positionMap?: Record<string, string>,
  ) {
    canvasData.value = getDefaultFormation(side, starters, settings, positionMap)
    
    // Auto-draw arrow for Rusher to Ghost QB
    if (side === 'defense') {
      const rusher = canvasData.value.players.find(p => p.position === 'RSH')
      if (rusher) {
        // Calculate QB position (same logic as Ghost QB)
        const s = settings || { los: 5, length: 50, endzone: 7 } // Fallback to rough defaults if missing
        const total = s.length + s.endzone * 2
        // If settings were missing, these defaults might be slightly off from global defaults 
        // but getDefaultFormation handles its own defaults. 
        // Let's use the same logic:
        const los = s.los
        const len = s.length
        const ez = s.endzone
        
        const yardH = 1 / total
        const losY = (ez + len - los) * yardH
        const qbY = losY + (5 * yardH)
        const qbX = 0.5
        
        rusher.route = {
          segments: [{
            type: 'straight',
            points: [{ x: qbX, y: qbY }]
          }]
        }
      }
    }

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
      coverageRadius: side === 'defense' ? 5 : undefined,
      alignment: side === 'defense' ? 'normal' : undefined,
    })
    isDirty.value = true
    pushHistory()
  }

  function removePlayerFromCanvasData(playerId: string) {
    canvasData.value.players = canvasData.value.players.filter((p) => p.id !== playerId)
    if (selectedPlayerId.value === playerId) {
      selectedPlayerId.value = null
    }
    isDirty.value = true
    pushHistory()
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
    historyStack,
    historyIndex,
    canUndo,
    canRedo,
    loadCanvasData,
    setTool,
    selectPlayer,
    updatePlayerPosition,
    pushHistoryBeforeDrag,
    pushHistoryAfterDrag,
    undo,
    redo,
    seedHistory,
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
    updatePlayerAttribute,
    updateCoverageZonePosition,
    resetFormation,
    setZoom,
    getExportData,
    addPlayerToCanvasData,
    removePlayerFromCanvasData,
  }
}
