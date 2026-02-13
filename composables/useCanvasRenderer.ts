import type { CanvasData, CanvasPlayer, CanvasPoint, RouteSegment } from '~/lib/types'
import { POSITION_COLORS } from '~/lib/constants'

export interface RenderOptions {
  fieldLength: number
  fieldWidth: number
  endzoneSize: number
  lineOfScrimmage: number
  /** Yard line for first down (from user settings); defaults to midfield if not set */
  firstDownYardLine?: number
  zoom: number
  panOffset: { x: number; y: number }
  selectedPlayerId: string | null
  viewMode?: 'fit' | 'full'
  playType?: 'offense' | 'defense'
  /** Overlay defense from another play (drawn as ghost, not interactive) */
  ghostPlayers?: CanvasPlayer[]
}

const PADDING = 12
const FIT_VISIBLE_YARDS = 24

const COLORS = {
  background: 'transparent',
  fieldFill: '#2d7a2d',
  fieldBorder: '#1e6b1e',
  yardLine: 'rgba(255,255,255,0.6)',
  yardLineLight: 'rgba(255,255,255,0.25)',
  yardNumber: 'rgba(255,255,255,0.7)',
  hashMark: 'rgba(255,255,255,0.3)',
  endzoneFill: '#245e24',
  endzoneBorder: 'rgba(255,255,255,0.4)',
  endzoneText: 'rgba(255,255,255,0.25)',
  los: '#22d3ee',
  firstDown: '#fbbf24',
  nrz: 'rgba(251, 191, 36, 0.08)',
  nrzBorder: 'rgba(251, 191, 36, 0.3)',
}

/**
 * Compute the aspect-ratio-correct field rectangle that fits within the canvas.
 * Always computed at zoom=1 (base coordinates). View transforms handle zoom.
 */
export function computeFieldRect(
  logicalW: number,
  logicalH: number,
  options: { fieldLength: number; fieldWidth: number; endzoneSize: number; zoom?: number },
) {
  const totalLength = options.fieldLength + options.endzoneSize * 2
  const aspectRatio = options.fieldWidth / totalLength

  const availW = logicalW - PADDING * 2
  const availH = logicalH - PADDING * 2

  let fieldW: number
  let fieldH: number

  if (availW / availH > aspectRatio) {
    fieldH = availH
    fieldW = fieldH * aspectRatio
  } else {
    fieldW = availW
    fieldH = fieldW / aspectRatio
  }

  const offsetX = (logicalW - fieldW) / 2
  const offsetY = (logicalH - fieldH) / 2

  return { offsetX, offsetY, fieldW, fieldH, totalLength }
}

/**
 * Compute the effective zoom and pan for a given view mode.
 * - 'full': Shows the entire field (zoom=1, no pan)
 * - 'fit': Zooms into ~24 yards centered on the line of scrimmage
 */
export function computeViewTransform(
  logicalW: number,
  logicalH: number,
  fieldRect: { offsetX: number; offsetY: number; fieldW: number; fieldH: number; totalLength: number },
  options: { fieldLength: number; endzoneSize: number; lineOfScrimmage: number; viewMode?: 'fit' | 'full' },
): { zoom: number; panX: number; panY: number } {
  if (options.viewMode === 'fit') {
    const yardHeight = fieldRect.fieldH / fieldRect.totalLength
    const fitZoom = logicalH / (FIT_VISIBLE_YARDS * yardHeight)

    const fieldCenterX = fieldRect.offsetX + fieldRect.fieldW / 2
    const losY = fieldRect.offsetY + yardHeight * (options.endzoneSize + options.fieldLength - options.lineOfScrimmage)

    const panX = logicalW / 2 - fieldCenterX * fitZoom
    const panY = logicalH / 2 - losY * fitZoom

    return { zoom: fitZoom, panX, panY }
  }

  // Full mode — no extra transform
  return { zoom: 1, panX: 0, panY: 0 }
}

export function useCanvasRenderer() {
  function render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: CanvasData,
    options: RenderOptions,
  ) {
    const dpr = window.devicePixelRatio || 1
    const logicalW = canvas.width / dpr
    const logicalH = canvas.height / dpr

    const fieldRect = computeFieldRect(logicalW, logicalH, options)
    const { offsetX, offsetY, fieldW, fieldH } = fieldRect

    const view = computeViewTransform(logicalW, logicalH, fieldRect, options)

    // Combine view transform with user zoom/pan
    const effectiveZoom = view.zoom * options.zoom
    const effectivePanX = view.panX + options.panOffset.x
    const effectivePanY = view.panY + options.panOffset.y

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()

    ctx.scale(dpr, dpr)
    ctx.translate(effectivePanX, effectivePanY)
    ctx.scale(effectiveZoom, effectiveZoom)

    ctx.save()
    ctx.translate(offsetX, offsetY)

    drawField(ctx, fieldW, fieldH, options)
    // Draw routes behind players
    data.players.forEach((player) => {
      drawPlayerRoute(ctx, player, fieldW, fieldH)
      drawMotionPath(ctx, player, fieldW, fieldH)
    })
    
    if (options.playType === 'defense') {
      drawGhostQB(ctx, fieldW, fieldH, options)
      drawCoverageZones(ctx, data.players, fieldW, fieldH, options)
    }

    // Ghost defense overlay (from another play): routes first, then players
    if (options.ghostPlayers?.length) {
      const qb = data.players.find(
        (p) => p.side === 'offense' && (p.position === 'QB' || p.designation === 'Q')
      )
      const qbPosition = qb ? { x: qb.x, y: qb.y } : null
      options.ghostPlayers.forEach((player) => {
        const isRusher = player.designation === 'R' || player.position === 'RSH'
        const hasRoute = player.route?.segments?.length
        if (hasRoute || (isRusher && qbPosition)) {
          drawGhostPlayerRoute(ctx, player, fieldW, fieldH, qbPosition)
        }
      })
      drawGhostPlayers(ctx, options.ghostPlayers, fieldW, fieldH, options)
    }

    // Draw players on top
    drawPlayers(ctx, data.players, fieldW, fieldH, options)

    ctx.restore()
    ctx.restore()
  }

  function drawField(
    ctx: CanvasRenderingContext2D,
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const { fieldLength, endzoneSize, lineOfScrimmage, firstDownYardLine } = options
    const totalLength = fieldLength + endzoneSize * 2
    const yardHeight = fieldH / totalLength

    // Field fill
    ctx.fillStyle = COLORS.fieldFill
    ctx.fillRect(0, yardHeight * endzoneSize, fieldW, yardHeight * fieldLength)

    // Endzones
    ctx.fillStyle = COLORS.endzoneFill
    ctx.fillRect(0, 0, fieldW, yardHeight * endzoneSize)
    ctx.fillRect(0, fieldH - yardHeight * endzoneSize, fieldW, yardHeight * endzoneSize)

    // Endzone text
    ctx.fillStyle = COLORS.endzoneText
    const ezFontSize = Math.max(12, fieldW * 0.05)
    ctx.font = `700 ${ezFontSize}px Oracle Sans, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = `${ezFontSize * 0.3}px`
    ctx.fillText('END ZONE', fieldW / 2, (yardHeight * endzoneSize) / 2)
    ctx.fillText('END ZONE', fieldW / 2, fieldH - (yardHeight * endzoneSize) / 2)
    ctx.letterSpacing = '0px'

    // Field border
    ctx.strokeStyle = COLORS.fieldBorder
    ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, fieldW, fieldH)

    // Endzone separation lines
    ctx.strokeStyle = COLORS.endzoneBorder
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, yardHeight * endzoneSize)
    ctx.lineTo(fieldW, yardHeight * endzoneSize)
    ctx.moveTo(0, fieldH - yardHeight * endzoneSize)
    ctx.lineTo(fieldW, fieldH - yardHeight * endzoneSize)
    ctx.stroke()

    // Yard lines every 5 yards
    ctx.setLineDash([])
    for (let yard = 5; yard < fieldLength; yard += 5) {
      const y = yardHeight * (endzoneSize + yard)
      const isMajor = yard % 10 === 0

      ctx.strokeStyle = isMajor ? COLORS.yardLine : COLORS.yardLineLight
      ctx.lineWidth = isMajor ? 1 : 0.7
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(fieldW, y)
      ctx.stroke()

      const displayYard = yard <= fieldLength / 2 ? yard : fieldLength - yard
      if (displayYard > 0 && isMajor) {
        ctx.fillStyle = COLORS.yardNumber
        const numFontSize = Math.max(10, fieldW * 0.035)
        ctx.font = `600 ${numFontSize}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${displayYard}`, 20, y)
        ctx.fillText(`${displayYard}`, fieldW - 20, y)
      }
    }

    // Hash marks every yard
    ctx.strokeStyle = COLORS.hashMark
    ctx.lineWidth = 0.7
    for (let yard = 1; yard < fieldLength; yard++) {
      if (yard % 5 === 0) continue
      const y = yardHeight * (endzoneSize + yard)
      ctx.beginPath()
      ctx.moveTo(fieldW * 0.33, y)
      ctx.lineTo(fieldW * 0.33 + 6, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(fieldW * 0.67 - 6, y)
      ctx.lineTo(fieldW * 0.67, y)
      ctx.stroke()
    }

    // Line of Scrimmage
    const losY = yardHeight * (endzoneSize + fieldLength - lineOfScrimmage)
    ctx.save()
    ctx.shadowColor = COLORS.los
    ctx.shadowBlur = 4
    ctx.strokeStyle = COLORS.los
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(0, losY)
    ctx.lineTo(fieldW, losY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

     // LOS pill label
    const labelFontSize = Math.max(9, fieldW * 0.022)
    ctx.font = `600 ${labelFontSize}px Oracle Sans, sans-serif`
    const losText = `LOS · ${lineOfScrimmage}yd`
    const losTextW = ctx.measureText(losText).width
    const pillPx = 7
    const pillPy = 3
    const pillR = 4

    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)'
    ctx.beginPath()
    ctx.roundRect(5, losY + 5, losTextW + pillPx * 2, labelFontSize + pillPy * 2, pillR)
    ctx.fill()
    ctx.fillStyle = COLORS.los
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(losText, 5 + pillPx, losY + 5 + pillPy)


    // First Down Line (from user settings, or midfield)
    const firstDownYard = firstDownYardLine ?? fieldLength / 2
    const midY = yardHeight * (endzoneSize + firstDownYard)
    ctx.save()
    ctx.shadowColor = COLORS.firstDown
    ctx.shadowBlur = 3
    ctx.strokeStyle = COLORS.firstDown
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(fieldW, midY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // 1st down pill label
    const fdText = '1ST DOWN'
    const fdTextW = ctx.measureText(fdText).width
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)'
    ctx.beginPath()
    ctx.roundRect(fieldW - fdTextW - pillPx * 2 - 5, midY + 5, fdTextW + pillPx * 2, labelFontSize + pillPy * 2, pillR)
    ctx.fill()
    ctx.fillStyle = COLORS.firstDown
    ctx.font = `600 ${labelFontSize}px Oracle Sans, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(fdText, fieldW - fdTextW - pillPx - 5, midY + 5 + pillPy)

    // No-Run Zones
    const nrzZones = [
      { start: 0, end: 5 },
      { start: fieldLength - 5, end: fieldLength },
    ]
    nrzZones.forEach(zone => {
      const zoneStartY = yardHeight * (endzoneSize + zone.start)
      const zoneEndY = yardHeight * (endzoneSize + zone.end)
      ctx.fillStyle = COLORS.nrz
      ctx.fillRect(0, zoneStartY, fieldW, zoneEndY - zoneStartY)
      ctx.strokeStyle = COLORS.nrzBorder
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      if (zone.start > 0) {
        ctx.moveTo(0, zoneStartY)
        ctx.lineTo(fieldW, zoneStartY)
      }
      ctx.moveTo(0, zoneEndY)
      ctx.lineTo(fieldW, zoneEndY)
      ctx.stroke()
      ctx.setLineDash([])
    })
  }

  // ─── Route rendering ──────────────────────────────────

  function drawPlayerRoute(
    ctx: CanvasRenderingContext2D,
    player: CanvasPlayer,
    fieldW: number,
    fieldH: number,
  ) {
    if (!player.route || !player.route.segments || player.route.segments.length === 0) return

    const startX = player.x * fieldW
    const startY = player.y * fieldH
    const color = POSITION_COLORS[player.position] ?? '#888888'

    let lastEndPoint = { x: startX, y: startY }

    player.route.segments.forEach((segment) => {
      if (segment.points.length === 0) return

      const points = segment.points.map((p) => ({
        x: p.x * fieldW,
        y: p.y * fieldH,
      }))

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = segment.type === 'option' ? 2 : 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (segment.type === 'option') {
        ctx.setLineDash([6, 4])
      }

      ctx.beginPath()
      ctx.moveTo(lastEndPoint.x, lastEndPoint.y)

      if (segment.type === 'curve') {
        drawCurveSegment(ctx, lastEndPoint, points)
      } else {
        // Straight or option — straight lines between points
        points.forEach((p) => ctx.lineTo(p.x, p.y))
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Arrowhead at the end
      if (points.length > 0) {
        const lastPt = points[points.length - 1]
        const prevPt = points.length > 1 ? points[points.length - 2] : lastEndPoint
        drawArrowHead(ctx, prevPt, lastPt, color, segment.type === 'option' ? 8 : 10)
      }

      // Read order badge
      if (segment.readOrder != null && points.length > 0) {
        const endPt = points[points.length - 1]
        drawReadOrderBadge(ctx, endPt, segment.readOrder)
      }

      ctx.restore()

      // Chain: next segment starts from the last point of this one
      if (segment.type !== 'option' && points.length > 0) {
        lastEndPoint = points[points.length - 1]
      }
    })
  }

  /**
   * Draw a smooth curve through points using Catmull-Rom → Cubic Bezier conversion
   */
  function drawCurveSegment(
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    points: { x: number; y: number }[],
  ) {
    if (points.length === 1) {
      // Just one point — quadratic curve
      const mid = { x: (start.x + points[0].x) / 2, y: (start.y + points[0].y) / 2 }
      ctx.quadraticCurveTo(mid.x, mid.y, points[0].x, points[0].y)
      return
    }

    // Build full path: [start, ...points]
    const allPts = [start, ...points]
    const alpha = 0.5 // Centripetal Catmull-Rom

    for (let i = 0; i < allPts.length - 1; i++) {
      const p0 = allPts[Math.max(0, i - 1)]
      const p1 = allPts[i]
      const p2 = allPts[i + 1]
      const p3 = allPts[Math.min(allPts.length - 1, i + 2)]

      // Convert Catmull-Rom to cubic bezier control points
      const d1 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2) ** alpha || 1
      const d2 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) ** alpha || 1
      const d3 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2) ** alpha || 1

      const cp1x = p1.x + (p2.x - p0.x) / (3 * d1 / d2 + 3)
      const cp1y = p1.y + (p2.y - p0.y) / (3 * d1 / d2 + 3)
      const cp2x = p2.x - (p3.x - p1.x) / (3 * d3 / d2 + 3)
      const cp2y = p2.y - (p3.y - p1.y) / (3 * d3 / d2 + 3)

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
    }
  }

  function drawMotionPath(
    ctx: CanvasRenderingContext2D,
    player: CanvasPlayer,
    fieldW: number,
    fieldH: number,
  ) {
    if (!player.motionPath || player.motionPath.length === 0) return

    const startX = player.x * fieldW
    const startY = player.y * fieldH
    const color = POSITION_COLORS[player.position] ?? '#888888'

    const points = player.motionPath.map((p) => ({
      x: p.x * fieldW,
      y: p.y * fieldH,
    }))

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([4, 6])
    ctx.globalAlpha = 0.7

    ctx.beginPath()
    ctx.moveTo(startX, startY)

    if (points.length === 1) {
      ctx.lineTo(points[0].x, points[0].y)
    } else {
      drawCurveSegment(ctx, { x: startX, y: startY }, points)
    }

    ctx.stroke()
    ctx.setLineDash([])

    // Small circle at the end of motion path
    if (points.length > 0) {
      const endPt = points[points.length - 1]
      ctx.beginPath()
      ctx.arc(endPt.x, endPt.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    ctx.restore()
  }

  function drawReadOrderBadge(
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    order: number,
  ) {
    const size = 12
    ctx.save()

    // White circle background
    ctx.beginPath()
    ctx.arc(point.x + size + 4, point.y - size / 2, size / 2 + 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fill()

    // Number
    ctx.fillStyle = '#1e293b'
    ctx.font = `bold ${size}px Oracle Sans, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${order}`, point.x + size + 4, point.y - size / 2)

    ctx.restore()
  }

  function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string,
    headLen: number = 10,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6),
    )
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6),
    )
    ctx.closePath()
    ctx.fill()
  }

  // ─── Ghost players (overlay from another play) ────────

  function drawGhostPlayerRoute(
    ctx: CanvasRenderingContext2D,
    player: CanvasPlayer,
    fieldW: number,
    fieldH: number,
    qbPosition: { x: number; y: number } | null,
  ) {
    const startX = player.x * fieldW
    const startY = player.y * fieldH
    const color = POSITION_COLORS[player.position] ?? '#ef4444'
    const isRusher = player.designation === 'R' || player.position === 'RSH'

    // Rusher: line always follows the offense QB so it updates when QB is moved
    if (isRusher && qbPosition) {
      const endX = qbPosition.x * fieldW
      const endY = qbPosition.y * fieldH
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      drawArrowHead(ctx, { x: startX, y: startY }, { x: endX, y: endY }, color, 8)
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.restore()
      return
    }

    if (!player.route?.segments || player.route.segments.length === 0) return

    let lastEndPoint = { x: startX, y: startY }

    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([6, 4])

    player.route.segments.forEach((segment) => {
      if (segment.points.length === 0) return

      const points = segment.points.map((p) => ({
        x: p.x * fieldW,
        y: p.y * fieldH,
      }))

      ctx.beginPath()
      ctx.moveTo(lastEndPoint.x, lastEndPoint.y)

      if (segment.type === 'curve') {
        drawCurveSegment(ctx, lastEndPoint, points)
      } else {
        points.forEach((p) => ctx.lineTo(p.x, p.y))
      }

      ctx.stroke()

      if (points.length > 0) {
        const lastPt = points[points.length - 1]
        const prevPt = points.length > 1 ? points[points.length - 2] : lastEndPoint
        drawArrowHead(ctx, prevPt, lastPt, color, 8)
      }

      if (segment.type !== 'option' && points.length > 0) {
        lastEndPoint = points[points.length - 1]
      }
    })

    ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.restore()
  }

  function drawGhostPlayers(
    ctx: CanvasRenderingContext2D,
    players: CanvasPlayer[],
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const { fieldLength, endzoneSize } = options
    const yardHeight = fieldH / (fieldLength + endzoneSize * 2)
    const ghostOpacity = 0.5

    players.forEach((player) => {
      const px = player.x * fieldW
      const py = player.y * fieldH
      const radius = Math.max(12, fieldW * 0.035)
      const color = POSITION_COLORS[player.position] || '#ef4444'
      const isRusher = player.designation === 'R' || player.position === 'RSH'

      // Ghost coverage zone (defense only; rushers have no zone)
      if (player.side === 'defense' && player.coverageRadius && !isRusher) {
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        const pixRadius = player.coverageRadius * yardHeight
        ctx.arc(px, py, pixRadius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.25)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.restore()
      }

      // Ghost circle: semi-transparent fill, dashed border
      ctx.save()
      ctx.globalAlpha = ghostOpacity
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.restore()

      const label = player.number != null ? String(player.number) : (player.designation ?? player.position)
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(9, radius * 0.65)}px Oracle Sans, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, px, py)
      ctx.globalAlpha = 1
      ctx.restore()
    })
  }

  // ─── Player rendering ─────────────────────────────────

  function drawPlayers(
    ctx: CanvasRenderingContext2D,
    players: CanvasPlayer[],
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const { fieldLength, endzoneSize } = options
    const yardHeight = fieldH / (fieldLength + endzoneSize * 2)

    players.forEach((player) => {
      const px = player.x * fieldW
      const py = player.y * fieldH
      const radius = Math.max(14, fieldW * 0.04)
      const isSelected = player.id === options.selectedPlayerId
      
      // Draw Coverage Radius (Defense only; rushers do not cover a zone)
      const isRusher = player.designation === 'R' || player.position === 'RSH'
      if (player.side === 'defense' && player.coverageRadius && !isRusher) {
        ctx.save()
        ctx.beginPath()
        const pixRadius = player.coverageRadius * yardHeight 
        ctx.arc(px, py, pixRadius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.restore()
      }

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2

      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)

      // Determine player color
      const color = POSITION_COLORS[player.position] || (player.side === 'offense' ? '#22c55e' : '#ef4444')

      if (isSelected) {
        // Selected: White fill, Colored text/border
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        
        ctx.strokeStyle = color
        ctx.lineWidth = 4 
        ctx.stroke()
        
        // Glow effect
        ctx.restore() // Restore shadow context
        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()

        // Text color for selected
        ctx.fillStyle = color
      } else {
        // Normal: Colored fill, White text/border
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore() // Restore shadow context

        // Text color for normal
        ctx.fillStyle = '#ffffff'
      }

      // Number/Designation text inside circle
      const label = player.number != null ? String(player.number) : (player.designation ?? player.position)
      ctx.font = `bold ${Math.max(10, radius * 0.7)}px Oracle Sans, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, px, py)

      // Name text
      if (player.name) {
        ctx.save()
        ctx.fillStyle = '#ffffff' // White text
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)' // Strong shadow for contrast against grass
        ctx.shadowBlur = 3
        ctx.font = `600 ${Math.max(9, radius * 0.45)}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(player.name, px, py + radius + 5)
        ctx.restore()
      }

      // Primary target indicator (offense only): ring + "1" badge
      if (player.side === 'offense' && player.primaryTarget) {
        ctx.save()
        const ringRadius = radius + 6
        ctx.beginPath()
        ctx.arc(px, py, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.stroke()
        ctx.setLineDash([])
        // Small "1" badge above player
        const badgeY = py - ringRadius - 8
        ctx.beginPath()
        ctx.arc(px, badgeY, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.max(10, radius * 0.5)}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('1', px, badgeY)
        ctx.restore()
      }
    })
  }

  function drawGhostQB(
    ctx: CanvasRenderingContext2D,
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const { fieldLength, endzoneSize, lineOfScrimmage } = options
    const totalLength = fieldLength + endzoneSize * 2
    const yardHeight = fieldH / totalLength

    // LOS Y position
    const losY = yardHeight * (endzoneSize + fieldLength - lineOfScrimmage)
    
    // QA is 5 yards back (down/higher Y) from LOS
    const qbY = losY + (5 * yardHeight)
    const qbX = fieldW * 0.5
    const radius = Math.max(14, fieldW * 0.04)

    ctx.save()
    // Ghostly appearance
    ctx.globalAlpha = 0.5
    ctx.setLineDash([4, 4])
    
    // Draw circle
    ctx.beginPath()
    ctx.arc(qbX, qbY, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = `bold ${Math.max(10, radius * 0.7)}px Oracle Sans, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('QB', qbX, qbY)

    ctx.restore()
  }

  function drawCoverageZones(
    ctx: CanvasRenderingContext2D,
    players: CanvasPlayer[],
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const { fieldLength, endzoneSize } = options
    const yardHeight = fieldH / (fieldLength + endzoneSize * 2)

    players.forEach((player) => {
      if (player.side !== 'defense' || !player.coverageRadius || player.coverageRadius <= 0) return

      const px = player.x * fieldW
      const py = player.y * fieldH
      const radiusPx = player.coverageRadius * yardHeight

      ctx.save()
      
      // Fill
      ctx.beginPath()
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)' // Subtle white fill
      ctx.fill()

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      
      // Label if large enough
      if (radiusPx > 20) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = `600 10px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        // Draw slightly above the player (player radius is ~14px)
        // Actually, let's draw it at the top edge of the circle
        ctx.fillText(`${player.coverageRadius}y`, px, py - radiusPx + 12)
      }

      ctx.restore()
    })
  }

  return {
    render,
  }
}
