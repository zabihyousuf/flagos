<template>
  <PlayCanvas
    ref="canvasRef"
    :initial-data="mergedCanvasData"
    :play-type="'offense'"
    :field-settings="fieldSettings"
    :view-mode="'full'"
    :animated-positions="animatedPositions"
    :animated-ball="animatedBall"
    :simulation-mode="true"
    :show-player-names="true"
  />
</template>

<script setup lang="ts">
import type { CanvasData, CanvasPlayer } from '~/lib/types'
import PlayCanvas from '~/components/canvas/PlayCanvas.vue'

const props = defineProps<{
  offensePlayers: CanvasPlayer[]
  defensePlayers: CanvasPlayer[]
  fieldSettings: {
    field_length: number
    field_width: number
    endzone_size: number
    line_of_scrimmage: number
    first_down?: number
  }
  animatedPositions?: Map<string, { x: number; y: number }>
  animatedBall?: { x: number; y: number; visible: boolean; inFlight: boolean }
}>()

const canvasRef = ref<InstanceType<typeof PlayCanvas> | null>(null)

/** Combine offense + defense players into a single CanvasData for PlayCanvas. */
const mergedCanvasData = computed<CanvasData>(() => ({
  version: 2,
  players: [...props.offensePlayers, ...props.defensePlayers],
  annotations: [],
}))

defineExpose({
  canvasRef,
})
</script>
