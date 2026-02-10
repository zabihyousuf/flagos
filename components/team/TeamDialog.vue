<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg glass">
      <DialogHeader>
        <DialogTitle>{{ team ? 'Edit Team' : 'Create Team' }}</DialogTitle>
        <DialogDescription>{{ team ? 'Update team details.' : 'Create a new team.' }}</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label>Team Name</Label>
          <Input v-model="form.name" placeholder="Team name" />
        </div>
        <div class="space-y-2">
          <Label>Description</Label>
          <Textarea v-model="form.description" placeholder="Team description" :rows="3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!form.name">
          {{ team ? 'Save' : 'Create Team' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { Team } from '~/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

const props = defineProps<{
  open: boolean
  team: Team | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: { name: string; description: string }]
}>()

const form = reactive({
  name: '',
  description: '',
})

watch(() => props.open, (isOpen) => {
  if (isOpen && props.team) {
    form.name = props.team.name
    form.description = props.team.description
  } else if (isOpen) {
    form.name = ''
    form.description = ''
  }
})

function handleSubmit() {
  emit('submit', { ...form })
  emit('update:open', false)
}
</script>
