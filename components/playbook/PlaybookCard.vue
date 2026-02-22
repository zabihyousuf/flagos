<template>
  <NuxtLink :to="`/playbooks/${playbook.id}`" class="min-w-0">
    <Card class="glass glass-hover transition-all duration-200 cursor-pointer group h-full min-w-0" :class="variant === 'list' ? 'flex flex-row' : ''">
      <!-- List: compact row -->
      <CardContent v-if="variant === 'list'" class="p-3 flex flex-row items-center gap-4 flex-1 min-w-0">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
          <BookOpen class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-sm truncate">{{ playbook.name }}</h3>
          <p v-if="playbook.description" class="text-xs text-muted-foreground truncate mt-0.5">{{ playbook.description }}</p>
        </div>
        <div class="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span>{{ playbook.plays?.length ?? 0 }} {{ (playbook.plays?.length ?? 0) === 1 ? 'play' : 'plays' }}</span>
          <span>{{ formatDate(playbook.updated_at) }}</span>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button size="icon" variant="ghost" class="h-7 w-7" @click.prevent="$emit('edit')">
            <Pencil class="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" class="h-7 w-7 text-destructive" :disabled="deleting" @click.prevent="$emit('delete')">
            <Loader2 v-if="deleting" class="w-3 h-3 animate-spin" />
            <Trash2 v-else class="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
      <!-- Grid: original layout -->
      <template v-else>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base">{{ playbook.name }}</CardTitle>
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
          <CardDescription v-if="playbook.description">{{ playbook.description }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4 text-sm text-muted-foreground">
            <div class="flex items-center gap-1.5">
              <BookOpen class="w-3.5 h-3.5" />
              <span>{{ playbook.plays?.length ?? 0 }} {{ (playbook.plays?.length ?? 0) === 1 ? 'play' : 'plays' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5" />
              <span>{{ formatDate(playbook.updated_at) }}</span>
            </div>
          </div>
        </CardContent>
      </template>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Playbook } from '~/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { BookOpen, Clock, Pencil, Trash2, Loader2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    playbook: Playbook
    deleting?: boolean
    variant?: 'grid' | 'list'
  }>(),
  { variant: 'grid' }
)

defineEmits<{
  edit: []
  delete: []
}>()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
</script>
