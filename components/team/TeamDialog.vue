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
        <div class="flex items-start gap-3">
          <Checkbox
            id="is-joinable"
            :model-value="form.is_joinable"
            @update:model-value="form.is_joinable = !!$event"
          />
          <div class="space-y-0.5">
            <Label for="is-joinable" class="cursor-pointer">Open to join requests</Label>
            <p class="text-xs text-muted-foreground">Players can request to join this team from their squad page.</p>
          </div>
        </div>
        <div v-if="!team" class="flex items-start gap-3">
          <Checkbox
            id="go-to-squad"
            :model-value="form.go_to_squad"
            @update:model-value="form.go_to_squad = !!$event"
          />
          <div class="space-y-0.5">
            <Label for="go-to-squad" class="cursor-pointer">Take me to Squad after creating</Label>
            <p class="text-xs text-muted-foreground">Switch to your new team in the Locker Room automatically.</p>
          </div>
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
import { Checkbox } from '~/components/ui/checkbox'

const props = defineProps<{
  open: boolean
  team: Team | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: { name: string; description: string; is_joinable: boolean; go_to_squad: boolean }]
}>()

const form = reactive({
  name: '',
  description: '',
  is_joinable: false,
  go_to_squad: true,
})

watch(() => props.open, (isOpen) => {
  if (isOpen && props.team) {
    form.name = props.team.name
    form.description = props.team.description
    form.is_joinable = props.team?.is_joinable ?? false
  } else if (isOpen) {
    form.name = ''
    form.description = ''
    form.is_joinable = false
    form.go_to_squad = true
  }
})

function handleSubmit() {
  emit('submit', { ...form })
  emit('update:open', false)
}
</script>
