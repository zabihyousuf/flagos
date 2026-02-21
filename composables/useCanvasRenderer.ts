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
  /** When false, do not draw player names below icons on the field (default true) */
  showPlayerNames?: boolean
  /** Default for player marker label when player.showLabel is not set (from settings). */
  defaultPlayerLabelOnCanvas?: 'number' | 'position' | 'both' | 'none'
  /** Scale for preview thumbnails: multiplies player size, route width, fonts (default 1). Use ~0.35–0.5 for small previews. */
  previewScale?: number
  /** Minimal B&W thumbnail: no field, zoomed to fit play, small circles and numbers only. */
  thumbnailMode?: boolean
  /** Suggested route preview for one player (drawn on canvas until Accept/Deny) */
  suggestedRoutePreview?: { playerId: string; route: { segments: RouteSegment[] } } | null
  /** Animated positions from simulation engine — overrides player.x/y when present */
  animatedPositions?: Map<string, { x: number; y: number }>
  /** Animated ball from simulation engine */
  animatedBall?: { x: number; y: number; visible: boolean; inFlight: boolean }
  /** When true, hides selection ring and route-delete chip UI; disables interactive overlays */
  simulationMode?: boolean
}

const PADDING = 12

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
 * In fit mode, padding is 0 so the field can fill the canvas edge-to-edge.
 */
export function computeFieldRect(
  logicalW: number,
  logicalH: number,
  options: { fieldLength: number; fieldWidth: number; endzoneSize: number; zoom?: number; viewMode?: 'fit' | 'full' },
) {
  const totalLength = options.fieldLength + options.endzoneSize * 2
  const aspectRatio = options.fieldWidth / totalLength

  const padding = options.viewMode === 'fit' ? 0 : PADDING
  const availW = logicalW - padding * 2
  const availH = logicalH - padding * 2

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

/** Normalized 0–1 content bounds (e.g. players + LOS + ghost defense) for fit-view. */
export type ContentBounds = { minX: number; minY: number; maxX: number; maxY: number }

/**
 * Compute the effective zoom and pan for a given view mode.
 * - 'full': Center the field and show all of it (zoom=1, no pan).
 * - 'fit' (no contentBounds): Cover zoom; vertical pan biased so LOS/players stay in view.
 * - 'fit' (with contentBounds, e.g. ghost defense): Zoom out so offense + defense + LOS all fit;
 *   field stays centered and locked (no pan to follow content).
 */
export function computeViewTransform(
  logicalW: number,
  logicalH: number,
  fieldRect: { offsetX: number; offsetY: number; fieldW: number; fieldH: number; totalLength: number },
  options: {
    fieldLength: number
    endzoneSize: number
    lineOfScrimmage: number
    viewMode?: 'fit' | 'full'
    playType?: 'offense' | 'defense'
    /** When set (e.g. ghost defense), fit this content in view and fill viewport */
    contentBounds?: ContentBounds
  },
): { zoom: number; panX: number; panY: number } {
  if (options.viewMode === 'fit') {
    const { offsetX, offsetY, fieldW, fieldH, totalLength } = fieldRect
    const yardHeight = fieldH / totalLength
    const viewAspect = logicalW / logicalH

    // When we have content bounds (defense fit or ghost defense): fit exactly the content
    // window (7 yd back / 15 yd past LOS + players) and center the view on that window so
    // the visible range is exactly the bounds, not a field-centered symmetric window.
    if (options.contentBounds) {
      const b = options.contentBounds
      const contentHalfSpanX = fieldW * Math.max((b.maxX - b.minX) / 2, 0.01)
      const contentHalfSpanY = fieldH * Math.max((b.maxY - b.minY) / 2, 0.01)
      const zoomFromX = logicalW / (2 * contentHalfSpanX)
      const zoomFromY = logicalH / (2 * contentHalfSpanY)
      const fitZoom = Math.min(zoomFromX, zoomFromY)

      const contentCenterX = (b.minX + b.maxX) / 2
      const contentCenterY = (b.minY + b.maxY) / 2
      const panX = logicalW / 2 - (offsetX + fieldW * contentCenterX) * fitZoom
      const panY = logicalH / 2 - (offsetY + fieldH * contentCenterY) * fitZoom
      return { zoom: fitZoom, panX, panY }
    }

    // No content bounds: cover zoom, LOS-biased pan
    const zoomW = logicalW / fieldW
    const zoomH = logicalH / fieldH
    const fitZoom = Math.max(zoomW, zoomH)

    const panX = logicalW / 2 - (offsetX + fieldW / 2) * fitZoom

    const losYardIndex = options.endzoneSize + options.fieldLength - options.lineOfScrimmage
    const losY = offsetY + yardHeight * losYardIndex
    const nearOffenseEndzone = options.lineOfScrimmage <= 15
    const nearDefenseEndzone = options.lineOfScrimmage >= options.fieldLength - 15
    const losScreenFraction = nearOffenseEndzone ? 0.4 : nearDefenseEndzone ? 0.28 : 0.35
    let panY = logicalH * losScreenFraction - losY * fitZoom

    const panYMin = logicalH - (offsetY + fieldH) * fitZoom
    const panYMax = -offsetY * fitZoom
    panY = Math.max(panYMin, Math.min(panYMax, panY))

    return { zoom: fitZoom, panX, panY }
  }

  return { zoom: 1, panX: 0, panY: 0 }
}

/** Content bounds for fit view: at least 7 yd back / 20 yd downfield from LOS. In defense mode the view is locked to this fixed strip (no resize when players move). */
export function computeFitContentBounds(
  players: CanvasPlayer[],
  ghostPlayers: CanvasPlayer[],
  totalLength: number,
  options: { endzoneSize: number; fieldLength: number; lineOfScrimmage: number; playType?: 'offense' | 'defense' },
): ContentBounds {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0

  function add(x: number, y: number) {
    const px = Math.max(0, Math.min(1, x))
    const py = Math.max(0, Math.min(1, y))
    minX = Math.min(minX, px)
    minY = Math.min(minY, py)
    maxX = Math.max(maxX, px)
    maxY = Math.max(maxY, py)
  }

  const losYNorm = (options.endzoneSize + options.fieldLength - options.lineOfScrimmage) / totalLength
  const yardsNorm = (yards: number) => yards / totalLength

  const pad = 0.04
  const fixedMinY = Math.max(0, losYNorm - yardsNorm(20))
  const fixedMaxY = Math.min(1, losYNorm + yardsNorm(7))

  if (options.playType === 'defense') {
    // Locked view: fixed 7 yd back / 20 yd past LOS and full field width — no resize when players move
    return {
      minX: Math.max(0, 0.1 - pad),
      minY: Math.max(0, fixedMinY - pad),
      maxX: Math.min(1, 0.9 + pad),
      maxY: Math.min(1, fixedMaxY + pad),
    }
  }

  add(0.5, losYNorm)
  for (const p of players) {
    add(p.x, p.y)
    for (const seg of p.route?.segments ?? []) {
      for (const pt of seg.points) add(pt.x, pt.y)
    }
    for (const pt of p.motionPath ?? []) add(pt.x, pt.y)
  }
  for (const p of ghostPlayers) {
    add(p.x, p.y)
    for (const seg of p.route?.segments ?? []) {
      for (const pt of seg.points) add(pt.x, pt.y)
    }
  }

  const outMinY = Math.max(0, fixedMinY - pad)
  const outMaxY = Math.min(1, fixedMaxY + pad)

  if (minX > maxX) {
    minX = 0.25
    maxX = 0.75
  }

  return {
    minX: Math.max(0, minX - pad),
    minY: outMinY,
    maxX: Math.min(1, maxX + pad),
    maxY: outMaxY,
  }
}

/** Bounding box in normalized 0–1 coords from all players, route points, and motion. */
function computePlayBbox(data: CanvasData): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  let hasAny = false

  function add(x: number, y: number) {
    const px = Math.max(0, Math.min(1, x))
    const py = Math.max(0, Math.min(1, y))
    minX = Math.min(minX, px)
    minY = Math.min(minY, py)
    maxX = Math.max(maxX, px)
    maxY = Math.max(maxY, py)
    hasAny = true
  }

  for (const p of data.players) {
    add(p.x, p.y)
    for (const seg of p.route?.segments ?? []) {
      for (const pt of seg.points) add(pt.x, pt.y)
    }
    for (const pt of p.motionPath ?? []) add(pt.x, pt.y)
  }

  if (!hasAny) return null
  return { minX, minY, maxX, maxY }
}

export type ViewTransform = { zoom: number; panX: number; panY: number }

export function useCanvasRenderer() {
  function render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: CanvasData,
    options: RenderOptions,
  ): ViewTransform | undefined {
    const dpr = window.devicePixelRatio || 1
    const logicalW = canvas.width / dpr
    const logicalH = canvas.height / dpr

    if (options.thumbnailMode) {
      renderThumbnail(ctx, logicalW, logicalH, data)
      return undefined
    }

    const fieldRect = computeFieldRect(logicalW, logicalH, { ...options, viewMode: options.viewMode })
    const { offsetX, offsetY, fieldW, fieldH } = fieldRect

    const contentBounds =
      options.viewMode === 'fit' &&
      (options.ghostPlayers?.length || options.playType === 'defense')
        ? computeFitContentBounds(data.players, options.ghostPlayers ?? [], fieldRect.totalLength, {
            endzoneSize: options.endzoneSize,
            fieldLength: options.fieldLength,
            lineOfScrimmage: options.lineOfScrimmage,
            playType: options.playType,
          })
        : undefined

    const view = computeViewTransform(logicalW, logicalH, fieldRect, {
      ...options,
      contentBounds,
    })

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
    // Draw routes behind players (use suggested route preview when set for this player)
    data.players.forEach((player) => {
      const preview = options.suggestedRoutePreview?.playerId === player.id ? options.suggestedRoutePreview : null
      const routeToDraw = preview ? preview.route : player.route
      const effectivePlayer = routeToDraw ? { ...player, route: routeToDraw } : player
      drawPlayerRoute(ctx, effectivePlayer, fieldW, fieldH, options, !!preview)
      drawMotionPath(ctx, player, fieldW, fieldH, options)
    })

    if (options.playType === 'offense') {
      drawPrimaryTargetThrowLine(ctx, data.players, fieldW, fieldH, options)
    }
    
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
          drawGhostPlayerRoute(ctx, player, fieldW, fieldH, qbPosition, options)
        }
      })
      drawGhostPlayers(ctx, options.ghostPlayers, fieldW, fieldH, options)
    }

    // Draw players on top
    drawPlayers(ctx, data.players, fieldW, fieldH, options)

    // Draw animated ball (simulation)
    if (options.animatedBall?.visible) {
      drawBall(ctx, options.animatedBall, fieldW, fieldH)
    }

    ctx.restore()
    ctx.restore()
    return view
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
    const scale = options.previewScale ?? 1
    const isPreview = scale < 1

    // Field fill
    ctx.fillStyle = COLORS.fieldFill
    ctx.fillRect(0, yardHeight * endzoneSize, fieldW, yardHeight * fieldLength)

    // Endzones
    ctx.fillStyle = COLORS.endzoneFill
    ctx.fillRect(0, 0, fieldW, yardHeight * endzoneSize)
    ctx.fillRect(0, fieldH - yardHeight * endzoneSize, fieldW, yardHeight * endzoneSize)

    // Endzone text (skip in preview to keep identifiers prominent)
    if (!isPreview) {
      ctx.fillStyle = COLORS.endzoneText
      const ezFontSize = Math.max(13, fieldW * 0.05)
      ctx.font = `700 ${ezFontSize}px Oracle Sans, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.letterSpacing = `${ezFontSize * 0.3}px`
      ctx.fillText('END ZONE', fieldW / 2, (yardHeight * endzoneSize) / 2)
      ctx.fillText('END ZONE', fieldW / 2, fieldH - (yardHeight * endzoneSize) / 2)
      ctx.letterSpacing = '0px'
    }

    // Field border
    ctx.strokeStyle = COLORS.fieldBorder
    ctx.lineWidth = Math.max(0.5, 1.5 * scale)
    ctx.strokeRect(0, 0, fieldW, fieldH)

    // Endzone separation lines
    ctx.strokeStyle = COLORS.endzoneBorder
    ctx.lineWidth = Math.max(0.5, 1.5 * scale)
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
      ctx.lineWidth = Math.max(0.4, (isMajor ? 1 : 0.7) * scale)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(fieldW, y)
      ctx.stroke()

      const displayYard = yard <= fieldLength / 2 ? yard : fieldLength - yard
      if (!isPreview && displayYard > 0 && isMajor) {
        ctx.fillStyle = COLORS.yardNumber
        const numFontSize = Math.max(11, fieldW * 0.035)
        ctx.font = `600 ${numFontSize}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${displayYard}`, 20, y)
        ctx.fillText(`${displayYard}`, fieldW - 20, y)
      }
    }

    // Hash marks every yard (skip in preview to reduce clutter)
    if (!isPreview) {
      ctx.strokeStyle = COLORS.hashMark
      ctx.lineWidth = Math.max(0.4, 0.7 * scale)
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
    }

    // Line of Scrimmage
    const losY = yardHeight * (endzoneSize + fieldLength - lineOfScrimmage)
    ctx.save()
    ctx.shadowColor = COLORS.los
    ctx.shadowBlur = isPreview ? 2 : 4
    ctx.strokeStyle = COLORS.los
    ctx.lineWidth = Math.max(0.5, 2 * scale)
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(0, losY)
    ctx.lineTo(fieldW, losY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

     // LOS pill label (skip in preview)
    if (!isPreview) {
      const labelFontSize = Math.max(10, fieldW * 0.022)
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
    }


    // First Down Line (yards from offense goal, same as settings; Y = endzoneSize + fieldLength - firstDownYard)
    const firstDownYard = firstDownYardLine ?? fieldLength / 2
    const midY = yardHeight * (endzoneSize + fieldLength - firstDownYard)
    ctx.save()
    ctx.shadowColor = COLORS.firstDown
    ctx.shadowBlur = isPreview ? 2 : 3
    ctx.strokeStyle = COLORS.firstDown
    ctx.lineWidth = Math.max(0.4, 1.5 * scale)
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(fieldW, midY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // 1st down pill label (skip in preview)
    if (!isPreview) {
      const labelFontSize = Math.max(10, fieldW * 0.022)
      ctx.font = `600 ${labelFontSize}px Oracle Sans, sans-serif`
      const pillPx = 7
      const pillPy = 3
      const pillR = 4
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
    }

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
      ctx.lineWidth = Math.max(0.4, 1 * scale)
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
    options: RenderOptions,
    isPreview = false,
  ) {
    if (!player.route || !player.route.segments || player.route.segments.length === 0) return

    const scale = options.previewScale ?? 1
    const playerX = player.x * fieldW
    const playerY = player.y * fieldH
    const color = player.markerColor ?? (POSITION_COLORS[player.position] ?? '#888888')
    if (isPreview) {
      ctx.save()
      ctx.setLineDash([8, 6])
      ctx.globalAlpha = 0.85
    }

    // Route starts at end of motion when present, otherwise at player position
    const motionEnd = player.motionPath?.length ? player.motionPath[player.motionPath.length - 1] : null
    const routeStart = motionEnd
      ? { x: motionEnd.x * fieldW, y: motionEnd.y * fieldH }
      : { x: playerX, y: playerY }
    let lastEndPoint = { ...routeStart }

    // Draw full path (all segments) with no arrows at intermediate points
    const segCount = player.route.segments.length
    player.route.segments.forEach((segment, segIndex) => {
      if (segment.points.length === 0) return

      const points = segment.points.map((p) => ({
        x: p.x * fieldW,
        y: p.y * fieldH,
      }))

      ctx.save()
      const lineWidth = Math.max(0.5, (segment.type === 'option' ? 2 : 2.5) * scale)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (segment.type === 'option') {
        ctx.setLineDash([6, 4])
      }

      ctx.beginPath()
      ctx.moveTo(lastEndPoint.x, lastEndPoint.y)

      const isLastSegment = segIndex === segCount - 1
      if (segment.type === 'curve') {
        drawCurveSegment(ctx, lastEndPoint, points)
      } else {
        // For straight/option: stop line short by half lineWidth at the very end so round cap meets arrow tip
        for (let i = 0; i < points.length; i++) {
          const p = points[i]
          if (isLastSegment && segment.type !== 'option' && i === points.length - 1) {
            const prev = i > 0 ? points[i - 1] : lastEndPoint
            const dx = p.x - prev.x
            const dy = p.y - prev.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const inset = lineWidth / 2
            ctx.lineTo(p.x - (dx / len) * inset, p.y - (dy / len) * inset)
          } else {
            ctx.lineTo(p.x, p.y)
          }
        }
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Read order badge at segment end (no arrow here)
      if (segment.readOrder != null && points.length > 0) {
        const endPt = points[points.length - 1]
        drawReadOrderBadge(ctx, endPt, segment.readOrder, scale)
      }

      // Option segments always get an arrow at their end
      if (segment.type === 'option' && points.length > 0) {
        const endPt = points[points.length - 1]
        const prevPt = lastEndPoint
        drawArrowHead(ctx, prevPt, endPt, color, Math.max(3, 10 * scale))
      }

      ctx.restore()

      if (segment.type !== 'option' && points.length > 0) {
        lastEndPoint = points[points.length - 1]
      }
    })

    // Single arrow at the very end of the entire route (only when last segment is not option; option segments get their own arrow above)
    const lastSeg = player.route.segments[player.route.segments.length - 1]
    const lastSegIsOption = lastSeg?.type === 'option' && (lastSeg?.points?.length ?? 0) > 0
    if (!lastSegIsOption) {
      let arrowEnd: { x: number; y: number } | null = null
      let arrowPrev = { x: routeStart.x, y: routeStart.y }
      let px = routeStart.x
      let py = routeStart.y
      for (const segment of player.route.segments) {
        if (segment.points.length === 0) continue
        for (const p of segment.points) {
          const nx = p.x * fieldW
          const ny = p.y * fieldH
          arrowPrev = { x: px, y: py }
          arrowEnd = { x: nx, y: ny }
          px = nx
          py = ny
        }
      }
      if (arrowEnd) {
        drawArrowHead(ctx, arrowPrev, arrowEnd, color, Math.max(3, 10 * scale))
      }
    }
    if (isPreview) ctx.restore()
  }

  /**
   * Draw dashed line from QB to the end of the primary target's route.
   */
  function drawPrimaryTargetThrowLine(
    ctx: CanvasRenderingContext2D,
    players: CanvasPlayer[],
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    const scale = options.previewScale ?? 1
    const qb = players.find((p) => p.side === 'offense' && (p.position === 'QB' || p.designation === 'Q'))
    const primary = players.find((p) => p.side === 'offense' && p.primaryTarget && p.route?.segments?.length)
    if (!qb || !primary?.route?.segments?.length) return

    const lastSeg = primary.route.segments[primary.route.segments.length - 1]
    if (!lastSeg.points.length) return

    const throwPoint = lastSeg.points[lastSeg.points.length - 1]
    // When QB has a rollout (motion path), throw line starts from end of rollout
    const qbThrowFrom = qb.motionPath?.length
      ? qb.motionPath[qb.motionPath.length - 1]
      : { x: qb.x, y: qb.y }
    const qbX = qbThrowFrom.x * fieldW
    const qbY = qbThrowFrom.y * fieldH
    const endX = throwPoint.x * fieldW
    const endY = throwPoint.y * fieldH

    ctx.save()
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = Math.max(0.5, 2 * scale)
    ctx.setLineDash([8, 6])
    ctx.beginPath()
    ctx.moveTo(qbX, qbY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
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

  /** B&W miniature: no field, zoomed to fit play, small circles + numbers only. */
  function renderThumbnail(
    ctx: CanvasRenderingContext2D,
    logicalW: number,
    logicalH: number,
    data: CanvasData,
  ) {
    const dpr = window.devicePixelRatio || 1
    const canvasW = logicalW * dpr
    const canvasH = logicalH * dpr
    ctx.clearRect(0, 0, canvasW, canvasH)
    if (logicalW < 2 || logicalH < 2) return

    const bbox = computePlayBbox(data)
    if (!bbox) return

    const pad = 0.1
    const contentMinX = Math.max(0, bbox.minX - pad)
    const contentMinY = Math.max(0, bbox.minY - pad)
    const contentMaxX = Math.min(1, bbox.maxX + pad)
    const contentMaxY = Math.min(1, bbox.maxY + pad)
    const contentW = Math.max(0.01, contentMaxX - contentMinX)
    const contentH = Math.max(0.01, contentMaxY - contentMinY)
    let scale = Math.min(logicalW / contentW, logicalH / contentH)
    if (scale <= 0 || !Number.isFinite(scale)) scale = Math.min(logicalW, logicalH)
    const cx = (contentMinX + contentMaxX) / 2
    const cy = (contentMinY + contentMaxY) / 2

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.translate(logicalW / 2, logicalH / 2)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)

    const motionColor = '#999'
    const playerFill = '#1a1a1a'
    const playerStroke = '#e5e5e5'
    const labelColor = '#ffffff'
    const radius = 0.014
    const onePx = 1 / scale

    // Routes (behind players); start from end of motion when present; use player color
    data.players.forEach((player) => {
      if (!player.route?.segments?.length) return
      const routeColor = player.markerColor ?? (POSITION_COLORS[player.position] ?? '#444')
      const motionEnd = player.motionPath?.length ? player.motionPath[player.motionPath.length - 1] : null
      let last = motionEnd ? { x: motionEnd.x, y: motionEnd.y } : { x: player.x, y: player.y }
      player.route.segments.forEach((seg) => {
        if (seg.points.length === 0) return
        const points = seg.points.map((p) => ({ x: p.x, y: p.y }))
        ctx.strokeStyle = routeColor
        ctx.lineWidth = Math.max(0.002, onePx * 0.8)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.setLineDash(seg.type === 'option' ? [3 * onePx, 2 * onePx] : [])
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        if (seg.type === 'curve') {
          drawCurveSegment(ctx, last, points)
        } else {
          points.forEach((p) => ctx.lineTo(p.x, p.y))
        }
        ctx.stroke()
        ctx.setLineDash([])
        if (seg.type !== 'option' && points.length > 0) last = points[points.length - 1]
      })
    })

    // Motion paths
    data.players.forEach((player) => {
      if (!player.motionPath?.length) return
      const pts = player.motionPath.map((p) => ({ x: p.x, y: p.y }))
      ctx.strokeStyle = motionColor
      ctx.lineWidth = Math.max(0.002, onePx * 0.5)
      ctx.setLineDash([2 * onePx, 3 * onePx])
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      if (pts.length === 1) ctx.lineTo(pts[0].x, pts[0].y)
      else drawCurveSegment(ctx, { x: player.x, y: player.y }, pts)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    })

    // Players: small black circles + white number
    data.players.forEach((player) => {
      const label = player.number != null ? String(player.number) : (player.designation ?? player.position ?? '?')
      ctx.fillStyle = playerFill
      ctx.strokeStyle = playerStroke
      ctx.lineWidth = Math.max(0.001, onePx * 0.4)
      ctx.beginPath()
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = labelColor
      ctx.font = '8px Oracle Sans, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, player.x, player.y)
    })

    ctx.restore()
  }

  function drawMotionPath(
    ctx: CanvasRenderingContext2D,
    player: CanvasPlayer,
    fieldW: number,
    fieldH: number,
    options: RenderOptions,
  ) {
    if (!player.motionPath || player.motionPath.length === 0) return

    const scale = options.previewScale ?? 1
    const startX = player.x * fieldW
    const startY = player.y * fieldH
    const color = player.markerColor ?? (POSITION_COLORS[player.position] ?? '#888888')

    const points = player.motionPath.map((p) => ({
      x: p.x * fieldW,
      y: p.y * fieldH,
    }))

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.5, 2 * scale)
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
      const r = Math.max(1.5, 4 * scale)
      ctx.beginPath()
      ctx.arc(endPt.x, endPt.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    ctx.restore()
  }

  function drawReadOrderBadge(
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    order: number,
    scale: number = 1,
  ) {
    const size = Math.max(4, 12 * scale)
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
    options: RenderOptions,
  ) {
    const scale = options.previewScale ?? 1
    const startX = player.x * fieldW
    const startY = player.y * fieldH
    const color = player.markerColor ?? (POSITION_COLORS[player.position] ?? '#ef4444')
    const isRusher = player.designation === 'R' || player.position === 'RSH'

    // Rusher: line always follows the offense QB so it updates when QB is moved
    if (isRusher && qbPosition) {
      const endX = qbPosition.x * fieldW
      const endY = qbPosition.y * fieldH
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(0.5, 2 * scale)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      drawArrowHead(ctx, { x: startX, y: startY }, { x: endX, y: endY }, color, Math.max(3, 8 * scale))
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
    ctx.lineWidth = Math.max(0.5, 2 * scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([6, 4])

    // Draw full path, no arrows at intermediate points
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

      if (segment.type !== 'option' && points.length > 0) {
        lastEndPoint = points[points.length - 1]
      }
    })

    // Single arrow only at the very end of the ghost route
    let gArrowEnd: { x: number; y: number } | null = null
    let gArrowPrev = { x: startX, y: startY }
    let gx = startX
    let gy = startY
    for (const segment of player.route.segments) {
      if (segment.points.length === 0) continue
      for (const p of segment.points) {
        const nx = p.x * fieldW
        const ny = p.y * fieldH
        gArrowPrev = { x: gx, y: gy }
        gArrowEnd = { x: nx, y: ny }
        gx = nx
        gy = ny
      }
    }
    if (gArrowEnd) {
      drawArrowHead(ctx, gArrowPrev, gArrowEnd, color, Math.max(3, 8 * scale))
    }

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
    const scale = options.previewScale ?? 1

    players.forEach((player) => {
      const px = player.x * fieldW
      const py = player.y * fieldH
      const radius = Math.max(3, Math.max(12, fieldW * 0.035) * scale)
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
        ctx.lineWidth = Math.max(0.4, 1 * scale)
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
      ctx.lineWidth = Math.max(0.5, 2 * scale)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.restore()

      const label = player.designation ?? player.position ?? '?'
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(6, radius * 0.325)}px Oracle Sans, sans-serif`
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
    const scale = options.previewScale ?? 1

    const isFitView = options.viewMode === 'fit'
    let playerRadius = isFitView ? Math.max(10, fieldW * 0.028) : Math.max(14, fieldW * 0.04)
    playerRadius = Math.max(3, playerRadius * scale)

    players.forEach((player) => {
      // In simulation mode, use animated position if available
      const animPos = options.animatedPositions?.get(player.id)
      const px = (animPos?.x ?? player.x) * fieldW
      const py = (animPos?.y ?? player.y) * fieldH
      const radius = playerRadius
      const isSelected = !options.simulationMode && player.id === options.selectedPlayerId
      const isRusher = player.designation === 'R' || player.position === 'RSH'

      // Coverage zone center (unlocked = run-to zone; locked = on player)
      const zoneX = (player.coverageZoneUnlocked && player.coverageZoneX != null ? player.coverageZoneX : player.x) * fieldW
      const zoneY = (player.coverageZoneUnlocked && player.coverageZoneY != null ? player.coverageZoneY : player.y) * fieldH
      const zoneDiffers = player.coverageZoneUnlocked && (player.coverageZoneX != null || player.coverageZoneY != null) &&
        (Math.abs((player.coverageZoneX ?? player.x) - player.x) > 0.001 || Math.abs((player.coverageZoneY ?? player.y) - player.y) > 0.001)

      // Line from player to zone when unlocked and zone moved (indicates "will run to zone")
      if (player.side === 'defense' && !isRusher && zoneDiffers) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(zoneX, zoneY)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = Math.max(0.5, 2 * scale)
        ctx.setLineDash([8, 6])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      // Draw Coverage Radius (Defense only; rushers do not cover a zone)
      if (player.side === 'defense' && player.coverageRadius && !isRusher) {
        ctx.save()
        const pixRadius = player.coverageRadius * yardHeight
        ctx.beginPath()
        ctx.arc(zoneX, zoneY, pixRadius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
        ctx.lineWidth = Math.max(0.4, 1 * scale)
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.restore()
      }

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
      ctx.shadowBlur = scale < 1 ? 2 : 6
      ctx.shadowOffsetY = scale < 1 ? 0.5 : 2

      const color = player.markerColor ?? (POSITION_COLORS[player.position] || (player.side === 'offense' ? '#22c55e' : '#ef4444'))
      const shape = player.markerShape ?? 'circle'

      ctx.beginPath()
      if (shape === 'circle') {
        ctx.arc(px, py, radius, 0, Math.PI * 2)
      } else if (shape === 'square') {
        ctx.rect(px - radius, py - radius, radius * 2, radius * 2)
      } else {
        // triangle (point up)
        ctx.moveTo(px, py - radius)
        ctx.lineTo(px + radius, py + radius * 0.6)
        ctx.lineTo(px - radius, py + radius * 0.6)
        ctx.closePath()
      }

      if (isSelected) {
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(0.5, 1 * scale)
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = color
        // Spinning dotted ring around selected player (offset from time for animation)
        const ringRadius = radius + 3
        const dashLen = 4
        const gapLen = 6
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(0.5, 1.2 * scale)
        ctx.setLineDash([dashLen, gapLen])
        ctx.lineDashOffset = ((Date.now() / 25) % (dashLen + gapLen)) * -1
        ctx.beginPath()
        ctx.arc(px, py, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      } else {
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(0.5, 2 * scale)
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = '#ffffff'
      }

      const showLabel = player.showLabel ?? options.defaultPlayerLabelOnCanvas ?? 'position'
      if (showLabel !== 'none') {
        const numStr = player.number != null ? String(player.number) : ''
        const posStr = player.designation ?? player.position
        const label =
          showLabel === 'number' ? (numStr || posStr)
          : showLabel === 'position' ? posStr
          : showLabel === 'both' ? (numStr ? `${numStr} ${posStr}` : posStr)
          : ''
        if (label) {
          ctx.font = `bold ${Math.max(6, radius * 0.35)}px Oracle Sans, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, px, py)
        }
      }

      // Name text (respects options.showPlayerNames, default true)
      if (player.name && options.showPlayerNames !== false) {
        ctx.save()
        ctx.fillStyle = '#ffffff' // White text
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)' // Strong shadow for contrast against grass
        ctx.shadowBlur = 3
        ctx.font = `600 ${Math.max(10, radius * 0.45)}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(player.name, px, py + radius + 5)
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

    const scale = options.previewScale ?? 1
    // LOS Y position
    const losY = yardHeight * (endzoneSize + fieldLength - lineOfScrimmage)
    
    // QA is 5 yards back (down/higher Y) from LOS
    const qbY = losY + (5 * yardHeight)
    const qbX = fieldW * 0.5
    const radius = Math.max(3, Math.max(14, fieldW * 0.04) * scale)

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
    ctx.lineWidth = Math.max(0.5, 2 * scale)
    ctx.stroke()

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = `bold ${Math.max(6, radius * 0.7)}px Oracle Sans, sans-serif`
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
    const scale = options.previewScale ?? 1

    players.forEach((player) => {
      if (player.side !== 'defense' || !player.coverageRadius || player.coverageRadius <= 0) return
      const isRusher = player.designation === 'R' || player.position === 'RSH'
      if (isRusher) return

      const px = player.x * fieldW
      const py = player.y * fieldH
      const zx = (player.coverageZoneUnlocked && player.coverageZoneX != null ? player.coverageZoneX : player.x) * fieldW
      const zy = (player.coverageZoneUnlocked && player.coverageZoneY != null ? player.coverageZoneY : player.y) * fieldH
      const radiusPx = player.coverageRadius * yardHeight
      const zoneDiffers = player.coverageZoneUnlocked && (player.coverageZoneX != null || player.coverageZoneY != null) &&
        (Math.abs((player.coverageZoneX ?? player.x) - player.x) > 0.001 || Math.abs((player.coverageZoneY ?? player.y) - player.y) > 0.001)

      if (zoneDiffers) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(zx, zy)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = Math.max(0.4, 1.5 * scale)
        ctx.setLineDash([6, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      ctx.save()
      ctx.beginPath()
      ctx.arc(zx, zy, radiusPx, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = Math.max(0.4, 1 * scale)
      ctx.setLineDash([4, 4])
      ctx.stroke()
      if (radiusPx > 20 * scale) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = `600 ${Math.max(6, 11 * scale)}px Oracle Sans, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${player.coverageRadius}y`, zx, zy - radiusPx + 12)
      }
      ctx.restore()
    })
  }

  // ─── Ball rendering (simulation) ──────────────────────

  function drawBall(
    ctx: CanvasRenderingContext2D,
    ball: { x: number; y: number; visible: boolean; inFlight: boolean },
    fieldW: number,
    fieldH: number,
  ) {
    const bx = ball.x * fieldW
    const by = ball.y * fieldH
    const r = 6

    // Glow when in flight
    if (ball.inFlight) {
      ctx.save()
      ctx.shadowBlur = 14
      ctx.shadowColor = '#f59e0b'
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)'
      ctx.beginPath()
      ctx.arc(bx, by, r + 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Brown ball
    ctx.save()
    ctx.fillStyle = '#78350f'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(bx, by, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Laces
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(bx - 3, by)
    ctx.lineTo(bx + 3, by)
    ctx.stroke()
    ctx.restore()
  }

  return {
    render,
  }
}
