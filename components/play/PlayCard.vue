<template>
  <NuxtLink :to="`/plays/${play.id}`">
    <Card class="glass-hover transition-all duration-200 cursor-pointer group h-full">
      <CardContent class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="play.play_type === 'offense' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
            >
              <Swords v-if="play.play_type === 'offense'" class="w-4 h-4" />
              <ShieldCheck v-else class="w-4 h-4" />
            </div>
            <div>
              <h3 class="font-medium text-sm">{{ play.name }}</h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ play.play_type === 'offense' ? 'Offense' : 'Defense' }}
                <span v-if="play.formation"> &middot; {{ play.formation }}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" class="h-8 w-8" @click.prevent="$emit('edit')">
              <Pencil class="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" :disabled="deleting" @click.prevent="$emit('delete')">
              <Loader2 v-if="deleting" class="w-3.5 h-3.5 animate-spin" />
              <Trash2 v-else class="w-3.5 h-3.5" />
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
import { Pencil, Trash2, Swords, ShieldCheck, Loader2 } from 'lucide-vue-next'

defineProps<{
  play: Play
  deleting?: boolean
}>()

defineEmits<{
  edit: []
  delete: []
}>()
</script>
