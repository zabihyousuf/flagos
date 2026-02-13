<template>
  <div class="w-full h-full bg-card  flex flex-col overflow-hidden">
    <!-- Panel Header -->
    <div class="h-10 flex items-center justify-between px-3 shrink-0">
      <span class="text-xs font-semibold text-foreground">Roster</span>
      <span class="text-[12px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{{ players.length }}/5</span>
    </div>

    <div class="p-2 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-0 flex-1">
      <!-- On Field -->
      <div v-if="players.length > 0" class="space-y-1">
        <p class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">On the Field</p>
        <div class="space-y-1">
          <div
            v-for="player in players"
            :key="player.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors border border-transparent"
            :class="player.id === selectedPlayerId ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted/50 hover:border-border/50'"
            @click="$emit('select-player', player.id)"
          >
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
              :style="{ background: posColor(player.position) }"
            >
              {{ player.designation }}
            </div>
            <span class="text-xs flex-1 truncate font-medium">{{ player.name ?? player.position }}</span>
            <button
              class="text-muted-foreground hover:text-destructive text-xs opacity-60 hover:opacity-100 transition-opacity p-1"
              @click.stop="$emit('remove-player', player.id)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4 bg-muted/10 rounded border border-dashed border-border/50">
        <p class="text-[12px] text-muted-foreground">Field is empty</p>
      </div>

      <!-- Bench -->
      <div class="space-y-1 flex-1">
        <p class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Bench</p>
        <div class="space-y-1">
          <div
            v-for="player in benchPlayers"
            :key="player.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors group"
            draggable="true"
            @dragstart="(e: DragEvent) => handleDragStart(e, player)"
            @click="handleBenchClick(player)"
          >
            <span class="text-[11px] text-muted-foreground font-mono w-5 text-center">{{ player.number }}</span>
            <span class="text-xs flex-1 truncate font-medium">{{ player.name }}</span>
            <Plus class="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p v-if="benchPlayers.length === 0" class="text-[12px] text-muted-foreground text-center py-2 italic font-medium">
            {{ players.length >= 5 ? 'Field full' : 'No bench players' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasPlayer, Player } from '~/lib/types'
import { POSITION_COLORS } from '~/lib/constants'
import { X, Plus } from 'lucide-vue-next'

const props = defineProps<{
  players: CanvasPlayer[]
  selectedPlayerId: string | null
  allRoster: Player[]
  playType: 'offense' | 'defense'
}>()

const emit = defineEmits<{
  'select-player': [id: string]
  'remove-player': [playerId: string]
  'add-player': [player: Player]
}>()

function posColor(pos: string) {
  return POSITION_COLORS[pos] ?? '#888888'
}

const benchPlayers = computed(() => {
  if (!props.allRoster) return []
  const onFieldIds = new Set(
    props.players
      .filter((p) => p.name && p.number)
      .map((p) => `${p.name}-${p.number}`),
  )
  const posField = props.playType === 'offense' ? 'offense_positions' : 'defense_positions'
  return props.allRoster.filter((p) => {
    if (onFieldIds.has(`${p.name}-${p.number}`)) return false
    const positions = p[posField] as string[] | undefined
    return positions && positions.length > 0
  })
})

function handleDragStart(e: DragEvent, player: Player) {
  e.dataTransfer?.setData('text/player-id', player.id)
}

function handleBenchClick(player: Player) {
  if (props.players.length >= 5) return
  emit('add-player', player)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>
