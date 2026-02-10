<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md glass">
      <DialogHeader>
        <DialogTitle>{{ playbook ? 'Edit Playbook' : 'Create Playbook' }}</DialogTitle>
        <DialogDescription>{{ playbook ? 'Update playbook details.' : 'Create a new playbook to organize your plays.' }}</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="form.name" placeholder="Playbook name" />
        </div>
        <div class="space-y-2">
          <Label>Description</Label>
          <Textarea v-model="form.description" placeholder="Describe this playbook" :rows="3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!form.name">
          {{ playbook ? 'Save' : 'Create' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { Playbook } from '~/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

const props = defineProps<{
  open: boolean
  playbook: Playbook | null
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
  if (isOpen && props.playbook) {
    form.name = props.playbook.name
    form.description = props.playbook.description
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
