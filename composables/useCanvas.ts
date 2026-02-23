import type { CanvasData, CanvasPlayer, CanvasRoute, CanvasTool, Player, RouteSegment } from '~/lib/types'
import { getDefaultFormation } from '~/lib/constants'

/**
 * Migrate old v1 canvas data (flat route.points[]) to v2 (route.segments[])
 */
function migrateCanvasData(data: CanvasData): CanvasData {
  if (data.version >= 2) {
    const migrated = { ...data }
    migrated.players = data.players.map((p) => {
      const player = { ...p }
      const isQB = (p.position || '').toUpperCase() === 'QB' || (p.designation || '').toUpperCase() === 'Q'
      const rollSeg = player.route?.segments?.find((s) => s.type === 'rollout')
      if (isQB && rollSeg && rollSeg.points.length > 0 && !player.motionPath?.length) {
        player.motionPath = [...rollSeg.points]
      }
      return player
    })
    return migrated
  }
  const migrated: CanvasData = {
    version: 2,
    annotations: data.annotations ?? [],
    players: data.players.map((p) => {
      const player: CanvasPlayer = {
        ...p,
        designation: p.designation ?? (p as any).label ?? p.position,
        motionPath: p.motionPath ?? null,
      }
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

/** Alignment depth offset in normalized Y (0–1). Defense: + = toward LOS, - = deeper. Used to move defender when alignment changes. */
function alignmentDepthOffset(alignment: CanvasPlayer['alignment']): number {
  switch (alignment) {
    case 'tight': return 0.025
    case 'soft': return -0.02
    case 'off': return -0.045
    case 'normal':
    default: return 0
  }
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

  const historyStack = ref<CanvasData[]>([])
  const historyIndex = ref(-1)

  /** Per-player history: undo/redo in Player Details only affects that player. */
  const playerHistoryStacks = ref<Record<string, CanvasPlayer[]>>({})
  const playerHistoryIndices = ref<Record<string, number>>({})

  function getPlayerSnapshot(playerId: string): CanvasPlayer | null {
    const p = canvasData.value.players.find((x) => x.id === playerId)
    return p ? JSON.parse(JSON.stringify(p)) : null
  }

  function pushHistoryForPlayer(playerId: string) {
    const snapshot = getPlayerSnapshot(playerId)
    if (!snapshot) return
    const stacks = playerHistoryStacks.value
    const indices = playerHistoryIndices.value
    if (!stacks[playerId]) stacks[playerId] = []
    if (!(playerId in indices)) indices[playerId] = -1
    const stack = stacks[playerId]
    const idx = indices[playerId]
    if (idx < stack.length - 1) {
      stacks[playerId] = stack.slice(0, idx + 1)
    }
    stacks[playerId].push(snapshot)
    if (stacks[playerId].length > HISTORY_CAP) {
      stacks[playerId].shift()
      indices[playerId] = Math.max(0, indices[playerId] - 1)
    }
    indices[playerId] = stacks[playerId].length - 1
  }

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
    const pid = selectedPlayerId.value
    if (!pid) return
    const stack = playerHistoryStacks.value[pid]
    let idx = playerHistoryIndices.value[pid] ?? -1
    if (!stack || stack.length === 0 || idx <= 0) return
    idx--
    playerHistoryIndices.value = { ...playerHistoryIndices.value, [pid]: idx }
    const prev = stack[idx]
    if (!prev) return
    const player = canvasData.value.players.find((p) => p.id === pid)
    if (player) {
      Object.assign(player, prev)
      isDirty.value = true
    }
  }

  function redo() {
    const pid = selectedPlayerId.value
    if (!pid) return
    const stack = playerHistoryStacks.value[pid]
    let idx = playerHistoryIndices.value[pid] ?? -1
    if (!stack || idx < 0 || idx >= stack.length - 1) return
    idx++
    playerHistoryIndices.value = { ...playerHistoryIndices.value, [pid]: idx }
    const next = stack[idx]
    if (!next) return
    const player = canvasData.value.players.find((p) => p.id === pid)
    if (player) {
      Object.assign(player, next)
      isDirty.value = true
    }
  }

  const canUndo = computed(() => {
    const pid = selectedPlayerId.value
    if (!pid) return false
    const idx = playerHistoryIndices.value[pid] ?? -1
    return idx > 0
  })
  const canRedo = computed(() => {
    const pid = selectedPlayerId.value
    if (!pid) return false
    const stack = playerHistoryStacks.value[pid]
    const idx = playerHistoryIndices.value[pid] ?? -1
    return stack != null && idx >= 0 && idx < stack.length - 1
  })

  /** Call after loading initial play data so undo has a starting point */
  function seedHistory() {
    historyStack.value = [getExportData()]
    historyIndex.value = 0
    const stacks: Record<string, CanvasPlayer[]> = {}
    const indices: Record<string, number> = {}
    canvasData.value.players.forEach((p) => {
      const snap = getPlayerSnapshot(p.id)
      if (snap) {
        stacks[p.id] = [snap]
        indices[p.id] = 0
      }
    })
    playerHistoryStacks.value = stacks
    playerHistoryIndices.value = indices
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
    if (!player) return

    const dx = x - player.x
    const dy = y - player.y
    player.x = x
    player.y = y

    const clamp = (v: number) => Math.max(0, Math.min(1, v))

    if (dx !== 0 || dy !== 0) {
      if (player.route?.segments?.length) {
        player.route.segments = player.route.segments.map((seg) => ({
          ...seg,
          points: seg.points.map((pt) => ({
            x: clamp(pt.x + dx),
            y: clamp(pt.y + dy),
          })),
        }))
      }
      if (player.motionPath?.length) {
        player.motionPath = player.motionPath.map((pt) => ({
          x: clamp(pt.x + dx),
          y: clamp(pt.y + dy),
        }))
      }
    }

    isDirty.value = true
  }

  /** Call before starting a drag so we have state to undo to (playerId = which player/zone is being dragged) */
  function pushHistoryBeforeDrag(playerId?: string) {
    if (playerId) pushHistoryForPlayer(playerId)
    else pushHistory()
  }

  /** Call after drag ends (no push; current canvas state is the result) */
  function pushHistoryAfterDrag(_playerId?: string) {
    // Per-player: state already updated; no push needed
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

    // When player has motion, route starts from the end of motion (first point = motion end, second = click)
    const motionEnd = player.motionPath?.length
      ? player.motionPath[player.motionPath.length - 1]
      : null
    const firstPoint = motionEnd ? { x: motionEnd.x, y: motionEnd.y } : { x, y }
    const points = [firstPoint]
    if (motionEnd) points.push({ x, y }) // click is second point so route visibly starts at motion end

    player.route.segments.push({
      points,
      type: type as 'straight' | 'curve' | 'option',
    })
    activeSegmentIndex.value = player.route.segments.length - 1
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  function addPointToSegment(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route || activeSegmentIndex.value === null) return

    const segment = player.route.segments[activeSegmentIndex.value]
    if (!segment) return

    segment.points.push({ x, y })
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  function finalizeSegment() {
    activeSegmentIndex.value = null
  }

  function clearRoute(playerId: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return
    const isRusher = player.side === 'defense' && (player.designation === 'R' || player.position === 'RSH')
    if (isRusher) return // Rusher's path to QB cannot be deleted
    activeSegmentIndex.value = null
    const isQB = (player.position || '').toUpperCase() === 'QB' || (player.designation || '').toUpperCase() === 'Q'
    if (isQB) player.motionPath = null
    player.route = null
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  function deleteRouteSegment(playerId: string, segmentIndex: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route?.segments?.length) return
    const isRusher = player.side === 'defense' && (player.designation === 'R' || player.position === 'RSH')
    if (isRusher) return
    const idx = Math.max(0, Math.min(segmentIndex, player.route.segments.length - 1))
    const seg = player.route.segments[idx]
    const isQB = (player.position || '').toUpperCase() === 'QB' || (player.designation || '').toUpperCase() === 'Q'
    const hadReadOrder = seg?.readOrder != null
    player.route.segments.splice(idx, 1)
    if (seg?.type === 'rollout' && isQB) {
      player.motionPath = null
    }
    if (player.route.segments.length === 0) {
      player.route = null
      player.primaryTarget = false
    }
    if (activeSegmentIndex.value !== null) {
      if (activeSegmentIndex.value === idx) activeSegmentIndex.value = null
      else if (activeSegmentIndex.value > idx) activeSegmentIndex.value--
    }
    if (hadReadOrder) renumberReadOrderProgression()
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  function clearAllRoutes() {
    activeSegmentIndex.value = null
    canvasData.value.players.forEach((p) => {
      const isRusher = p.side === 'defense' && (p.designation === 'R' || p.position === 'RSH')
      if (isRusher) return
      p.route = null
      p.motionPath = null
      p.primaryTarget = false
    })
    nextReadOrder.value = 1
    isDirty.value = true
    pushHistory()
  }

  // ─── Read order ────────────────────────────────────────

  /** Renumber all read orders so they are 1, 2, 3... with no gaps (call after removing one). */
  function renumberReadOrderProgression() {
    const withOrder: { order: number; segment: RouteSegment }[] = []
    canvasData.value.players.forEach((p) => {
      p.route?.segments?.forEach((seg) => {
        if (seg.readOrder != null) withOrder.push({ order: seg.readOrder, segment: seg })
      })
    })
    withOrder.sort((a, b) => a.order - b.order)
    withOrder.forEach(({ segment }, i) => {
      segment.readOrder = i + 1
    })
    nextReadOrder.value = withOrder.length + 1
  }

  function assignReadOrder(playerId: string, segmentIndex?: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player || !player.route || player.route.segments.length === 0) return

    // Assign to last segment if no index given
    const idx = segmentIndex ?? player.route.segments.length - 1
    const segment = player.route.segments[idx]
    if (!segment) return

    if (segment.readOrder) {
      // Remove from progression; renumber the rest so 1,2,3... have no gaps
      segment.readOrder = undefined
      renumberReadOrderProgression()
    } else {
      segment.readOrder = nextReadOrder.value++
    }
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  // ─── Motion / QB rollout ───────────────────────────────

  function addMotionPoint(playerId: string, x: number, y: number) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return

    const pos = (player.position || '').toUpperCase()
    const des = (player.designation || '').toUpperCase()
    // Centers cannot go in motion
    if (pos === 'C' || des === 'C') return

    if (!player.motionPath) {
      player.motionPath = []
    }
    const isQB = pos === 'QB' || des === 'Q'
    const motionPoint = { x, y }
    player.motionPath.push(motionPoint)
    // QB rollout: sync to route segment so it shows in route segments UI
    if (isQB) {
      if (!player.route) player.route = { segments: [] }
      const rollSeg = player.route.segments.find((s) => s.type === 'rollout')
      if (rollSeg) {
        rollSeg.points = [...player.motionPath]
      } else {
        player.route.segments.unshift({ type: 'rollout', points: [...player.motionPath] })
      }
    }
    isDirty.value = true
    pushHistoryForPlayer(playerId)
  }

  function clearMotionPath(playerId: string) {
    const player = canvasData.value.players.find((p) => p.id === playerId)
    if (!player) return
    const isQB = (player.position || '').toUpperCase() === 'QB' || (player.designation || '').toUpperCase() === 'Q'
    player.motionPath = null
    if (isQB && player.route?.segments) {
      const idx = player.route.segments.findIndex((s) => s.type === 'rollout')
      if (idx >= 0) {
        player.route.segments.splice(idx, 1)
        if (player.route.segments.length === 0) player.route = null
      }
    }
    isDirty.value = true
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
      pushHistoryForPlayer(playerId)
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
      // Alignment change for defense non-rushers: move player depth (tight = toward LOS, off = deep)
      const isDefenseCoverage = player.side === 'defense' && !(player.designation === 'R' || player.position === 'RSH')
      const oldAlignment = player.alignment
      if (isDefenseCoverage && 'alignment' in attrs && attrs.alignment !== undefined) {
        const delta = alignmentDepthOffset(attrs.alignment) - alignmentDepthOffset(oldAlignment)
        const newY = Math.max(0, Math.min(1, player.y + delta))
        attrs = { ...attrs, y: newY }
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
      pushHistoryForPlayer(playerId)
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
    // Caller sets isDirty if needed (e.g. after user-initiated type switch); don't mark dirty on initial load
  }

  function setZoom(val: number) {
    zoom.value = Math.max(0.5, Math.min(2, val))
  }

  function getExportData(): CanvasData {
    return JSON.parse(JSON.stringify(canvasData.value))
  }

  const MAX_PLAYERS_ON_FIELD = 8

  function addPlayerToCanvasData(
    player: Player, 
    position: string, 
    side: 'offense' | 'defense',
    settings?: { los: number, length: number, endzone: number }
  ) {
    if (canvasData.value.players.length >= MAX_PLAYERS_ON_FIELD) return
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
    const snap = getPlayerSnapshot(id)
    if (snap) {
      playerHistoryStacks.value = { ...playerHistoryStacks.value, [id]: [snap] }
      playerHistoryIndices.value = { ...playerHistoryIndices.value, [id]: 0 }
    }
    isDirty.value = true
    pushHistory()
  }

  function addPlaceholderPlayerToCanvas(
    position: string,
    side: 'offense' | 'defense',
    settings?: { los: number, length: number, endzone: number }
  ) {
    if (canvasData.value.players.length >= MAX_PLAYERS_ON_FIELD) return

    const id = `p${Date.now()}`
    let yPos = side === 'offense' ? 0.6 : 0.4
    if (settings) {
      const total = settings.length + settings.endzone * 2
      const losY = (settings.endzone + settings.length - settings.los) / total
      yPos = losY
    }
    const xPos = 0.2 + Math.random() * 0.6

    canvasData.value.players.push({
      id,
      x: xPos,
      y: yPos,
      position,
      designation: position,
      side,
      route: null,
      motionPath: null,
      number: 0,
      name: position,
      coverageRadius: side === 'defense' ? 5 : undefined,
      alignment: side === 'defense' ? 'normal' : undefined,
    })
    const snap = getPlayerSnapshot(id)
    if (snap) {
      playerHistoryStacks.value = { ...playerHistoryStacks.value, [id]: [snap] }
      playerHistoryIndices.value = { ...playerHistoryIndices.value, [id]: 0 }
    }
    isDirty.value = true
    pushHistory()
  }

  function removePlayerFromCanvasData(playerId: string) {
    canvasData.value.players = canvasData.value.players.filter((p) => p.id !== playerId)
    if (selectedPlayerId.value === playerId) {
      selectedPlayerId.value = null
    }
    const stacks = { ...playerHistoryStacks.value }
    const indices = { ...playerHistoryIndices.value }
    delete stacks[playerId]
    delete indices[playerId]
    playerHistoryStacks.value = stacks
    playerHistoryIndices.value = indices
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
    pushHistory,
    pushHistoryBeforeDrag,
    pushHistoryAfterDrag,
    undo,
    redo,
    seedHistory,
    startRouteSegment,
    addPointToSegment,
    finalizeSegment,
    clearRoute,
    deleteRouteSegment,
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
    addPlaceholderPlayerToCanvas,
    removePlayerFromCanvasData,
  }
}
