<template>
  <NuxtLink :to="`/playbooks/${playbook.id}`">
    <Card class="glass glass-hover transition-all duration-200 cursor-pointer group h-full">
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
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Playbook } from '~/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { BookOpen, Clock, Pencil, Trash2, Loader2 } from 'lucide-vue-next'

defineProps<{
  playbook: Playbook
  deleting?: boolean
}>()

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
