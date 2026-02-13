<template>
  <div ref="containerRef" class="field-preview-container" :style="containerStyle">
    <canvas
      ref="canvasRef"
      class="field-preview-canvas"
      :class="{ 'cursor-ns-resize': hoverLine !== null || draggingLine !== null }"
      @mousemove="onMouseMove"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { POSITION_COLORS } from '~/lib/constants'

const props = withDefaults(defineProps<{
  fieldLength?: number
  fieldWidth?: number
  endzoneSize?: number
  lineOfScrimmage?: number
  /** First down line (yard line from offense goal, 1–fieldLength-1). If omitted, midfield is used. */
  firstDown?: number
  /** Fixed height in px, or omit to fill container (100%). */
  height?: number
  showPlayers?: boolean
}>(), {
  fieldLength: 70,
  fieldWidth: 40,
  endzoneSize: 10,
  lineOfScrimmage: 25,
  height: undefined,
  showPlayers: true,
})

const emit = defineEmits<{
  'update:lineOfScrimmage': [value: number]
  'update:firstDown': [value: number]
  /** Emitted when drag ends so parent can save immediately and avoid snap-back. */
  dragEnd: [payload: { line_of_scrimmage?: number; first_down?: number }]
}>()

const containerStyle = computed(() =>
  props.height != null ? { height: `${props.height}px` } : { height: '100%' }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

/** Layout from last render, for hit-test and drag (canvas-relative coords) */
const layoutRef = ref<{
  offsetX: number
  offsetY: number
  fieldW: number
  fieldH: number
  yardHeight: number
  fieldLength: number
  endzoneSize: number
} | null>(null)

const hoverLine = ref<'los' | 'firstDown' | null>(null)
const draggingLine = ref<'los' | 'firstDown' | null>(null)
/** Local yard value while dragging for immediate visual feedback (parent may debounce) */
const dragYard = ref<number | null>(null)

const PADDING = 40
const HIT_THRESHOLD = 10

// Match play designer field (grass green)
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
  dimensionLine: '#000',
  dimensionText: '#000',
}

function renderField() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(dpr, dpr)

  const canvasW = rect.width
  const canvasH = rect.height

  const { fieldLength, fieldWidth, endzoneSize, lineOfScrimmage } = props
  const totalLength = fieldLength + endzoneSize * 2

  // Calculate aspect-ratio-correct field dimensions
  // The field is taller than wide (length > width), oriented vertically
  const aspectRatio = fieldWidth / totalLength // e.g. 25/79 ≈ 0.316
  const availW = canvasW - PADDING * 2
  const availH = canvasH - PADDING * 2

  let fieldW: number, fieldH: number
  // Fit within available space while preserving aspect ratio
  if (availW / availH > aspectRatio) {
    // Container is wider than needed — constrain by height
    fieldH = availH
    fieldW = fieldH * aspectRatio
  } else {
    // Container is taller than needed — constrain by width
    fieldW = availW
    fieldH = fieldW / aspectRatio
  }

  // Center the field in the canvas
  const offsetX = (canvasW - fieldW) / 2
  const offsetY = (canvasH - fieldH) / 2

  const yardHeight = fieldH / totalLength

  layoutRef.value = {
    offsetX,
    offsetY,
    fieldW,
    fieldH,
    yardHeight,
    fieldLength,
    endzoneSize,
  }

  // Canvas background (transparent so container shows; or fill if needed)
  if (COLORS.background !== 'transparent') {
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvasW, canvasH)
  }

  // Translate so that PADDING-based drawing is centered
  ctx.save()
  ctx.translate(offsetX - PADDING, offsetY - PADDING)

  // Field fill (very light grey)
  ctx.fillStyle = COLORS.fieldFill
  ctx.fillRect(PADDING, PADDING + yardHeight * endzoneSize, fieldW, yardHeight * fieldLength)

  // Endzones (slightly different grey)
  ctx.fillStyle = COLORS.endzoneFill
  ctx.fillRect(PADDING, PADDING, fieldW, yardHeight * endzoneSize)
  ctx.fillRect(PADDING, PADDING + fieldH - yardHeight * endzoneSize, fieldW, yardHeight * endzoneSize)

  // Endzone text
  ctx.fillStyle = COLORS.endzoneText
  const ezFontSize = Math.max(14, fieldW * 0.06)
  ctx.font = `700 ${ezFontSize}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = `${ezFontSize * 0.35}px`
  ctx.fillText('END ZONE', PADDING + fieldW / 2, PADDING + (yardHeight * endzoneSize) / 2)
  ctx.fillText('END ZONE', PADDING + fieldW / 2, PADDING + fieldH - (yardHeight * endzoneSize) / 2)
  ctx.letterSpacing = '0px'

  // Field border
  ctx.strokeStyle = COLORS.fieldBorder
  ctx.lineWidth = 1.5
  ctx.strokeRect(PADDING, PADDING, fieldW, fieldH)

  // Endzone lines
  ctx.strokeStyle = COLORS.endzoneBorder
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PADDING, PADDING + yardHeight * endzoneSize)
  ctx.lineTo(PADDING + fieldW, PADDING + yardHeight * endzoneSize)
  ctx.moveTo(PADDING, PADDING + fieldH - yardHeight * endzoneSize)
  ctx.lineTo(PADDING + fieldW, PADDING + fieldH - yardHeight * endzoneSize)
  ctx.stroke()

  // Yard lines every 5 yards
  ctx.setLineDash([])
  for (let yard = 5; yard < fieldLength; yard += 5) {
    const y = PADDING + yardHeight * (endzoneSize + yard)
    const isMajor = yard % 10 === 0

    ctx.strokeStyle = isMajor ? COLORS.yardLine : COLORS.yardLineLight
    ctx.lineWidth = isMajor ? 1 : 0.7
    ctx.beginPath()
    ctx.moveTo(PADDING, y)
    ctx.lineTo(PADDING + fieldW, y)
    ctx.stroke()

    // Yard numbers — mirrored from each end
    const displayYard = yard <= fieldLength / 2 ? yard : fieldLength - yard
    if (displayYard > 0 && isMajor) {
      ctx.fillStyle = COLORS.yardNumber
      const numFontSize = Math.max(10, fieldW * 0.032)
      ctx.font = `600 ${numFontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${displayYard}`, PADDING + 20, y)
      ctx.fillText(`${displayYard}`, PADDING + fieldW - 20, y)
    }
  }

  // Hash marks every yard
  ctx.strokeStyle = COLORS.hashMark
  ctx.lineWidth = 0.7
  for (let yard = 1; yard < fieldLength; yard++) {
    if (yard % 5 === 0) continue
    const y = PADDING + yardHeight * (endzoneSize + yard)
    ctx.beginPath()
    ctx.moveTo(PADDING + fieldW * 0.33, y)
    ctx.lineTo(PADDING + fieldW * 0.33 + 6, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(PADDING + fieldW * 0.67 - 6, y)
    ctx.lineTo(PADDING + fieldW * 0.67, y)
    ctx.stroke()
  }

  // Line of Scrimmage — near bottom (offense side). LOS cannot pass first down (top to bottom).
  const rawFirstDown = props.firstDown ?? Math.floor(fieldLength / 2)
  const losValue = draggingLine.value === 'los' && dragYard.value != null ? dragYard.value : lineOfScrimmage
  const firstDownValue = draggingLine.value === 'firstDown' && dragYard.value != null ? dragYard.value : rawFirstDown
  const firstDownCap = Math.max(1, Math.min(fieldLength - 1, firstDownValue))
  const effectiveLOS = Math.min(losValue, firstDownCap)
  const losY = PADDING + yardHeight * (endzoneSize + fieldLength - effectiveLOS)
  const losHover = hoverLine.value === 'los' || draggingLine.value === 'los'
  ctx.save()
  ctx.shadowColor = COLORS.los
  ctx.shadowBlur = losHover ? 6 : 4
  ctx.strokeStyle = losHover ? '#2dd4e0' : COLORS.los
  ctx.lineWidth = losHover ? 3 : 2
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(PADDING, losY)
  ctx.lineTo(PADDING + fieldW, losY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // LOS pill label
  const labelFontSize = Math.max(9, fieldW * 0.022)
  ctx.font = `600 ${labelFontSize}px Inter, sans-serif`
  const losText = `LOS · ${effectiveLOS}yd`
  const losTextW = ctx.measureText(losText).width
  const pillPx = 7
  const pillPy = 3
  const pillR = 4

  ctx.fillStyle = 'rgba(6, 182, 212, 0.12)'
  ctx.beginPath()
  ctx.roundRect(PADDING + 5, losY + 5, losTextW + pillPx * 2, labelFontSize + pillPy * 2, pillR)
  ctx.fill()
  ctx.fillStyle = COLORS.los
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(losText, PADDING + 5 + pillPx, losY + 5 + pillPy)

  // First down line (yard line from offense goal). First down cannot be less than LOS (top to bottom).
  const effectiveFirstDown = Math.max(firstDownValue, effectiveLOS)
  const clampedFirstDown = Math.max(1, Math.min(fieldLength - 1, effectiveFirstDown))
  if (clampedFirstDown > 0 && clampedFirstDown < fieldLength) {
    const fdY = PADDING + yardHeight * (endzoneSize + fieldLength - clampedFirstDown)
    const fdHover = hoverLine.value === 'firstDown' || draggingLine.value === 'firstDown'
    ctx.save()
    ctx.shadowColor = COLORS.firstDown
    ctx.shadowBlur = fdHover ? 5 : 3
    ctx.strokeStyle = fdHover ? '#f59e0b' : COLORS.firstDown
    ctx.lineWidth = fdHover ? 2.5 : 1.5
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(PADDING, fdY)
    ctx.lineTo(PADDING + fieldW, fdY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // 1st down pill label
    const fdText = '1ST DOWN'
    const fdTextW = ctx.measureText(fdText).width
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)'
    ctx.beginPath()
    ctx.roundRect(PADDING + fieldW - fdTextW - pillPx * 2 - 5, fdY + 5, fdTextW + pillPx * 2, labelFontSize + pillPy * 2, pillR)
    ctx.fill()
    ctx.fillStyle = COLORS.firstDown
    ctx.font = `600 ${labelFontSize}px Inter, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(fdText, PADDING + fieldW - fdTextW - pillPx - 5, fdY + 5 + pillPy)
  }

  // No-Run Zones (5 yards from each endzone)
  const nrzZones = [
    { start: 0, end: 5 },
    { start: fieldLength - 5, end: fieldLength },
  ]
  nrzZones.forEach(zone => {
    const zoneStartY = PADDING + yardHeight * (endzoneSize + zone.start)
    const zoneEndY = PADDING + yardHeight * (endzoneSize + zone.end)
    ctx.fillStyle = COLORS.nrz
    ctx.fillRect(PADDING, zoneStartY, fieldW, zoneEndY - zoneStartY)
    ctx.strokeStyle = COLORS.nrzBorder
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    if (zone.start > 0) {
      ctx.moveTo(PADDING, zoneStartY)
      ctx.lineTo(PADDING + fieldW, zoneStartY)
    }
    ctx.moveTo(PADDING, zoneEndY)
    ctx.lineTo(PADDING + fieldW, zoneEndY)
    ctx.stroke()
    ctx.setLineDash([])
  })

  // Draw players at LOS (use effective LOS so they follow while dragging)
  if (props.showPlayers) {
    const losYFraction = (endzoneSize + fieldLength - effectiveLOS) / totalLength
    drawPlayersAtLOS(ctx, fieldW, fieldH, losYFraction)
  }

  // Dimension annotations
  drawDimensionAnnotations(ctx, fieldW, fieldH, yardHeight)

  // Restore from translate
  ctx.restore()
}

function drawPlayersAtLOS(
  ctx: CanvasRenderingContext2D,
  fieldW: number,
  fieldH: number,
  losYFraction: number,
) {
  const radius = Math.max(13, fieldW * 0.032)
  const yardToFraction = 1 / (props.fieldLength + props.endzoneSize * 2)

  const offensePlayers = [
    { label: 'C',  position: 'C',  x: 0.5,  yOffset: 0 },
    { label: 'QB', position: 'QB', x: 0.5,  yOffset: 5 },
    { label: 'WR', position: 'WR', x: 0.15, yOffset: 0 },
    { label: 'WR', position: 'WR', x: 0.85, yOffset: 0 },
    { label: 'WR', position: 'WR', x: 0.70, yOffset: 0 },
  ]

  offensePlayers.forEach((player) => {
    const px = PADDING + player.x * fieldW
    const py = PADDING + (losYFraction + player.yOffset * yardToFraction) * fieldH
    const color = POSITION_COLORS[player.position] ?? '#888888'

    // Drop shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2

    // White filled circle with colored border
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.restore()

    // Colored label inside
    ctx.fillStyle = color
    ctx.font = `700 ${Math.max(9, radius * 0.7)}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.label, px, py)

    // Position label below
    ctx.fillStyle = '#adb5bd'
    ctx.font = `500 ${Math.max(7, radius * 0.45)}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(player.position, px, py + radius + 3)
  })
}

function drawDimensionAnnotations(
  ctx: CanvasRenderingContext2D,
  fieldW: number,
  fieldH: number,
  yardHeight: number,
) {
  const fontSize = Math.max(10, fieldW * 0.02)

  // Width annotation (horizontal at bottom)
  const annoY = PADDING + fieldH + 16
  ctx.strokeStyle = COLORS.dimensionLine
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(PADDING, annoY)
  ctx.lineTo(PADDING + fieldW, annoY)
  ctx.stroke()

  ctx.fillStyle = COLORS.dimensionLine
  drawSmallArrow(ctx, PADDING, annoY, 'right')
  drawSmallArrow(ctx, PADDING + fieldW, annoY, 'left')

  ctx.fillStyle = COLORS.dimensionText
  ctx.font = `500 ${fontSize}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`${props.fieldWidth} yards`, PADDING + fieldW / 2, annoY + 4)

  // Length annotation (vertical on right)
  const annoX = PADDING + fieldW + 16
  const fieldStartY = PADDING + yardHeight * props.endzoneSize
  const fieldEndY = PADDING + fieldH - yardHeight * props.endzoneSize
  ctx.strokeStyle = COLORS.dimensionLine
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(annoX, fieldStartY)
  ctx.lineTo(annoX, fieldEndY)
  ctx.stroke()

  ctx.fillStyle = COLORS.dimensionLine
  drawSmallArrow(ctx, annoX, fieldStartY, 'down')
  drawSmallArrow(ctx, annoX, fieldEndY, 'up')

  ctx.save()
  ctx.fillStyle = COLORS.dimensionText
  ctx.font = `500 ${fontSize}px Inter, sans-serif`
  ctx.translate(annoX + 10, (fieldStartY + fieldEndY) / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`${props.fieldLength} yards`, 0, 0)
  ctx.restore()
}

function drawSmallArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right' | 'up' | 'down'
) {
  const size = 4
  ctx.beginPath()
  switch (direction) {
    case 'right':
      ctx.moveTo(x, y); ctx.lineTo(x + size, y - size / 2); ctx.lineTo(x + size, y + size / 2); break
    case 'left':
      ctx.moveTo(x, y); ctx.lineTo(x - size, y - size / 2); ctx.lineTo(x - size, y + size / 2); break
    case 'down':
      ctx.moveTo(x, y); ctx.lineTo(x - size / 2, y + size); ctx.lineTo(x + size / 2, y + size); break
    case 'up':
      ctx.moveTo(x, y); ctx.lineTo(x - size / 2, y - size); ctx.lineTo(x + size / 2, y - size); break
  }
  ctx.closePath()
  ctx.fill()
}

/** Canvas Y (event.offsetY) to drawing-space Y (same as losY/fdY) */
function canvasToDrawY(offsetY: number): number {
  const layout = layoutRef.value
  if (!layout) return 0
  return offsetY - layout.offsetY + PADDING
}

/** Drawing Y to yard line from offense goal (1..fieldLength-1) */
function drawYToYardFromOffense(drawY: number): number {
  const layout = layoutRef.value
  if (!layout) return props.lineOfScrimmage ?? 25
  const { yardHeight, fieldLength, endzoneSize } = layout
  const raw = fieldLength + endzoneSize - (drawY - PADDING) / yardHeight
  return Math.max(1, Math.min(fieldLength - 1, Math.round(raw)))
}

/** Which line (if any) is at drawing Y; returns the line id and its draw Y for comparison */
function hitTestLine(drawY: number): 'los' | 'firstDown' | null {
  const layout = layoutRef.value
  if (!layout) return null
  const { fieldLength, endzoneSize, yardHeight } = layout
  const losY = PADDING + yardHeight * (endzoneSize + fieldLength - props.lineOfScrimmage)
  const firstDownYard = props.firstDown ?? Math.floor(fieldLength / 2)
  const clampedFD = Math.max(1, Math.min(fieldLength - 1, firstDownYard))
  const fdY = PADDING + yardHeight * (endzoneSize + fieldLength - clampedFD)

  const distLos = Math.abs(drawY - losY)
  const distFd = Math.abs(drawY - fdY)
  if (distLos <= HIT_THRESHOLD && distLos <= distFd) return 'los'
  if (distFd <= HIT_THRESHOLD) return 'firstDown'
  return null
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const drawY = canvasToDrawY(e.offsetY)
  if (draggingLine.value) {
    const yard = drawYToYardFromOffense(drawY)
    const fieldLen = layoutRef.value?.fieldLength ?? props.fieldLength
    const mid = Math.floor(fieldLen / 2)
    // LOS cannot pass first down; first down cannot be less than LOS (top to bottom)
    const clamped =
      draggingLine.value === 'los'
        ? Math.min(yard, props.firstDown ?? mid)
        : Math.max(yard, props.lineOfScrimmage ?? mid)
    dragYard.value = clamped
    if (draggingLine.value === 'los') emit('update:lineOfScrimmage', clamped)
    else emit('update:firstDown', clamped)
    renderField()
  } else {
    const hit = hitTestLine(drawY)
    if (hit !== hoverLine.value) {
      hoverLine.value = hit
      renderField()
    }
  }
}

function onMouseDown(e: MouseEvent) {
  const drawY = canvasToDrawY(e.offsetY)
  const hit = hitTestLine(drawY)
  if (hit) {
    draggingLine.value = hit
    renderField()
  }
}

function onMouseUp() {
  if (draggingLine.value && dragYard.value != null) {
    const payload: { line_of_scrimmage?: number; first_down?: number } = {}
    if (draggingLine.value === 'los') payload.line_of_scrimmage = dragYard.value
    else payload.first_down = dragYard.value
    emit('dragEnd', payload)
    // Clear drag state after parent has applied the update so props are already correct (no snap-back)
    nextTick(() => {
      draggingLine.value = null
      dragYard.value = null
      renderField()
    })
  }
}

function onMouseLeave() {
  if (draggingLine.value && dragYard.value != null) {
    const payload: { line_of_scrimmage?: number; first_down?: number } = {}
    if (draggingLine.value === 'los') payload.line_of_scrimmage = dragYard.value
    else payload.first_down = dragYard.value
    emit('dragEnd', payload)
    nextTick(() => {
      hoverLine.value = null
      draggingLine.value = null
      dragYard.value = null
      renderField()
    })
    return
  }
  hoverLine.value = null
  draggingLine.value = null
  dragYard.value = null
  renderField()
}

watch(
  () => [props.fieldLength, props.fieldWidth, props.endzoneSize, props.lineOfScrimmage, props.firstDown, props.height],
  () => { nextTick(() => renderField()) },
  { deep: true }
)
watch([hoverLine, draggingLine], () => nextTick(() => renderField()))

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    renderField()
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => renderField())
      resizeObserver.observe(containerRef.value)
    }
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.field-preview-container {
  position: relative;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.field-preview-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.field-preview-canvas.cursor-ns-resize {
  cursor: ns-resize;
}
</style>
