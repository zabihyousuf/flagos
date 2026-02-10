<template>
  <Card class="glass glass-hover transition-all duration-200 cursor-pointer group">
    <CardContent class="p-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-primary shrink-0">
          #{{ player.number }}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold truncate">{{ player.name }}</h3>
          <div class="flex gap-1.5 mt-1 flex-wrap">
            <Badge
              v-for="pos in player.offense_positions"
              :key="'o-' + pos"
              variant="secondary"
              class="text-xs"
              :style="{ borderColor: POSITION_COLORS[pos], color: POSITION_COLORS[pos] }"
            >
              {{ pos }}
            </Badge>
            <Badge
              v-for="pos in player.defense_positions"
              :key="'d-' + pos"
              variant="outline"
              class="text-xs"
              :style="{ borderColor: POSITION_COLORS[pos], color: POSITION_COLORS[pos] }"
            >
              {{ pos }}
            </Badge>
          </div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" class="h-8 w-8" @click.stop="$emit('edit')">
            <Pencil class="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click.stop="$emit('delete')">
            <Trash2 class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { Player } from '~/lib/types'
import { POSITION_COLORS } from '~/lib/constants'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Pencil, Trash2 } from 'lucide-vue-next'

defineProps<{
  player: Player
}>()

defineEmits<{
  edit: []
  delete: []
}>()
</script>
