<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md glass">
      <DialogHeader>
        <DialogTitle>{{ play ? 'Edit Play' : 'Create Play' }}</DialogTitle>
        <DialogDescription>{{ play ? 'Update play details.' : 'Add a new play to this playbook.' }}</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label>Play Name</Label>
          <Input v-model="form.name" placeholder="e.g. Slant Right" />
        </div>
        <div class="space-y-2">
          <Label>Type</Label>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="form.playType = 'offense'"
              :class="form.playType === 'offense' ? 'bg-primary/10 border-primary text-primary' : ''"
            >
              <Swords class="w-3.5 h-3.5 mr-1.5" />
              Offense
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="form.playType = 'defense'"
              :class="form.playType === 'defense' ? 'bg-destructive/10 border-destructive text-destructive' : ''"
            >
              <Shield class="w-3.5 h-3.5 mr-1.5" />
              Defense
            </Button>
          </div>
          <p v-if="!play && !form.playType" class="text-xs text-destructive">Please select offense or defense</p>
        </div>
        <div class="space-y-2">
          <Label>Formation</Label>
          <Input v-model="form.formation" placeholder="e.g. Spread, Trips Right" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!form.name || !form.playType">
          {{ play ? 'Save' : 'Create' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { Play } from '~/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Swords, Shield } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  play: Play | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: { name: string; playType: 'offense' | 'defense'; formation: string }]
}>()

const form = reactive({
  name: '',
  playType: '' as '' | 'offense' | 'defense',
  formation: '',
})

watch(() => props.open, (isOpen) => {
  if (isOpen && props.play) {
    form.name = props.play.name
    form.playType = props.play.play_type
    form.formation = props.play.formation
  } else if (isOpen) {
    form.name = ''
    form.playType = ''
    form.formation = ''
  }
})

function handleSubmit() {
  if (!form.playType) return
  emit('submit', { name: form.name, playType: form.playType as 'offense' | 'defense', formation: form.formation })
  emit('update:open', false)
}
</script>
