<template>
  <div ref="containerRef" class="play-preview-container rounded-md overflow-hidden bg-[#f0f0f0] dark:bg-[#2a2a2a] border border-border/50">
    <canvas v-show="hasData" ref="canvasRef" class="play-preview-canvas block w-full h-full" />
    <div v-if="!hasData" class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No formation</div>
  </div>
</template>

<script setup lang="ts">
import type { Play } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'

const props = withDefaults(
  defineProps<{
    play: Play | null
    height?: number
  }>(),
  { height: 140 }
)

const hasData = computed(() => (props.play?.canvas_data?.players?.length ?? 0) > 0)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const { render } = useCanvasRenderer()

function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  const data = props.play?.canvas_data
  if (!canvas || !container || !data?.players?.length) return
  const w = Math.max(1, container.clientWidth)
  const h = Math.max(1, props.height)
  if (w <= 0 || h <= 0) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const fs = DEFAULT_FIELD_SETTINGS
  // B&W miniature: no field, zoomed to fit play, small circles and numbers only
  render(ctx, canvas, data, {
    fieldLength: fs.field_length,
    fieldWidth: fs.field_width,
    endzoneSize: fs.endzone_size,
    lineOfScrimmage: fs.line_of_scrimmage,
    firstDownYardLine: fs.first_down ?? Math.floor(fs.field_length / 2),
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    selectedPlayerId: null,
    viewMode: 'fit',
    playType: props.play?.play_type ?? 'offense',
    showPlayerNames: false,
    thumbnailMode: true,
  })
}

function scheduleDraw() {
  nextTick(() => {
    // Double rAF so layout is complete and container has real dimensions (avoids 0-width → single dot)
    requestAnimationFrame(() => {
      requestAnimationFrame(draw)
    })
  })
}

onMounted(() => {
  scheduleDraw()
  const container = containerRef.value
  if (container) {
    const ro = new ResizeObserver(scheduleDraw)
    ro.observe(container)
    onUnmounted(() => ro.disconnect())
  }
})
watch(
  () => [props.play?.id, props.play?.canvas_data, props.height] as const,
  scheduleDraw,
  { deep: true }
)
</script>

<style scoped>
.play-preview-container {
  height: v-bind(height + 'px');
  min-height: 80px;
}
.play-preview-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
</style>
