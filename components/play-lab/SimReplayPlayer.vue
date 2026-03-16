<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Field canvas -->
    <div ref="containerRef" class="flex-1 min-h-0 relative bg-muted/30 flex items-center justify-center">
      <canvas
        ref="canvasRef"
        class="block"
      />
    </div>

    <!-- Playback controls -->
    <div class="shrink-0 border-t border-border/60 px-4 py-2.5 flex items-center gap-3">
      <!-- Transport -->
      <button
        type="button"
        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Restart"
        @click="restart"
      >
        <SkipBack :size="14" />
      </button>
      <button
        type="button"
        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Back 0.5s"
        @click="stepBack"
      >
        <ChevronLeft :size="14" />
      </button>
      <button
        type="button"
        class="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        :title="playing ? 'Pause (Space)' : 'Play (Space)'"
        @click="togglePlay"
      >
        <Pause v-if="playing" :size="14" />
        <Play v-else :size="14" />
      </button>
      <button
        type="button"
        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Forward 0.5s"
        @click="stepForward"
      >
        <ChevronRight :size="14" />
      </button>
      <button
        type="button"
        class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="End"
        @click="goToEnd"
      >
        <SkipForward :size="14" />
      </button>

      <!-- Scrubber -->
      <input
        type="range"
        :min="0"
        :max="totalTicks"
        :value="tick"
        class="flex-1 h-1 accent-primary cursor-pointer"
        @input="onScrub"
      />

      <!-- Time display -->
      <span class="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap w-16 text-right">
        {{ (tick / 60).toFixed(1) }}s / {{ (totalTicks / 60).toFixed(1) }}s
      </span>

      <!-- Speed -->
      <div class="flex items-center gap-0.5">
        <button
          v-for="s in speeds"
          :key="s"
          type="button"
          class="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
          :class="speed === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'"
          @click="speed = s"
        >
          {{ s }}x
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { POSITION_COLORS } from '~/lib/constants'
import { useTheme } from '~/composables/useTheme'

interface TracePoint {
  x: number
  y: number
}

interface PlayerMeta {
  team: 'offense' | 'defense'
  position: string
}

interface RecordingEvent {
  tick: number
  type: string
  position: [number, number]
  player_id: string | null
}

interface FieldGeometry {
  endzone_depth_m: number | null
  los_m: number | null
  first_down_m: number | null
  total_length_m: number | null
  field_width_m: number | null
}

interface RecordingData {
  events: RecordingEvent[]
  penalties: { type: string; tick: number; player_id: string | null }[]
  field: FieldGeometry | null
  player_meta: Record<string, PlayerMeta>
  player_traces: Record<string, TracePoint[]>
  designed_routes?: Record<string, TracePoint[]>
}

/** Optional display info from the play's canvas (name, number) for labels. */
export interface PlayerLabelInfo {
  name?: string
  number?: number
  position: string
}

const props = withDefaults(
  defineProps<{
    recording: RecordingData
    ticks: number
    carrierId?: string | null
    throwerId?: string | null
    receiverId?: string | null
    /** Start playback automatically when a replay is selected. */
    autoPlay?: boolean
    /** When playback reaches the end, loop from the start until paused. */
    loop?: boolean
    /** Player id -> { name, number, position } from play designer (for labels). */
    playerLabels?: Record<string, PlayerLabelInfo>
    /** Whether to show names/numbers (play designer setting). */
    showPlayerNames?: boolean
    /** What to show in marker: number | position | both | none (play designer setting). */
    playerLabelType?: 'number' | 'position' | 'both' | 'none'
  }>(),
  {
    autoPlay: false,
    loop: false,
    playerLabels: () => ({}),
    showPlayerNames: true,
    playerLabelType: 'position',
  }
)

const theme = useTheme()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const tick = ref(0)
const playing = ref(false)
const speed = ref(1)
const speeds = [0.25, 0.5, 1, 2]

const totalTicks = computed(() => props.ticks || 0)
const playerIds = computed(() => Object.keys(props.recording?.player_traces ?? {}))

// Event tracking
const snapEvent = computed(() => props.recording?.events?.find(e => e.type === 'SNAP') ?? null)
const throwEvent = computed(() => props.recording?.events?.find(e => e.type === 'THROW') ?? null)
const catchEvent = computed(() => {
  const types = ['CATCH', 'INTERCEPTION', 'INCOMPLETE_PASS', 'BALL_HIT_GROUND']
  return props.recording?.events?.find(e => types.includes(e.type)) ?? null
})
/** Find the Center player ID from meta for pre-snap ball holder. */
const centerPlayerId = computed(() => {
  const meta = props.recording?.player_meta
  if (!meta) return null
  for (const [pid, m] of Object.entries(meta)) {
    if (m.position === 'C' && m.team === 'offense') return pid
  }
  return null
})

// Animation
let animFrame: number | null = null
let lastTime = 0
let tickAccum = 0

function animate(time: number) {
  if (!playing.value) return
  const delta = time - lastTime
  lastTime = time
  tickAccum += (delta / 1000) * 60 * speed.value
  const advance = Math.floor(tickAccum)
  tickAccum -= advance
  tick.value = Math.min(tick.value + advance, totalTicks.value)
  if (tick.value >= totalTicks.value) {
    if (props.loop && totalTicks.value > 0) {
      tick.value = 0
      tickAccum = 0
      lastTime = performance.now()
    } else {
      playing.value = false
    }
  }
  renderFrame()
  if (playing.value) {
    animFrame = requestAnimationFrame(animate)
  }
}

function startAnimation() {
  lastTime = performance.now()
  tickAccum = 0
  animFrame = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (animFrame != null) {
    cancelAnimationFrame(animFrame)
    animFrame = null
  }
}

watch(playing, (isPlaying) => {
  if (isPlaying) {
    if (tick.value >= totalTicks.value) tick.value = 0
    startAnimation()
  } else {
    stopAnimation()
  }
})

// Controls
function togglePlay() { playing.value = !playing.value }
function restart() { tick.value = 0; playing.value = false; renderFrame() }
function goToEnd() { tick.value = totalTicks.value; playing.value = false; renderFrame() }
function stepBack() { tick.value = Math.max(0, tick.value - 30); playing.value = false; renderFrame() }
function stepForward() { tick.value = Math.min(totalTicks.value, tick.value + 30); playing.value = false; renderFrame() }
function onScrub(e: Event) {
  tick.value = Number((e.target as HTMLInputElement).value)
  playing.value = false
  renderFrame()
}

// Keyboard
function handleKey(e: KeyboardEvent) {
  if (e.key === ' ') { e.preventDefault(); togglePlay() }
  if (e.key === 'ArrowRight') { tick.value = Math.min(totalTicks.value, tick.value + 10); renderFrame() }
  if (e.key === 'ArrowLeft') { tick.value = Math.max(0, tick.value - 10); renderFrame() }
}

// ---- Rendering ----
function renderFrame() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rec = props.recording
  if (!rec?.player_traces || !rec?.player_meta) return

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  // Field aspect ratio: use actual field geometry or default 25:80
  const fieldWidthYd = rec.field?.field_width_m ?? 25
  const totalLengthYd = rec.field?.total_length_m ?? 80
  const aspect = fieldWidthYd / totalLengthYd

  const padding = 32
  const availW = rect.width - padding * 2
  const availH = rect.height - padding * 2

  let fieldW: number, fieldH: number
  if (availW / availH > aspect) {
    fieldH = availH
    fieldW = fieldH * aspect
  } else {
    fieldW = availW
    fieldH = fieldW / aspect
  }

  const offsetX = (rect.width - fieldW) / 2
  const offsetY = (rect.height - fieldH) / 2

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const isDark = theme.resolvedDark.value

  // Clear
  ctx.clearRect(0, 0, rect.width, rect.height)

  // Endzone fraction
  const endzoneDepth = rec.field?.endzone_depth_m ?? 7
  const ezFrac = endzoneDepth / totalLengthYd
  const ezH = ezFrac * fieldH

  // --- Field background ---
  ctx.fillStyle = isDark ? '#1a2e0d' : '#fafbfc'
  ctx.fillRect(offsetX, offsetY + ezH, fieldW, fieldH - ezH * 2)

  // Endzones
  ctx.fillStyle = isDark ? '#122008' : '#f0f1f3'
  ctx.fillRect(offsetX, offsetY, fieldW, ezH)
  ctx.fillRect(offsetX, offsetY + fieldH - ezH, fieldW, ezH)

  // Field border
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.22)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(offsetX, offsetY, fieldW, fieldH)

  // Endzone separator lines
  ctx.beginPath()
  ctx.moveTo(offsetX, offsetY + ezH)
  ctx.lineTo(offsetX + fieldW, offsetY + ezH)
  ctx.moveTo(offsetX, offsetY + fieldH - ezH)
  ctx.lineTo(offsetX + fieldW, offsetY + fieldH - ezH)
  ctx.stroke()

  // Endzone labels
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.28)'
  const ezFontSize = Math.max(10, fieldW * 0.04)
  ctx.font = `700 ${ezFontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('END ZONE', offsetX + fieldW / 2, offsetY + ezH / 2)
  ctx.fillText('END ZONE', offsetX + fieldW / 2, offsetY + fieldH - ezH / 2)

  // Yard lines every 5 yards
  const playableYd = totalLengthYd - endzoneDepth * 2
  const playableH = fieldH - ezH * 2
  const ydToPixel = playableH / playableYd

  ctx.setLineDash([])
  for (let yd = 5; yd < playableYd; yd += 5) {
    const y = offsetY + ezH + yd * ydToPixel
    const isMajor = yd % 10 === 0
    ctx.strokeStyle = isDark
      ? (isMajor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)')
      : (isMajor ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.18)')
    ctx.lineWidth = isMajor ? 1 : 0.7
    ctx.beginPath()
    ctx.moveTo(offsetX, y)
    ctx.lineTo(offsetX + fieldW, y)
    ctx.stroke()

    if (isMajor) {
      const displayYd = yd <= playableYd / 2 ? yd : playableYd - yd
      if (displayYd > 0) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(59,130,246,0.45)'
        ctx.font = `600 ${Math.max(9, fieldW * 0.028)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${displayYd}`, offsetX + 16, y)
        ctx.fillText(`${displayYd}`, offsetX + fieldW - 16, y)
      }
    }
  }

  // LOS line (normalized y: 0=offense endzone, 1=defense endzone)
  // In our canvas: top = defense endzone, bottom = offense endzone
  // So norm y=0 (offense endzone) maps to bottom, y=1 (defense endzone) maps to top
  const losNormY = rec.field?.los_m && rec.field?.total_length_m
    ? rec.field.los_m / rec.field.total_length_m
    : 0.125
  const losCanvasY = offsetY + fieldH - losNormY * fieldH
  ctx.save()
  ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.7)' : 'rgba(59,130,246,0.65)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(offsetX, losCanvasY)
  ctx.lineTo(offsetX + fieldW, losCanvasY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // LOS label
  ctx.fillStyle = isDark ? 'rgba(251,191,36,0.6)' : 'rgba(59,130,246,0.65)'
  ctx.font = `600 ${Math.max(8, fieldW * 0.022)}px system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('LOS', offsetX + 4, losCanvasY + 4)

  // First down line
  const fdNormY = rec.field?.first_down_m && rec.field?.total_length_m
    ? rec.field.first_down_m / rec.field.total_length_m
    : null
  if (fdNormY != null) {
    const fdCanvasY = offsetY + fieldH - fdNormY * fieldH
    ctx.save()
    ctx.strokeStyle = isDark ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.55)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(offsetX, fdCanvasY)
    ctx.lineTo(offsetX + fieldW, fdCanvasY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    ctx.fillStyle = isDark ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.55)'
    ctx.font = `600 ${Math.max(8, fieldW * 0.022)}px system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('1ST', offsetX + fieldW - 4, fdCanvasY + 4)
  }

  // --- Helper: normalized coords to canvas pixels ---
  // normalized: x 0=left, 1=right; y 0=offense endzone (bottom), 1=defense endzone (top)
  function normToCanvas(nx: number, ny: number): { cx: number; cy: number } {
    return {
      cx: offsetX + nx * fieldW,
      cy: offsetY + fieldH - ny * fieldH,
    }
  }

  // --- Designed routes (dashed lines) ---
  const designedRoutes = rec.designed_routes
  if (designedRoutes) {
    ctx.save()
    ctx.setLineDash([4, 3])
    ctx.lineWidth = 1.5
    for (const [pid, waypoints] of Object.entries(designedRoutes)) {
      if (!waypoints || waypoints.length < 2) continue
      const meta = rec.player_meta[pid]
      if (!meta) continue
      const color = POSITION_COLORS[meta.position] ?? (meta.team === 'offense' ? '#60a5fa' : '#f87171')
      ctx.strokeStyle = isDark
        ? color + '55'  // 33% opacity in dark mode
        : color + '44'  // 27% opacity in light mode
      ctx.beginPath()
      const first = normToCanvas(waypoints[0].x, waypoints[0].y)
      ctx.moveTo(first.cx, first.cy)
      for (let i = 1; i < waypoints.length; i++) {
        const { cx: wx, cy: wy } = normToCanvas(waypoints[i].x, waypoints[i].y)
        ctx.lineTo(wx, wy)
      }
      ctx.stroke()

      // Arrow at last waypoint
      if (waypoints.length >= 2) {
        const last = normToCanvas(waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].y)
        const prev = normToCanvas(waypoints[waypoints.length - 2].x, waypoints[waypoints.length - 2].y)
        const dx = last.cx - prev.cx
        const dy = last.cy - prev.cy
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 1) {
          const nx = dx / len
          const ny = dy / len
          const arrowSize = 5
          ctx.beginPath()
          ctx.moveTo(last.cx, last.cy)
          ctx.lineTo(last.cx - nx * arrowSize + ny * arrowSize * 0.5, last.cy - ny * arrowSize - nx * arrowSize * 0.5)
          ctx.moveTo(last.cx, last.cy)
          ctx.lineTo(last.cx - nx * arrowSize - ny * arrowSize * 0.5, last.cy - ny * arrowSize + nx * arrowSize * 0.5)
          ctx.stroke()
        }
      }
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  // --- Actual trace lines (solid, from start to current tick) ---
  const currentTick = tick.value
  ctx.save()
  ctx.lineWidth = 1.2
  for (const pid of playerIds.value) {
    const trace = rec.player_traces[pid]
    const meta = rec.player_meta[pid]
    if (!trace || !meta || trace.length < 2) continue
    // Only draw traces for offense players (routes)
    if (meta.team !== 'offense') continue
    const color = POSITION_COLORS[meta.position] ?? '#60a5fa'
    ctx.strokeStyle = isDark
      ? color + '88'  // 53% opacity
      : color + '66'  // 40% opacity
    const endIdx = Math.min(currentTick, trace.length - 1)
    if (endIdx < 1) continue
    ctx.beginPath()
    const start = normToCanvas(trace[0].x, trace[0].y)
    ctx.moveTo(start.cx, start.cy)
    // Sample every 3 ticks for performance
    for (let i = 3; i <= endIdx; i += 3) {
      const { cx: tx, cy: ty } = normToCanvas(trace[i].x, trace[i].y)
      ctx.lineTo(tx, ty)
    }
    // Always include the current position
    const last = normToCanvas(trace[endIdx].x, trace[endIdx].y)
    ctx.lineTo(last.cx, last.cy)
    ctx.stroke()
  }
  ctx.restore()

  // --- Players ---
  const radius = Math.max(10, Math.min(14, fieldW * 0.035))

  for (const pid of playerIds.value) {
    const trace = rec.player_traces[pid]
    const meta = rec.player_meta[pid]
    if (!trace || !meta) continue
    const t = currentTick < trace.length ? currentTick : trace.length - 1
    const pos = trace[t]
    if (!pos) continue

    const { cx, cy } = normToCanvas(pos.x, pos.y)
    const color = POSITION_COLORS[meta.position] ?? (meta.team === 'offense' ? '#60a5fa' : '#f87171')

    // Carrier logic with snap phases:
    // 1. Before SNAP: Center holds the ball
    // 2. After SNAP until QB catches snap: ball in flight (no carrier highlight)
    // 3. QB has ball from snap delivery until THROW
    // 4. After THROW until catch: ball in flight (no carrier highlight)
    // 5. After catch: receiver/interceptor is carrier
    const snapTick = snapEvent.value?.tick ?? 0
    const snapDeliveryTick = snapTick + 6 // ~0.1s for snap to reach QB
    const throwTick = throwEvent.value?.tick ?? Infinity
    const catchTick = catchEvent.value?.tick ?? Infinity

    let isCarrier = false
    if (currentTick < snapTick) {
      // Pre-snap: Center holds ball
      isCarrier = pid === centerPlayerId.value
    } else if (currentTick >= snapTick && currentTick < snapDeliveryTick) {
      // Snap in flight — no one is carrier
      isCarrier = false
    } else if (currentTick >= snapDeliveryTick && currentTick < throwTick) {
      // QB has ball
      isCarrier = pid === props.throwerId
    } else if (currentTick >= throwTick && currentTick < catchTick) {
      // Ball in flight after throw — no carrier
      isCarrier = false
    } else if (currentTick >= catchTick) {
      // Receiver/interceptor caught ball
      isCarrier = pid === props.carrierId
    }

    // Carrier highlight ring
    if (isCarrier) {
      ctx.save()
      ctx.strokeStyle = isDark ? '#fbbf24' : '#f59e0b'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Player circle - white fill with colored border (matching FieldPreview style)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 1

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = isDark ? 'rgba(30,30,30,0.95)' : '#ffffff'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.restore()

    // Label: respect play designer settings (showPlayerNames, playerLabelType, playerLabels)
    const labelType = props.showPlayerNames !== false ? (props.playerLabelType ?? 'position') : 'position'
    const info = props.playerLabels?.[pid] ?? { position: meta.position }
    let labelText = ''
    if (labelType === 'none') {
      labelText = ''
    } else if (labelType === 'number') {
      labelText = info.number != null ? String(info.number) : meta.position
    } else if (labelType === 'both') {
      if (info.name != null && info.number != null) labelText = `${info.name} #${info.number}`
      else if (info.number != null) labelText = String(info.number)
      else labelText = meta.position
    } else {
      labelText = meta.position
    }
    if (labelText) {
      const maxLen = 12
      const displayText = labelText.length > maxLen ? labelText.slice(0, maxLen - 1) + '…' : labelText
      const baseSize = Math.max(8, Math.min(radius * 0.9, 14))
      const fontSize = displayText.length <= 4 ? baseSize : Math.max(7, baseSize * (4 / Math.max(4, displayText.length)))
      ctx.fillStyle = color
      ctx.font = `700 ${fontSize}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(displayText, cx, cy)
    }
  }

  // --- Ball in flight (snap or throw) ---
  const snapTk = snapEvent.value?.tick ?? 0
  const snapDelivTk = snapTk + 6
  const throwTk = throwEvent.value?.tick ?? Infinity
  const catchTk = catchEvent.value?.tick ?? Infinity

  let ballInFlight = false
  let ballStartPos: [number, number] | null = null
  let ballEndPos: [number, number] | null = null
  let ballProgress = 0

  // Snap in flight: Center → QB
  if (currentTick >= snapTk && currentTick < snapDelivTk) {
    const centerId = centerPlayerId.value
    const qbId = props.throwerId
    if (centerId && qbId) {
      const cTrace = rec.player_traces[centerId]
      const qTrace = rec.player_traces[qbId]
      if (cTrace && qTrace) {
        const cPos = cTrace[Math.min(snapTk, cTrace.length - 1)]
        const qPos = qTrace[Math.min(snapDelivTk, qTrace.length - 1)]
        if (cPos && qPos) {
          ballInFlight = true
          ballStartPos = [cPos.x, cPos.y]
          ballEndPos = [qPos.x, qPos.y]
          ballProgress = Math.min(1, (currentTick - snapTk) / Math.max(snapDelivTk - snapTk, 1))
        }
      }
    }
  }

  // Throw in flight: QB → receiver
  if (!ballInFlight && throwEvent.value && catchEvent.value && currentTick >= throwTk && currentTick < catchTk) {
    ballInFlight = true
    ballStartPos = throwEvent.value.position
    ballEndPos = catchEvent.value.position
    const flightDuration = catchTk - throwTk
    ballProgress = Math.min(1, (currentTick - throwTk) / Math.max(flightDuration, 1))
  }

  if (ballInFlight && ballStartPos && ballEndPos) {
    const bx = ballStartPos[0] + (ballEndPos[0] - ballStartPos[0]) * ballProgress
    const by = ballStartPos[1] + (ballEndPos[1] - ballStartPos[1]) * ballProgress
    const { cx: ballCx, cy: ballCy } = normToCanvas(bx, by)

    const arcOffset = Math.sin(ballProgress * Math.PI) * 8

    ctx.save()
    ctx.shadowColor = 'rgba(251,191,36,0.4)'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(ballCx, ballCy - arcOffset, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }
}

// Resize handling
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    renderFrame()
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => renderFrame())
      resizeObserver.observe(containerRef.value)
    }
  })
  window.addEventListener('keydown', handleKey)
  if (props.autoPlay && props.recording?.player_traces) {
    setTimeout(() => { playing.value = true }, 150)
  }
})

onUnmounted(() => {
  stopAnimation()
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', handleKey)
})

// Re-render when recording data changes; optionally auto-play after short delay
watch(() => props.recording, () => {
  tick.value = 0
  playing.value = false
  nextTick(() => {
    renderFrame()
    if (props.autoPlay && props.recording?.player_traces) {
      setTimeout(() => { playing.value = true }, 120)
    }
  })
}, { deep: false })

watch(() => theme.resolvedDark.value, () => renderFrame())
</script>
