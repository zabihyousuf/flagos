<template>
  <div ref="containerRef" class="field-preview-container" :style="{ height: height + 'px' }">
    <canvas ref="canvasRef" class="field-preview-canvas" />
  </div>
</template>

<script setup lang="ts">
import { POSITION_COLORS } from '~/lib/constants'

const props = withDefaults(defineProps<{
  fieldLength?: number
  fieldWidth?: number
  endzoneSize?: number
  lineOfScrimmage?: number
  height?: number
  showPlayers?: boolean
}>(), {
  fieldLength: 70,
  fieldWidth: 40,
  endzoneSize: 10,
  lineOfScrimmage: 25,
  height: 520,
  showPlayers: true,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const PADDING = 40

// Clean white/grey color palette
// Clean dark color palette
const COLORS = {
  background: '#0f172a', // slate-900
  fieldFill: '#1e293b',   // slate-800
  fieldBorder: '#334155', // slate-700
  yardLine: 'rgba(255,255,255,0.1)',
  yardLineLight: 'rgba(255,255,255,0.05)',
  yardNumber: '#94a3b8',  // slate-400
  hashMark: 'rgba(255,255,255,0.1)',
  endzoneFill: '#0f172a', // slate-900
  endzoneBorder: '#334155',
  endzoneText: '#475569', // slate-600
  los: '#22d3ee',         // cyan-400
  firstDown: '#fbbf24',   // amber-400
  nrz: 'rgba(251, 191, 36, 0.05)',
  nrzBorder: 'rgba(251, 191, 36, 0.2)',
  dimensionLine: '#475569',
  dimensionText: '#94a3b8',
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

  // White background (full canvas)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, canvasW, canvasH)

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

  // Line of Scrimmage — near bottom (offense side)
  const losY = PADDING + yardHeight * (endzoneSize + fieldLength - lineOfScrimmage)
  ctx.save()
  ctx.shadowColor = COLORS.los
  ctx.shadowBlur = 4
  ctx.strokeStyle = COLORS.los
  ctx.lineWidth = 2
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
  const losText = `LOS · ${lineOfScrimmage}yd`
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

  // First down line at midfield
  const midfield = Math.floor(fieldLength / 2)
  if (midfield > 0 && midfield < fieldLength) {
    const fdY = PADDING + yardHeight * (endzoneSize + midfield)
    ctx.save()
    ctx.shadowColor = COLORS.firstDown
    ctx.shadowBlur = 3
    ctx.strokeStyle = COLORS.firstDown
    ctx.lineWidth = 1.5
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

  // Draw players at LOS
  if (props.showPlayers) {
    const losYFraction = (endzoneSize + fieldLength - lineOfScrimmage) / totalLength
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

watch(
  () => [props.fieldLength, props.fieldWidth, props.endzoneSize, props.lineOfScrimmage, props.height],
  () => { nextTick(() => renderField()) },
  { deep: true }
)

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
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid hsl(var(--border));
}

.field-preview-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
