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
          <p v-if="isDuplicateName" class="text-xs text-muted-foreground">
            A play with this name already exists in the playbook. We'll add " Copy" to the end when saving.
          </p>
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

const client = useSupabaseDB()
const { playbooks, fetchPlaybooks, createPlaybook } = usePlaybooks()

const form = reactive({
  playbookId: '',
  name: props.defaultName || ''
})

const playNamesInPlaybook = ref<string[]>([])

const isValid = computed(() => form.playbookId && form.name.trim().length > 0)

const isDuplicateName = computed(() => {
  const name = form.name.trim()
  if (!name || playNamesInPlaybook.value.length === 0) return false
  const lower = name.toLowerCase()
  return playNamesInPlaybook.value.some((n) => n.toLowerCase() === lower)
})

function getUniqueName(baseName: string, existing: string[]): string {
  const lowerExisting = new Set(existing.map((n) => n.toLowerCase()))
  if (!lowerExisting.has(baseName.toLowerCase())) return baseName
  let candidate = `${baseName} Copy`
  let i = 2
  while (lowerExisting.has(candidate.toLowerCase())) {
    candidate = `${baseName} Copy ${i}`
    i += 1
  }
  return candidate
}

watch([() => props.open, () => form.playbookId], async ([openVal, pbId]) => {
  if (openVal && pbId) {
    const user = useSupabaseUser()
    if (!user.value) return
    const { data } = await client
      .from('plays')
      .select('name')
      .eq('playbook_id', pbId)
    playNamesInPlaybook.value = (data ?? []).map((r: { name: string }) => r.name)
  } else if (!openVal) {
    playNamesInPlaybook.value = []
  }
})

watch(() => props.open, async (val) => {
  if (val) {
    if (playbooks.value.length === 0) {
      await fetchPlaybooks()
    }
    
    if (playbooks.value.length === 0) {
      const defaultPb = await createPlaybook('My Plays', 'Default collection of plays')
      if (defaultPb) {
        form.playbookId = defaultPb.id
      }
    }
    
    if (!form.playbookId && playbooks.value.length > 0) {
      form.playbookId = playbooks.value[0].id
    }
    if (props.defaultName) {
      form.name = props.defaultName
    }
  }
})

function handleSave() {
  if (!isValid.value) return
  const name = form.name.trim()
  const finalName = getUniqueName(name, playNamesInPlaybook.value)
  emit('save', {
    playbookId: form.playbookId,
    name: finalName
  })
}
</script>
