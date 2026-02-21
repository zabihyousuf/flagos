import type { CanvasPlayer, CanvasPoint, Player } from '~/lib/types'

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type SimulationPhase =
  | 'idle'
  | 'pre_snap'
  | 'snap'
  | 'routes_developing'
  | 'qb_reading'
  | 'ball_in_air'
  | 'after_catch'
  | 'play_over'

export type PlayOutcome =
  | 'completion'
  | 'incompletion'
  | 'interception'
  | 'sack'
  | 'scramble'
  | 'touchdown'

export interface SimulationEvent {
  time: number
  type: 'info' | 'snap' | 'motion' | 'route' | 'throw' | 'catch' | 'incompletion' | 'interception' | 'sack' | 'flag_pull' | 'scramble' | 'touchdown'
  message: string
  playerId?: string
}

interface InternalPlayer {
  id: string
  canvas: CanvasPlayer
  roster?: Player
  side: 'offense' | 'defense'
  // Current animated position (0-1 normalized)
  x: number
  y: number
  // Route polyline (arc-length parameterized)
  polyline: CanvasPoint[]
  cumulativeDist: number[]
  totalRouteDist: number
  distanceTraveled: number
  routeDone: boolean
  // Motion polyline
  motionPolyline: CanvasPoint[]
  motionCumDist: number[]
  motionTotalDist: number
  motionDistTraveled: number
  motionDone: boolean
  // Defensive state
  isRusher: boolean
  reachedZone: boolean
  zoneX: number
  zoneY: number
  // Ball
  hasBall: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function attr(player: Player | undefined, key: string, fallback = 5): number {
  if (!player) return fallback
  const u = (player.universal_attributes as any)?.[key]
  if (u !== undefined) return u
  const o = (player.offense_attributes as any)?.[key]
  if (o !== undefined) return o
  const d = (player.defense_attributes as any)?.[key]
  if (d !== undefined) return d
  return fallback
}

/** Build a polyline from an array of points and compute cumulative arc-length. */
function buildPolyline(points: CanvasPoint[]): { polyline: CanvasPoint[]; cumulativeDist: number[]; totalDist: number } {
  if (points.length === 0) return { polyline: [], cumulativeDist: [], totalDist: 0 }
  const polyline = [...points]
  const cumulativeDist: number[] = [0]
  let total = 0
  for (let i = 1; i < polyline.length; i++) {
    const dx = polyline[i].x - polyline[i - 1].x
    const dy = polyline[i].y - polyline[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
    cumulativeDist.push(total)
  }
  return { polyline, cumulativeDist, totalDist: total }
}

/** Look up position along a polyline by distance traveled. Binary search on cumulative distance. */
function samplePolyline(polyline: CanvasPoint[], cumDist: number[], dist: number): CanvasPoint {
  if (polyline.length === 0) return { x: 0, y: 0 }
  if (polyline.length === 1 || dist <= 0) return { x: polyline[0].x, y: polyline[0].y }
  const totalDist = cumDist[cumDist.length - 1]
  if (dist >= totalDist) {
    const last = polyline[polyline.length - 1]
    return { x: last.x, y: last.y }
  }
  // Binary search for segment
  let lo = 0
  let hi = cumDist.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cumDist[mid] <= dist) lo = mid
    else hi = mid
  }
  const segLen = cumDist[hi] - cumDist[lo]
  const t = segLen > 0 ? (dist - cumDist[lo]) / segLen : 0
  return {
    x: polyline[lo].x + (polyline[hi].x - polyline[lo].x) * t,
    y: polyline[lo].y + (polyline[hi].y - polyline[lo].y) * t,
  }
}

function dist2d(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

/** Convert a speed attribute (1-10) to yards per second. */
function speedToYPS(speedAttr: number): number {
  // Range: ~10 yd/s (attr 1) to ~22 yd/s (attr 10)
  return 10 + (speedAttr / 10) * 12
}

// ────────────────────────────────────────────────────────────────────────────
// COMPOSABLE
// ────────────────────────────────────────────────────────────────────────────

export function usePlaySimulation() {
  // ── Public reactive state ──────────────────────────────────────────────
  const animatedPositions = ref<Map<string, { x: number; y: number }>>(new Map())
  const animatedBall = ref<{ x: number; y: number; visible: boolean; inFlight: boolean }>({
    x: 0.5, y: 0.5, visible: false, inFlight: false,
  })
  const simulationState = ref<SimulationPhase>('idle')
  const events = ref<SimulationEvent[]>([])
  const isRunning = ref(false)
  const playbackSpeed = ref(1)

  // ── Internal state ─────────────────────────────────────────────────────
  let players: InternalPlayer[] = []
  let currentTime = 0
  let phaseTime = 0 // time spent in current phase
  let animFrameId: number | null = null
  let lastTimestamp = 0
  let fieldTotalLength = 64 // default: 50 + 7*2
  let yardsToNorm = 1 / 64
  let losY = 0.5
  let qbId: string | null = null
  let centerId: string | null = null
  let throwTargetId: string | null = null
  let ballStartX = 0
  let ballStartY = 0
  let ballTargetX = 0
  let ballTargetY = 0
  let ballFlightTime = 0
  let ballFlightElapsed = 0
  let outcome: PlayOutcome | null = null
  let resultYards = 0

  // ── Phase timeouts (prevent hang) ──────────────────────────────────────
  const PHASE_MAX: Record<string, number> = {
    pre_snap: 0.5,
    snap: 0.4,
    routes_developing: 1.8,
    qb_reading: 3.5,
    ball_in_air: 2.0,
    after_catch: 4.0,
  }

  // ── Speed conversion ───────────────────────────────────────────────────
  function ypsToNorm(yps: number): number {
    return yps * yardsToNorm
  }

  // ── Initialize ─────────────────────────────────────────────────────────
  function initialize(
    offensePlayers: CanvasPlayer[],
    defensePlayers: CanvasPlayer[],
    roster: Player[],
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number },
  ) {
    // Reset everything
    stop()
    players = []
    currentTime = 0
    phaseTime = 0
    outcome = null
    resultYards = 0
    throwTargetId = null
    events.value = []
    simulationState.value = 'pre_snap'
    animatedPositions.value = new Map()

    fieldTotalLength = fieldSettings.field_length + fieldSettings.endzone_size * 2
    yardsToNorm = 1 / fieldTotalLength
    const oneYard = yardsToNorm
    losY = (fieldSettings.endzone_size + fieldSettings.field_length - fieldSettings.line_of_scrimmage) * oneYard

    // Find QB and Center
    const qbCanvas = offensePlayers.find(p => p.position === 'QB' || p.designation === 'Q' || p.designation === 'QB')
    const centerCanvas = offensePlayers.find(p => p.position === 'C' || p.designation === 'C')
    qbId = qbCanvas?.id ?? null
    centerId = centerCanvas?.id ?? null

    // Build internal players
    const allCanvas = [...offensePlayers, ...defensePlayers]
    for (const cp of allCanvas) {
      const rosterMatch = roster.find(r => r.number === cp.number && r.name === cp.name)
      const isRusher = cp.side === 'defense' && (cp.designation === 'R' || cp.position === 'RSH')

      // Build route polyline: start → motion end → route segments
      const routeStartPts: CanvasPoint[] = []
      const motionPts: CanvasPoint[] = []

      // Motion path
      if (cp.motionPath && cp.motionPath.length > 0) {
        motionPts.push({ x: cp.x, y: cp.y })
        for (const pt of cp.motionPath) motionPts.push({ x: pt.x, y: pt.y })
      }

      // Route starts at end-of-motion (or player pos if no motion)
      const routeOrigin = motionPts.length > 0
        ? motionPts[motionPts.length - 1]
        : { x: cp.x, y: cp.y }

      if (cp.route?.segments?.length) {
        routeStartPts.push(routeOrigin)
        for (const seg of cp.route.segments) {
          if (seg.type === 'option') continue // Skip option routes in simulation
          for (const pt of seg.points) routeStartPts.push({ x: pt.x, y: pt.y })
        }
      }

      const motion = buildPolyline(motionPts)
      const route = buildPolyline(routeStartPts)

      const ip: InternalPlayer = {
        id: cp.id,
        canvas: cp,
        roster: rosterMatch,
        side: cp.side,
        x: cp.x,
        y: cp.y,
        polyline: route.polyline,
        cumulativeDist: route.cumulativeDist,
        totalRouteDist: route.totalDist,
        distanceTraveled: 0,
        routeDone: route.totalDist === 0,
        motionPolyline: motion.polyline,
        motionCumDist: motion.cumulativeDist,
        motionTotalDist: motion.totalDist,
        motionDistTraveled: 0,
        motionDone: motion.totalDist === 0,
        isRusher,
        reachedZone: false,
        zoneX: cp.coverageZoneUnlocked && cp.coverageZoneX != null ? cp.coverageZoneX : cp.x,
        zoneY: cp.coverageZoneUnlocked && cp.coverageZoneY != null ? cp.coverageZoneY : cp.y,
        hasBall: false,
      }
      players.push(ip)
    }

    // Ball at center
    if (centerCanvas) {
      animatedBall.value = { x: centerCanvas.x, y: centerCanvas.y, visible: true, inFlight: false }
    } else if (qbCanvas) {
      animatedBall.value = { x: qbCanvas.x, y: qbCanvas.y, visible: true, inFlight: false }
    }

    syncPositions()
    logEvent('info', 'Players set')
  }

  // ── Start / Pause / Reset ──────────────────────────────────────────────
  function start() {
    if (isRunning.value) return
    if (simulationState.value === 'idle' || simulationState.value === 'play_over') return
    isRunning.value = true
    lastTimestamp = performance.now()
    animFrameId = requestAnimationFrame(tick)
  }

  function pause() {
    isRunning.value = false
    if (animFrameId != null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  function stop() {
    pause()
    simulationState.value = 'idle'
  }

  function reset() {
    stop()
    currentTime = 0
    phaseTime = 0
    outcome = null
    resultYards = 0
    throwTargetId = null
    events.value = []
    animatedPositions.value = new Map()
    animatedBall.value = { x: 0.5, y: 0.5, visible: false, inFlight: false }
    players = []
  }

  // ── Main tick ──────────────────────────────────────────────────────────
  function tick(timestamp: number) {
    if (!isRunning.value) return
    const rawDt = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp
    // Clamp dt to avoid spiral of death after tab-away
    const dt = Math.min(rawDt, 0.05) * playbackSpeed.value

    currentTime += dt
    phaseTime += dt

    switch (simulationState.value) {
      case 'pre_snap': tickPreSnap(dt); break
      case 'snap': tickSnap(dt); break
      case 'routes_developing': tickRoutesDeveloping(dt); break
      case 'qb_reading': tickQBReading(dt); break
      case 'ball_in_air': tickBallInAir(dt); break
      case 'after_catch': tickAfterCatch(dt); break
      case 'play_over': pause(); return
    }

    syncPositions()
    animFrameId = requestAnimationFrame(tick)
  }

  // ── Phase: Pre-snap ────────────────────────────────────────────────────
  function tickPreSnap(_dt: number) {
    if (phaseTime >= PHASE_MAX.pre_snap) {
      transitionTo('snap')
      logEvent('snap', 'Ball snapped!')
    }
  }

  // ── Phase: Snap ────────────────────────────────────────────────────────
  function tickSnap(dt: number) {
    const qb = getPlayer(qbId)
    const center = getPlayer(centerId)
    if (!qb || !center) {
      transitionTo('routes_developing')
      return
    }

    // Animate ball from center to QB
    const ballSpeed = 0.4 // very fast snap in normalized coords
    const dx = qb.x - animatedBall.value.x
    const dy = qb.y - animatedBall.value.y
    const d = Math.sqrt(dx * dx + dy * dy)

    if (d < 0.005 || phaseTime >= PHASE_MAX.snap) {
      animatedBall.value.x = qb.x
      animatedBall.value.y = qb.y
      qb.hasBall = true

      // Run motion for players that have it — start routes_developing even if motion exists
      // (motion runs concurrently with early route development)
      transitionTo('routes_developing')
      const hasMotion = players.some(p => p.side === 'offense' && !p.motionDone)
      if (hasMotion) logEvent('motion', 'Pre-snap motion')
    } else {
      const step = ballSpeed * dt
      animatedBall.value.x += (dx / d) * Math.min(step, d)
      animatedBall.value.y += (dy / d) * Math.min(step, d)
    }
  }

  // ── Phase: Routes developing ───────────────────────────────────────────
  function tickRoutesDeveloping(dt: number) {
    runMotion(dt)
    runOffenseRoutes(dt)
    // Defenders wait a beat (reaction delay ~0.3s from snap)
    if (phaseTime > 0.3) {
      runDefense(dt)
    }
    followQBWithBall()

    // Transition to qb_reading after routes have developed a bit
    if (phaseTime >= PHASE_MAX.routes_developing) {
      transitionTo('qb_reading')
    }
  }

  // ── Phase: QB reading ──────────────────────────────────────────────────
  function tickQBReading(dt: number) {
    runMotion(dt)
    runOffenseRoutes(dt)
    runDefense(dt)
    followQBWithBall()

    const qb = getPlayer(qbId)
    if (!qb) { endPlay('scramble', 'No QB'); return }

    // Check sack
    const sacker = checkSack(qb)
    if (sacker) {
      endPlay('sack', `Sack by ${sacker.canvas.name || sacker.canvas.designation}!`, sacker.id)
      return
    }

    // Pressure measurement
    const closestRusherDist = getClosestRusherDist(qb)
    const pressureLevel = closestRusherDist < 0.06 ? 'high' : closestRusherDist < 0.12 ? 'medium' : 'low'

    // QB decision timing based on attributes
    const decisionMaking = attr(qb.roster, 'decision_making')
    const throwTiming = attr(qb.roster, 'throw_timing')
    const pocketAwareness = attr(qb.roster, 'pocket_awareness')

    // Base time before throw: faster decision-makers throw sooner
    const baseReadTime = 0.6 + (10 - decisionMaking) * 0.15 // 0.6s to 2.1s

    // Under pressure: throw earlier
    const pressureAdjust = pressureLevel === 'high' ? -0.5 : pressureLevel === 'medium' ? -0.2 : 0

    const readyToThrow = phaseTime >= (baseReadTime + pressureAdjust)

    if (readyToThrow || phaseTime >= PHASE_MAX.qb_reading) {
      const target = findThrowTarget(qb)
      if (target) {
        startThrow(qb, target)
      } else if (pressureLevel === 'high' || phaseTime >= PHASE_MAX.qb_reading) {
        // No one open, scramble
        endPlay('scramble', `${qb.canvas.name || 'QB'} scrambles — no open receiver`)
      }
    }
  }

  // ── Phase: Ball in air ─────────────────────────────────────────────────
  function tickBallInAir(dt: number) {
    runOffenseRoutes(dt)
    runDefense(dt)

    ballFlightElapsed += dt
    const t = Math.min(1, ballFlightElapsed / ballFlightTime)
    animatedBall.value.x = ballStartX + (ballTargetX - ballStartX) * t
    animatedBall.value.y = ballStartY + (ballTargetY - ballStartY) * t
    animatedBall.value.inFlight = true

    if (t >= 1 || phaseTime >= PHASE_MAX.ball_in_air) {
      // Catch attempt
      const target = getPlayer(throwTargetId)
      if (!target) {
        endPlay('incompletion', 'Incomplete — no target')
        return
      }
      resolveCatch(target)
    }
  }

  // ── Phase: After catch ─────────────────────────────────────────────────
  function tickAfterCatch(dt: number) {
    const carrier = players.find(p => p.hasBall)
    if (!carrier) { endPlay('completion', 'Play over'); return }

    // Carrier runs upfield (toward top = lower y)
    const carrierSpeed = speedToYPS(attr(carrier.roster, 'speed'))
    const afterCatchVision = attr(carrier.roster, 'after_catch_vision')
    const effectiveSpeed = ypsToNorm(carrierSpeed) * (0.85 + (afterCatchVision / 10) * 0.15)
    carrier.y -= effectiveSpeed * dt

    // Also continue route if not done
    if (!carrier.routeDone) {
      advanceAlongRoute(carrier, dt)
    }

    // Ball follows carrier
    animatedBall.value.x = carrier.x
    animatedBall.value.y = carrier.y
    animatedBall.value.inFlight = false

    // Defenders pursue carrier
    for (const def of players) {
      if (def.side !== 'defense') continue
      pursueTarget(def, carrier, dt, 1.15)
    }

    // Check flag pull
    for (const def of players) {
      if (def.side !== 'defense') continue
      const d = dist2d(def.x, def.y, carrier.x, carrier.y)
      if (d < 0.015) {
        const flagPull = attr(def.roster, 'flag_pull_technique')
        const evasion = (attr(carrier.roster, 'hip_drop') + attr(carrier.roster, 'agility')) / 2
        // Roll: higher flag_pull → higher chance
        const pullChance = 0.5 + (flagPull - evasion) * 0.05
        if (Math.random() < pullChance) {
          const carrierName = carrier.canvas.name || carrier.canvas.designation
          const defName = def.canvas.name || def.canvas.designation
          endPlay('completion', `Flag pulled by ${defName} on ${carrierName}!`, def.id)
          logEvent('flag_pull', `Flag pulled by ${defName}`, def.id)

          // Calculate yards gained
          const catchY = carrier.y
          resultYards = Math.round((losY - catchY) * fieldTotalLength)
          return
        }
      }
    }

    // Touchdown check (reached endzone: top endzone)
    const endzoneTopY = (fieldTotalLength - (fieldTotalLength - 0)) * yardsToNorm // top of field = 0
    if (carrier.y < yardsToNorm * 7) { // Within top endzone (approx endzone_size)
      const name = carrier.canvas.name || carrier.canvas.designation
      endPlay('touchdown', `TOUCHDOWN! ${name} scores!`, carrier.id)
      logEvent('touchdown', `TOUCHDOWN! ${name}`, carrier.id)
      resultYards = Math.round((losY - carrier.y) * fieldTotalLength)
      return
    }

    // Out of bounds check (x < 0.02 or x > 0.98)
    if (carrier.x < 0.02 || carrier.x > 0.98) {
      endPlay('completion', 'Out of bounds')
      resultYards = Math.round((losY - carrier.y) * fieldTotalLength)
      return
    }

    // Timeout
    if (phaseTime >= PHASE_MAX.after_catch) {
      endPlay('completion', 'Play ended')
      resultYards = Math.round((losY - carrier.y) * fieldTotalLength)
    }
  }

  // ── Shared movement helpers ────────────────────────────────────────────

  function runMotion(dt: number) {
    for (const p of players) {
      if (p.side !== 'offense' || p.motionDone) continue
      const speedAttr = attr(p.roster, 'speed')
      const motionSpeed = ypsToNorm(speedToYPS(speedAttr) * 0.65) // Motion is controlled
      p.motionDistTraveled += motionSpeed * dt
      if (p.motionDistTraveled >= p.motionTotalDist) {
        p.motionDistTraveled = p.motionTotalDist
        p.motionDone = true
        // Update position to motion end
        const end = p.motionPolyline[p.motionPolyline.length - 1]
        if (end) { p.x = end.x; p.y = end.y }
      } else {
        const pos = samplePolyline(p.motionPolyline, p.motionCumDist, p.motionDistTraveled)
        p.x = pos.x
        p.y = pos.y
      }
    }
  }

  function runOffenseRoutes(dt: number) {
    for (const p of players) {
      if (p.side !== 'offense') continue
      if (p.id === qbId || p.id === centerId) continue
      if (!p.motionDone) continue // Wait for motion to complete before running route
      if (p.routeDone) continue
      advanceAlongRoute(p, dt)
    }
  }

  function advanceAlongRoute(p: InternalPlayer, dt: number) {
    const speedAttr = attr(p.roster, 'speed')
    const routeRunning = attr(p.roster, 'route_running')
    const baseYPS = speedToYPS(speedAttr)
    const routeMul = 0.9 + (routeRunning / 10) * 0.1
    const normSpeed = ypsToNorm(baseYPS * routeMul)
    p.distanceTraveled += normSpeed * dt
    if (p.distanceTraveled >= p.totalRouteDist) {
      p.distanceTraveled = p.totalRouteDist
      p.routeDone = true
    }
    const pos = samplePolyline(p.polyline, p.cumulativeDist, p.distanceTraveled)
    p.x = pos.x
    p.y = pos.y
  }

  function runDefense(dt: number) {
    const qb = getPlayer(qbId)
    for (const def of players) {
      if (def.side !== 'defense') continue
      if (def.isRusher) {
        if (qb) rushQB(def, qb, dt)
      } else {
        coverZone(def, dt)
      }
    }
  }

  function rushQB(rusher: InternalPlayer, qb: InternalPlayer, dt: number) {
    const rushAttr = attr(rusher.roster, 'rush')
    const getOff = attr(rusher.roster, 'get_off_burst')
    const speedAttr = attr(rusher.roster, 'speed')
    const baseYPS = speedToYPS(speedAttr)
    const rushMul = 1.0 + (rushAttr / 10) * 0.2
    const burstMul = 1.0 + (getOff / 10) * 0.15
    const normSpeed = ypsToNorm(baseYPS * rushMul * burstMul)
    pursueTarget(rusher, qb, dt, 1.0, normSpeed)
  }

  function coverZone(def: InternalPlayer, dt: number) {
    const speedAttr = attr(def.roster, 'speed')
    const baseSpeed = ypsToNorm(speedToYPS(speedAttr))

    // First move to zone
    if (!def.reachedZone) {
      const d = dist2d(def.x, def.y, def.zoneX, def.zoneY)
      if (d < 0.015) {
        def.reachedZone = true
      } else {
        const step = baseSpeed * dt
        const dx = def.zoneX - def.x
        const dy = def.zoneY - def.y
        def.x += (dx / d) * Math.min(step, d)
        def.y += (dy / d) * Math.min(step, d)
        return
      }
    }

    // Once in zone, track nearest receiver in zone radius
    const coverageRadiusYards = def.canvas.coverageRadius ?? 5
    const coverageRadiusNorm = coverageRadiusYards * yardsToNorm
    const receivers = players.filter(p =>
      p.side === 'offense' && p.id !== qbId && p.id !== centerId
    )

    let closest: InternalPlayer | null = null
    let closestDist = Infinity
    for (const r of receivers) {
      const d = dist2d(r.x, r.y, def.zoneX, def.zoneY)
      if (d < coverageRadiusNorm && d < closestDist) {
        closest = r
        closestDist = d
      }
    }

    if (closest) {
      const coverage = attr(def.roster, 'coverage')
      const closingBurst = attr(def.roster, 'closing_burst')
      const coverMul = 0.95 + (coverage / 10) * 0.1
      const burstMul = 1.0 + (closingBurst / 10) * 0.1
      pursueTarget(def, closest, dt, coverMul * burstMul)
    }
  }

  function pursueTarget(chaser: InternalPlayer, target: InternalPlayer, dt: number, speedMul = 1.0, overrideSpeed?: number) {
    const d = dist2d(chaser.x, chaser.y, target.x, target.y)
    if (d < 0.003) return
    const speedAttr = attr(chaser.roster, 'speed')
    const normSpeed = overrideSpeed ?? ypsToNorm(speedToYPS(speedAttr))
    const step = normSpeed * speedMul * dt
    const dx = target.x - chaser.x
    const dy = target.y - chaser.y
    chaser.x += (dx / d) * Math.min(step, d)
    chaser.y += (dy / d) * Math.min(step, d)
  }

  function followQBWithBall() {
    const qb = getPlayer(qbId)
    if (qb?.hasBall) {
      animatedBall.value.x = qb.x
      animatedBall.value.y = qb.y
      animatedBall.value.inFlight = false
    }
  }

  // ── Sack check ─────────────────────────────────────────────────────────
  function checkSack(qb: InternalPlayer): InternalPlayer | null {
    for (const p of players) {
      if (!p.isRusher) continue
      const d = dist2d(p.x, p.y, qb.x, qb.y)
      if (d < 0.015) return p
    }
    return null
  }

  function getClosestRusherDist(qb: InternalPlayer): number {
    let min = Infinity
    for (const p of players) {
      if (!p.isRusher) continue
      min = Math.min(min, dist2d(p.x, p.y, qb.x, qb.y))
    }
    return min
  }

  // ── QB throw decision ──────────────────────────────────────────────────
  function findThrowTarget(qb: InternalPlayer): InternalPlayer | null {
    const receivers = players.filter(p =>
      p.side === 'offense' && p.id !== qbId && p.id !== centerId && p.totalRouteDist > 0
    )
    if (receivers.length === 0) return null

    // Calculate separation for each receiver
    const defenders = players.filter(p => p.side === 'defense')
    const receiverScores: { receiver: InternalPlayer; separation: number; readOrder: number }[] = []

    for (const r of receivers) {
      let minDefDist = Infinity
      for (const d of defenders) {
        minDefDist = Math.min(minDefDist, dist2d(r.x, r.y, d.x, d.y))
      }
      // Separation in yards
      const sepYards = minDefDist * fieldTotalLength

      // Read order (lower = earlier in progression)
      let readOrder = 999
      if (r.canvas.route?.segments) {
        for (const seg of r.canvas.route.segments) {
          if (seg.readOrder != null && seg.readOrder < readOrder) readOrder = seg.readOrder
        }
      }
      // Primary target gets highest priority
      if (r.canvas.primaryTarget) readOrder = 0

      receiverScores.push({ receiver: r, separation: sepYards, readOrder })
    }

    // Sort by read order, then by separation
    receiverScores.sort((a, b) => {
      if (a.readOrder !== b.readOrder) return a.readOrder - b.readOrder
      return b.separation - a.separation
    })

    const footballIQ = attr(qb.roster, 'football_iq')
    const openThreshold = 2.0 + (footballIQ / 10) * 1.5 // Better IQ = can see tighter windows

    // Follow progression
    for (const { receiver, separation } of receiverScores) {
      if (separation >= openThreshold) return receiver
    }

    // Under pressure: throw to most open receiver even if not super open
    const closestRusherDist = getClosestRusherDist(qb)
    if (closestRusherDist < 0.08) {
      const best = receiverScores.reduce((a, b) => a.separation > b.separation ? a : b)
      if (best.separation > 1.0) return best.receiver
    }

    return null
  }

  function startThrow(qb: InternalPlayer, target: InternalPlayer) {
    const throwPower = attr(qb.roster, 'throwing_power')
    const accuracy = attr(qb.roster, 'accuracy')

    // Lead the throw: predict where receiver will be
    const throwDistance = dist2d(qb.x, qb.y, target.x, target.y) * fieldTotalLength
    const throwYPS = 20 + (throwPower / 10) * 30 // 20-50 yd/s throw speed
    ballFlightTime = Math.max(0.15, throwDistance / throwYPS)

    // Predict receiver position
    const recSpeed = speedToYPS(attr(target.roster, 'speed'))
    const leadDist = recSpeed * ballFlightTime * yardsToNorm * 0.6 // 60% lead

    // Target position: receiver's current position + lead along their route direction
    let leadX = target.x
    let leadY = target.y
    if (!target.routeDone && target.totalRouteDist > 0) {
      const futurePos = samplePolyline(target.polyline, target.cumulativeDist,
        Math.min(target.distanceTraveled + leadDist, target.totalRouteDist))
      leadX = futurePos.x
      leadY = futurePos.y
    }

    // Add inaccuracy
    const inaccuracy = (10 - accuracy) * 0.003
    leadX += (Math.random() - 0.5) * inaccuracy
    leadY += (Math.random() - 0.5) * inaccuracy

    ballStartX = qb.x
    ballStartY = qb.y
    ballTargetX = leadX
    ballTargetY = leadY
    ballFlightElapsed = 0
    throwTargetId = target.id
    qb.hasBall = false

    animatedBall.value.inFlight = true
    transitionTo('ball_in_air')

    const qbName = qb.canvas.name || 'QB'
    const targetName = target.canvas.name || target.canvas.designation
    logEvent('throw', `${qbName} throws to ${targetName}`, target.id)
  }

  // ── Catch resolution ───────────────────────────────────────────────────
  function resolveCatch(target: InternalPlayer) {
    const catching = attr(target.roster, 'catching')
    const hands = attr(target.roster, 'hands_consistency')

    // Find nearest defender
    const defenders = players.filter(p => p.side === 'defense')
    let nearestDefDist = Infinity
    let nearestDef: InternalPlayer | null = null
    for (const d of defenders) {
      const dd = dist2d(d.x, d.y, target.x, target.y)
      if (dd < nearestDefDist) { nearestDefDist = dd; nearestDef = d }
    }

    const sepYards = nearestDefDist * fieldTotalLength
    const isContested = sepYards < 2

    // Base catch probability
    let catchProb = 0.5 + ((catching + hands) / 20) * 0.35 // 50%-85%

    // Contested catch reduction
    if (isContested && nearestDef) {
      const defCoverage = attr(nearestDef.roster, 'coverage')
      const defBallSkills = attr(nearestDef.roster, 'ball_skills_defensive')
      const contestedCatch = attr(target.roster, 'contested_catch')
      catchProb *= 0.5 + (contestedCatch - (defCoverage + defBallSkills) / 2) * 0.05
    }

    // Separation bonus
    if (sepYards > 3) catchProb += 0.1
    if (sepYards > 5) catchProb += 0.1

    catchProb = Math.max(0.1, Math.min(0.95, catchProb))

    // Interception chance (only when contested)
    let intProb = 0
    if (isContested && nearestDef) {
      const ballHawking = attr(nearestDef.roster, 'ball_hawking')
      intProb = 0.02 + (ballHawking / 10) * 0.08 // 2%-10%
    }

    const roll = Math.random()
    const targetName = target.canvas.name || target.canvas.designation

    if (roll < intProb && nearestDef) {
      // Interception
      const defName = nearestDef.canvas.name || nearestDef.canvas.designation
      nearestDef.hasBall = true
      endPlay('interception', `Intercepted by ${defName}!`, nearestDef.id)
      logEvent('interception', `Intercepted by ${defName}`, nearestDef.id)
    } else if (roll < intProb + (1 - catchProb)) {
      // Incompletion
      endPlay('incompletion', `Incomplete — ${targetName} couldn't hold on`)
      logEvent('incompletion', `Incomplete pass to ${targetName}`)
    } else {
      // Catch!
      target.hasBall = true
      animatedBall.value.x = target.x
      animatedBall.value.y = target.y
      animatedBall.value.inFlight = false
      transitionTo('after_catch')
      logEvent('catch', `Caught by ${targetName}!`, target.id)
      resultYards = Math.round((losY - target.y) * fieldTotalLength)
    }
  }

  // ── State management helpers ───────────────────────────────────────────

  function transitionTo(phase: SimulationPhase) {
    simulationState.value = phase
    phaseTime = 0
  }

  function endPlay(result: PlayOutcome, message: string, playerId?: string) {
    outcome = result
    transitionTo('play_over')
    logEvent(result === 'completion' || result === 'touchdown' ? 'info' : result as any, message, playerId)
  }

  function syncPositions() {
    const map = new Map<string, { x: number; y: number }>()
    for (const p of players) {
      map.set(p.id, { x: p.x, y: p.y })
    }
    animatedPositions.value = map
  }

  function getPlayer(id: string | null): InternalPlayer | null {
    if (!id) return null
    return players.find(p => p.id === id) ?? null
  }

  function logEvent(type: SimulationEvent['type'], message: string, playerId?: string) {
    events.value = [...events.value, { time: currentTime, type, message, playerId }]
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return {
    animatedPositions,
    animatedBall,
    simulationState,
    events,
    isRunning,
    playbackSpeed,
    initialize,
    start,
    pause,
    reset,
    /** Get result after play_over */
    getResult: () => outcome ? { outcome, yards: resultYards, events: events.value } : null,
  }
}
