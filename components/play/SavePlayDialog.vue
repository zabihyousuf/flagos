<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent 
      class="sm:max-w-md" 
      @pointer-down-outside="saving ? $event.preventDefault() : null" 
      @escape-key-down="saving ? $event.preventDefault() : null"
      :show-close="!saving"
    >
      <DialogHeader>
        <DialogTitle>Save Play</DialogTitle>
        <DialogDescription>Save this play to a playbook.</DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label>Playbook</Label>
          <Select v-model="form.playbookId" :disabled="saving">
            <SelectTrigger>
              <SelectValue placeholder="Select a playbook" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="pb in playbooks" :key="pb.id" :value="pb.id">
                {{ pb.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Play Name</Label>
          <Input v-model="form.name" placeholder="Play Name" :disabled="saving" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)" :disabled="saving">Cancel</Button>
        <Button @click="handleSave" :disabled="saving || !isValid">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          {{ saving ? 'Saving...' : 'Save Play' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  defaultName?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [data: { playbookId: string, name: string }]
}>()

const { playbooks, fetchPlaybooks, createPlaybook } = usePlaybooks()

const form = reactive({
  playbookId: '',
  name: props.defaultName || ''
})

const isValid = computed(() => form.playbookId && form.name.trim().length > 0)

watch(() => props.open, async (val) => {
  if (val) {
    if (playbooks.value.length === 0) {
      await fetchPlaybooks()
    }
    
    // If still no playbooks, create a default one
    if (playbooks.value.length === 0) {
      const defaultPb = await createPlaybook('My Plays', 'Default collection of plays')
      if (defaultPb) {
        form.playbookId = defaultPb.id
      }
    }
    
    // Auto-select first playbook if none selected
    if (!form.playbookId && playbooks.value.length > 0) {
      form.playbookId = playbooks.value[0].id
    }
    // Update name from prop if present (and form name is empty or default) Or always if opening fresh?
    if (props.defaultName) {
      form.name = props.defaultName
    }
  }
})

function handleSave() {
  if (!isValid.value) return
  emit('save', {
    playbookId: form.playbookId,
    name: form.name
  })
}
</script>
