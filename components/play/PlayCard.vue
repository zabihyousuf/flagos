<template>
  <NuxtLink :to="`/plays/${play.id}`" class="min-w-0 block h-full">
    <Card class="glass-hover transition-all duration-200 cursor-pointer group h-full min-w-0 overflow-hidden" :class="[variant === 'list' ? 'flex flex-row rounded-lg' : '']">
      <CardContent :class="variant === 'list' ? 'p-2.5 flex flex-row items-center gap-3 flex-1 min-w-0' : 'p-0 flex flex-col'">
        <!-- Preview: top in grid, left in list -->
        <div :class="variant === 'list' ? 'w-20 h-14 shrink-0 rounded overflow-hidden' : 'w-full h-[120px]'">
          <PlayPreview :play="play" :height="variant === 'list' ? 56 : 120" />
        </div>
        <div :class="variant === 'list' ? 'flex-1 min-w-0 flex items-center justify-between gap-2' : 'p-4'">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              :class="[
                'rounded flex items-center justify-center shrink-0',
                variant === 'list' ? 'w-7 h-7' : 'w-10 h-10 rounded-lg',
                play.play_type === 'offense' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
              ]"
            >
              <Swords v-if="play.play_type === 'offense'" :class="variant === 'list' ? 'w-3 h-3' : 'w-4 h-4'" />
              <ShieldCheck v-else :class="variant === 'list' ? 'w-3 h-3' : 'w-4 h-4'" />
            </div>
            <div class="min-w-0">
              <h3 class="font-medium truncate" :class="variant === 'list' ? 'text-[13px]' : 'text-sm'">{{ play.name }}</h3>
              <p class="text-xs text-muted-foreground truncate">
                {{ play.play_type === 'offense' ? 'Offense' : 'Defense' }}
                <span v-if="play.formation"> · {{ play.formation }}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="icon" variant="ghost" :class="variant === 'list' ? 'h-7 w-7' : 'h-8 w-8'" @click.prevent="$emit('share')">
              <Share2 :class="variant === 'list' ? 'w-3 h-3' : 'w-3.5 h-3.5'" />
            </Button>
            <Button size="icon" variant="ghost" :class="variant === 'list' ? 'h-7 w-7' : 'h-8 w-8'" @click.prevent="$emit('edit')">
              <Pencil :class="variant === 'list' ? 'w-3 h-3' : 'w-3.5 h-3.5'" />
            </Button>
            <Button size="icon" variant="ghost" :class="[variant === 'list' ? 'h-7 w-7' : 'h-8 w-8', 'text-destructive']" :disabled="deleting" @click.prevent="$emit('delete')">
              <Loader2 v-if="deleting" :class="[variant === 'list' ? 'w-3 h-3' : 'w-3.5 h-3.5', 'animate-spin']" />
              <Trash2 v-else :class="variant === 'list' ? 'w-3 h-3' : 'w-3.5 h-3.5'" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Play } from '~/lib/types'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Pencil, Trash2, Swords, ShieldCheck, Loader2, Share2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    play: Play
    deleting?: boolean
    variant?: 'grid' | 'list'
  }>(),
  { variant: 'grid' }
)

defineEmits<{
  edit: []
  delete: []
  share: []
}>()
</script>
