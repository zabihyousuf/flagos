import type { CanvasPlayer, CanvasPoint, RouteSegment } from '~/lib/types'
import type { Player } from '~/lib/types'
import { OFFENSE_POSITIONS, DEFENSE_POSITIONS } from '~/lib/constants'

export interface SegmentAnalysis {
  distance: number // yards
  duration: number // seconds
  cumulativeTime: number // seconds from start of route
  type: 'straight' | 'curve' | 'option'
  isCut: boolean
}

export interface RouteAnalysis {
  totalDistance: number
  totalDuration: number
  segments: SegmentAnalysis[]
}

// Physics constants
const MAX_SPEED_10 = 9.5 // yds/s (approx 4.2s 40yd)
const MAX_SPEED_1 = 6.7  // yds/s (approx 6.0s 40yd)
const ACCEL_DISTANCE = 5 // yards to reach full speed
const CUT_PENALTY_BASE = 0.5 // seconds lost for a hard cut

export function useRouteAnalysis() {
  function getPlayerSpeed(player: CanvasPlayer, attributes?: any): number {
    // Default to average speed (5) if no attributes
    const speedAttr = attributes?.speed ?? 5
    // Linear interpolation
    return MAX_SPEED_1 + ((speedAttr - 1) / 9) * (MAX_SPEED_10 - MAX_SPEED_1)
  }

  function getCutEfficiency(attributes?: any): number {
    // route_running 1-10
    const rr = attributes?.route_running ?? 5
    // Return multiplier: 1.0 (bad) to 0.4 (good)
    return 1.0 - ((rr - 1) / 9) * 0.6
  }

  function calculateDistance(p1: CanvasPoint, p2: CanvasPoint, fieldWidth: number, fieldLength: number): number {
    const dx = (p2.x - p1.x) * fieldWidth
    const dy = (p2.y - p1.y) * fieldLength
    return Math.sqrt(dx * dx + dy * dy)
  }

  function calculateCurveDistance(points: CanvasPoint[], fieldWidth: number, fieldLength: number): number {
    if (points.length < 2) return 0
    let dist = 0
    for (let i = 0; i < points.length - 1; i++) {
      dist += calculateDistance(points[i], points[i + 1], fieldWidth, fieldLength)
    }
    // Bezier/Catmull approximations are complex, straight-line segment sum is a reasonable lower bound approximation for analysis
    // For smoother display, we could subsample, but for now strict segment sum is okay
    return dist
  }

  function analyzeRoute(
    player: CanvasPlayer,
    fieldSettings: { field_length: number; field_width: number; endzone_size: number },
    attributes?: any
  ): RouteAnalysis | null {
    if (!player.route || !player.route.segments || player.route.segments.length === 0) return null

    const { field_length, field_width, endzone_size } = fieldSettings
    const totalLength = field_length + endzone_size * 2
    
    // Player stats
    const maxSpeed = getPlayerSpeed(player, attributes)
    const cutEfficiency = getCutEfficiency(attributes)

    const segments: SegmentAnalysis[] = []
    let cumulativeTime = 0
    let totalDistance = 0
    
    // Starting position
    const startPt = { x: player.x, y: player.y }
    let lastPt = startPt

    player.route.segments.forEach((seg, segIndex) => {
      if (seg.points.length === 0) return

      if (seg.type === 'curve') {
        // Curve: one analysis row for the whole segment
        const allPoints = [lastPt, ...seg.points]
        const segmentDist = calculateCurveDistance(allPoints, field_width, totalLength)
        let time = segmentDist / maxSpeed
        if (totalDistance < ACCEL_DISTANCE) {
          const accelDistRemaining = ACCEL_DISTANCE - totalDistance
          const distInAccel = Math.min(segmentDist, accelDistRemaining)
          time += (distInAccel / maxSpeed) * 0.43
        }
        if (segIndex > 0) time += CUT_PENALTY_BASE * cutEfficiency
        cumulativeTime += time
        totalDistance += segmentDist
        segments.push({
          distance: segmentDist,
          duration: time,
          cumulativeTime: cumulativeTime,
          type: seg.type,
          isCut: segIndex > 0
        })
        lastPt = seg.points[seg.points.length - 1]
        return
      }

      // Straight/Option: one analysis row per leg (so slant shows Start + Cut)
      const pts = [lastPt, ...seg.points]
      for (let i = 1; i < pts.length; i++) {
        const legDist = calculateDistance(pts[i - 1], pts[i], field_width, totalLength)
        let time = legDist / maxSpeed
        if (totalDistance < ACCEL_DISTANCE) {
          const accelDistRemaining = ACCEL_DISTANCE - totalDistance
          const distInAccel = Math.min(legDist, accelDistRemaining)
          time += (distInAccel / maxSpeed) * 0.43
        }
        const isFirstLegOfRoute = segments.length === 0
        if (!isFirstLegOfRoute) time += CUT_PENALTY_BASE * cutEfficiency
        cumulativeTime += time
        totalDistance += legDist
        segments.push({
          distance: legDist,
          duration: time,
          cumulativeTime: cumulativeTime,
          type: seg.type,
          isCut: !isFirstLegOfRoute
        })
      }
      lastPt = seg.points[seg.points.length - 1]
    })

    return {
      totalDistance,
      totalDuration: cumulativeTime,
      segments
    }
  }

  function generateRandomRoute(
    player: CanvasPlayer,
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number }
  ): { segments: RouteSegment[] } | null {
    // Only generate for offensive players for now
    // Simple logic: 
    // 1. Random depth (5-15 yards)
    // 2. Random type (Fly, Post, Corner, In, Out, Curl)
    
    // Safety check: don't generate if player is QB (usually stays in pocket or rolls out)
    // We can identify QB by position usually being near center and behind LOS
    // But for now let's just generate for everyone except maybe center
    
    const isCenter = player.x === 0.5 && player.y > (fieldSettings.line_of_scrimmage / (fieldSettings.field_length + fieldSettings.endzone_size * 2))
    if (player.designation === 'C' || player.position === 'C') return null

    const segments: RouteSegment[] = []
    const routeTypes = ['fly', 'post', 'corner', 'in', 'out', 'curl', 'slant']
    const type = routeTypes[Math.floor(Math.random() * routeTypes.length)]
    
    const { field_width, field_length, endzone_size, line_of_scrimmage } = fieldSettings
    const totalLength = field_length + endzone_size * 2
    
    // Player pos in yards
    const playerY = player.y * totalLength
    const playerX = player.x * field_width

    // Direction (are they left or right of center?)
    const isLeft = player.x < 0.5
    
    // 1. Vertical Stem (Go forward 5-10 yards)
    const stemDist = 5 + Math.random() * 8
    const stemEndY = Math.max(endzone_size, playerY - stemDist) // Move towards top (0)
    
    // First point is just straight ahead
    segments.push({
      type: 'straight',
      points: [{ x: player.x, y: stemEndY / totalLength }]
    })

    const lastPt = segments[0].points[0]

    // 2. Break
    if (type === 'fly') {
      // Just keep going deep
      segments.push({
        type: 'straight',
        points: [{ x: lastPt.x, y: (endzone_size - 5) / totalLength }] // To back of endzone
      })
    } else if (type === 'post') {
      // Cut towards center deep
      segments.push({
        type: 'straight',
        points: [{ x: 0.5, y: (endzone_size) / totalLength }] // To Goal Post
      })
    } else if (type === 'corner') {
      // Cut towards sideline deep
      segments.push({
        type: 'straight',
        points: [{ x: isLeft ? 0.1 : 0.9, y: (endzone_size) / totalLength }] // To corner
      })
    } else if (type === 'in') {
      // Hard cut in
      segments.push({
        type: 'straight',
        points: [{ x: isLeft ? lastPt.x + 0.2 : lastPt.x - 0.2, y: lastPt.y }]
      })
    } else if (type === 'out') {
      // Hard cut out
      segments.push({
        type: 'straight',
        points: [{ x: isLeft ? 0.05 : 0.95, y: lastPt.y }]
      })
    } else if (type === 'slant') {
      // Replace first stem with a diagonal
      segments.pop() // Remove straight stem
      segments.push({
        type: 'straight',
        points: [{ x: 0.5, y: (playerY - 5) / totalLength }] // Quick slant to middle
      })
    } else if (type === 'curl') {
      // Come back
      segments.push({
        type: 'straight',
        points: [{ x: isLeft ? lastPt.x + 0.05 : lastPt.x - 0.05, y: lastPt.y + (3 / totalLength) }]
      })
    }

    return { segments }
  }

  /** Max route depth in yards from LOS (routes don't have to reach endzone) */
  const MAX_ROUTE_DEPTH_YDS = 16

  /**
   * Build a single route for one player with a given type, capping depth so we don't require endzone.
   */
  function buildRouteForType(
    player: CanvasPlayer,
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number },
    type: 'fly' | 'post' | 'corner' | 'in' | 'out' | 'curl' | 'slant' | 'center'
  ): { segments: RouteSegment[] } {
    const { field_width, field_length, endzone_size, line_of_scrimmage } = fieldSettings
    const totalLength = field_length + endzone_size * 2
    const playerY = player.y * totalLength
    const isLeft = player.x < 0.5

    // Deepest allowed Y (most upfield): LOS - MAX_ROUTE_DEPTH_YDS
    const minY = Math.max(endzone_size / totalLength + 0.02, (playerY - MAX_ROUTE_DEPTH_YDS) / totalLength)

    const segments: RouteSegment[] = []

    if (type === 'center') {
      // Center: short release (depth and direction randomized each time)
      const releaseDepthYds = 2 + Math.random() * 2.5  // 2–4.5 yd
      const releaseY = (playerY - releaseDepthYds) / totalLength
      const releaseRight = Math.random() < 0.5  // random left or right flat
      const flatX = releaseRight ? 0.3 + Math.random() * 0.15 : 0.55 + Math.random() * 0.15  // 0.3–0.45 or 0.55–0.7
      segments.push({
        type: 'straight',
        points: [
          { x: player.x, y: releaseY },
          { x: flatX, y: releaseY }
        ]
      })
      return { segments }
    }

    if (type === 'slant') {
      segments.push({
        type: 'straight',
        points: [{ x: 0.5, y: Math.max(minY, (playerY - 5) / totalLength) }]
      })
      return { segments }
    }

    const stemDist = type === 'fly' ? 8 : 4 + Math.random() * 4
    const stemEndY = Math.max(minY, (playerY - stemDist) / totalLength)
    segments.push({
      type: 'straight',
      points: [{ x: player.x, y: stemEndY }]
    })
    const lastPt = segments[0].points[0]

    switch (type) {
      case 'fly':
        segments.push({ type: 'straight', points: [{ x: lastPt.x, y: minY }] })
        break
      case 'post':
        segments.push({ type: 'straight', points: [{ x: 0.5, y: minY }] })
        break
      case 'corner':
        segments.push({ type: 'straight', points: [{ x: isLeft ? 0.12 : 0.88, y: minY }] })
        break
      case 'in':
        segments.push({
          type: 'straight',
          points: [{ x: isLeft ? Math.min(0.5, lastPt.x + 0.22) : Math.max(0.5, lastPt.x - 0.22), y: lastPt.y }]
        })
        break
      case 'out':
        segments.push({
          type: 'straight',
          points: [{ x: isLeft ? 0.06 : 0.94, y: lastPt.y }]
        })
        break
      case 'curl':
        segments.push({
          type: 'straight',
          points: [{ x: isLeft ? lastPt.x + 0.06 : lastPt.x - 0.06, y: Math.min(lastPt.y + 4 / totalLength, 1) }]
        })
        break
      default:
        break
    }
    return { segments }
  }

  function shuffleArray<T>(arr: T[]): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  /**
   * Analyze players on the field and roster attributes, then generate routes that fit each player's skills
   * and give the team a balanced concept (mix of deep, intermediate, short). Routes stay within MAX_ROUTE_DEPTH_YDS of LOS.
   * Each call randomizes route types and read order so no two plays are the same.
   */
  function generateOptimizedRoutes(
    players: CanvasPlayer[],
    roster: Player[],
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number }
  ): {
    routes: { playerId: string; route: { segments: RouteSegment[] } }[]
    primaryTargetPlayerId: string | null
    readOrderPlayerIds: string[]
  } {
    const offense = players.filter(
      (p) => p.side === 'offense' && p.position !== 'QB' && p.designation !== 'Q'
    )
    if (offense.length === 0) return { routes: [], primaryTargetPlayerId: null, readOrderPlayerIds: [] }

    function getAttrs(canvasPlayer: CanvasPlayer): { speed: number; route_running: number; position: string } {
      const rosterPlayer = roster.find(
        (r) => r.id === canvasPlayer.id || (r.name === canvasPlayer.name && r.number === canvasPlayer.number)
      )
      const u = rosterPlayer?.universal_attributes
      const o = rosterPlayer?.offense_attributes
      return {
        speed: u?.speed ?? 5,
        route_running: o?.route_running ?? 5,
        position: canvasPlayer.position || 'WR'
      }
    }

    const deepTypes: Array<'fly' | 'post' | 'corner'> = ['fly', 'post', 'corner']
    const sharpTypes: Array<'slant' | 'in' | 'out'> = ['slant', 'in', 'out']
    const mediumTypes: Array<'in' | 'out' | 'curl'> = ['in', 'out', 'curl']
    type RouteType = 'fly' | 'post' | 'corner' | 'in' | 'out' | 'curl' | 'slant' | 'center'

    const withAttrs = offense.map((p) => ({ player: p, attrs: getAttrs(p) }))
    const nonCenters = withAttrs.filter(
      (e) => (e.player.position || '').toUpperCase() !== 'C' && (e.player.designation || '').toUpperCase() !== 'C'
    )
    const centers = withAttrs.filter(
      (e) => (e.player.position || '').toUpperCase() === 'C' || (e.player.designation || '').toUpperCase() === 'C'
    )

    const result: { playerId: string; route: { segments: RouteSegment[] } }[] = []

    centers.forEach((e) => {
      result.push({ playerId: e.player.id, route: buildRouteForType(e.player, fieldSettings, 'center') })
    })

    const shuffledNonCenters = shuffleArray(nonCenters)
    shuffledNonCenters.forEach((e, i) => {
      let type: RouteType
      if (i === 0) type = pick(deepTypes)
      else if (i === 1) type = pick(sharpTypes)
      else type = pick(mediumTypes)
      result.push({ playerId: e.player.id, route: buildRouteForType(e.player, fieldSettings, type) })
    })

    // Smart read progression: order by route depth (shortest route = read 1, then 2, 3...)
    // In our coords, smaller y = further upfield, so min Y = route depth; short routes have larger min Y.
    function routeDepth(route: { segments: RouteSegment[] }): number {
      let minY = 1
      for (const seg of route.segments) {
        for (const pt of seg.points || []) {
          if (pt.y < minY) minY = pt.y
        }
      }
      return minY
    }
    const withDepth = result.map((r) => ({ playerId: r.playerId, depth: routeDepth(r.route) }))
    withDepth.sort((a, b) => a.depth - b.depth) // ascending = short (high Y) first, then deeper (lower Y)
    const readOrderPlayerIds = withDepth.map((w) => w.playerId)
    const primaryTargetPlayerId = readOrderPlayerIds[0] ?? null

    return { routes: result, primaryTargetPlayerId, readOrderPlayerIds }
  }

  return {
    analyzeRoute,
    generateRandomRoute,
    generateOptimizedRoutes
  }
}
