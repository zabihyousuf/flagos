<template>
  <div class="shared-play-page">
    <!-- Loading -->
    <div v-if="loading" class="shared-play-loading">
      <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
      <span class="text-sm text-muted-foreground mt-2">Loading shared play...</span>
    </div>

    <!-- Not found -->
    <div v-else-if="error" class="shared-play-error">
      <NuxtLink to="/" class="font-copernicus font-bold text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity mb-6">
        FlagLab
      </NuxtLink>
      <div class="text-muted-foreground/60" aria-hidden="true">
        <Unlink class="w-14 h-14" />
      </div>
      <h1 class="font-display font-semibold text-lg">Play not found</h1>
      <p class="text-sm text-muted-foreground text-center max-w-xs">
        This share link may have been revoked or the play may have been deleted.
      </p>
      <Button as-child variant="outline" size="sm" class="mt-2">
        <NuxtLink to="/">
          <Home class="w-4 h-4 mr-2" />
          Go to FlagLab
        </NuxtLink>
      </Button>
    </div>

    <!-- Play view -->
    <div v-else-if="sharedPlay" class="shared-play-content">
      <!-- Top bar -->
      <header class="shared-play-header">
        <NuxtLink to="/" class="font-copernicus font-bold text-base tracking-tight text-foreground hover:opacity-80 transition-opacity shrink-0">
          FlagLab
        </NuxtLink>
        <div class="flex items-center gap-2 min-w-0 ml-4">
          <div
            class="w-6 h-6 rounded flex items-center justify-center shrink-0"
            :class="sharedPlay.play_type === 'offense' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
          >
            <Swords v-if="sharedPlay.play_type === 'offense'" class="w-3 h-3" />
            <ShieldCheck v-else class="w-3 h-3" />
          </div>
          <h1 class="text-sm font-medium truncate">{{ sharedPlay.play_name }}</h1>
          <span v-if="sharedPlay.play_formation" class="text-xs text-muted-foreground shrink-0">
            · {{ sharedPlay.play_formation }}
          </span>
        </div>
        <div class="flex-1" />
        <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="handlePrint">
          <Printer class="w-4 h-4" />
        </Button>
      </header>

      <!-- Canvas -->
      <div class="shared-play-canvas-area">
        <div ref="canvasContainerRef" class="shared-play-canvas">
          <canvas ref="canvasRef" class="block w-full h-full" />
        </div>
      </div>

      <!-- Footer -->
      <footer class="shared-play-footer">
        <p class="text-xs text-muted-foreground">
          Created with <NuxtLink to="/" class="underline hover:text-foreground transition-colors">FlagLab</NuxtLink>
           — The play designer for flag football
        </p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Loader2, Unlink, Home, Swords, ShieldCheck, Printer } from 'lucide-vue-next'

definePageMeta({
  layout: false,
})

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref(false)
const sharedPlay = ref<{
  play_name: string
  play_type: string
  play_formation: string | null
  play_snapshot: CanvasData
} | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const { render } = useCanvasRenderer()

onMounted(async () => {
  try {
    const client = useSupabaseClient()
    const { data, error: fetchError } = await client
      .from('shared_plays')
      .select('play_name, play_type, play_formation, play_snapshot')
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (fetchError || !data) {
      error.value = true
    } else {
      sharedPlay.value = data as any
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }

  await nextTick()
  scheduleDraw()
})

function draw() {
  const canvas = canvasRef.value
  const container = canvasContainerRef.value
  const data = sharedPlay.value?.play_snapshot
  if (!canvas || !container || !data?.players?.length) return

  const w = Math.max(1, container.clientWidth)
  const h = Math.max(1, container.clientHeight)
  if (w <= 0 || h <= 0) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const fs = DEFAULT_FIELD_SETTINGS
  const ghostPlayers: CanvasPlayer[] = (data as any)._ghost_players ?? []
  render(ctx, canvas, data, {
    fieldLength: fs.field_length,
    fieldWidth: fs.field_width,
    endzoneSize: fs.endzone_size,
    lineOfScrimmage: fs.line_of_scrimmage,
    firstDownYardLine: fs.first_down ?? Math.floor(fs.field_length / 2),
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    selectedPlayerId: null,
    viewMode: 'full',
    playType: (sharedPlay.value?.play_type as 'offense' | 'defense') ?? 'offense',
    showPlayerNames: true,
    ghostPlayers: ghostPlayers.length ? ghostPlayers : undefined,
  })
}

function handlePrint() {
  globalThis.print()
}

function scheduleDraw() {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(draw)
    })
  })
}

let ro: ResizeObserver | null = null
watch(canvasContainerRef, (container) => {
  if (container) {
    ro = new ResizeObserver(scheduleDraw)
    ro.observe(container)
  }
})

onUnmounted(() => ro?.disconnect())

useHead({
  title: computed(() => sharedPlay.value ? `${sharedPlay.value.play_name} — FlagLab` : 'Shared Play — FlagLab'),
})
</script>

<style scoped>
.shared-play-page {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.shared-play-loading,
.shared-play-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
}

.shared-play-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.shared-play-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-card);
  shrink: 0;
}

.shared-play-canvas-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--color-background);
}

.shared-play-canvas {
  width: 100%;
  max-width: 720px;
  aspect-ratio: 25 / 64;
  max-height: 100%;
}

.shared-play-footer {
  padding: 0.75rem 1rem;
  text-align: center;
  border-top: 1px solid var(--color-border);
  background: var(--color-card);
}

@media print {
  .shared-play-page {
    height: auto;
    overflow: visible;
  }
  .shared-play-header,
  .shared-play-footer {
    display: none;
  }
  .shared-play-canvas-area {
    padding: 0;
  }
  .shared-play-canvas {
    max-width: 100%;
    max-height: none;
  }
}
</style>
