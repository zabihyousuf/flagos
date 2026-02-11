import type { CanvasPlayer, CanvasPoint, RouteSegment } from '~/lib/types'
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

    player.route.segments.forEach((seg, index) => {
      let segmentDist = 0
      
      if (seg.type === 'curve') {
        // Curve distance: from last point through all segment points
        const allPoints = [lastPt, ...seg.points]
        segmentDist = calculateCurveDistance(allPoints, field_width, totalLength)
      } else {
        // Straight/Option: straight lines
        const allPoints = [lastPt, ...seg.points]
        segmentDist = calculateCurveDistance(allPoints, field_width, totalLength)
      }

      // Time calculation
      // Simplified: distance / maxSpeed
      // Apply acceleration penalty to first 5 yards of TOTAL route
      let time = segmentDist / maxSpeed

      // If it's the start, add acceleration penalty
      if (totalDistance < ACCEL_DISTANCE) {
        // Assume avg speed during accel is 70% of max
        // Distance remaining in accel phase
        const accelDistRemaining = ACCEL_DISTANCE - totalDistance
        const distInAccel = Math.min(segmentDist, accelDistRemaining)
        
        // Time adjustment: time = dist / (0.7 * speed) - dist / speed
        // Delta = dist/speed * (1/0.7 - 1) = dist/speed * 0.428
        time += (distInAccel / maxSpeed) * 0.43
      }

      // Cut penalty if not the first segment and not a curve following a curve (smooth)
      if (index > 0 && seg.type !== 'curve') {
        // Hard cut
        time += CUT_PENALTY_BASE * cutEfficiency
      }

      cumulativeTime += time
      totalDistance += segmentDist
      
      segments.push({
        distance: segmentDist,
        duration: time,
        cumulativeTime: cumulativeTime,
        type: seg.type,
        isCut: index > 0 && seg.type !== 'curve'
      })

      if (seg.points.length > 0) {
        lastPt = seg.points[seg.points.length - 1]
      }
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

  return {
    analyzeRoute,
    generateRandomRoute
  }
}
