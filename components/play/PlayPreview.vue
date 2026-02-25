<template>
  <div ref="containerRef" class="play-preview-container overflow-hidden">
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
  const h = Math.max(1, container.clientHeight || props.height)
  if (w <= 0 || h <= 0) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const fs = DEFAULT_FIELD_SETTINGS
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
    previewScale: 0.2,
    fitAllContent: true,
    hideField: true,
    dotMode: true,
  })
}

function scheduleDraw() {
  nextTick(() => {
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
  width: 100%;
  height: 100%;
}
.play-preview-canvas {
  width: 100%;
  height: 100%;
}
</style>
