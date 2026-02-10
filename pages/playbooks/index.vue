<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Playbooks</h2>
        <p class="text-muted-foreground text-sm mt-1">Organize your plays into playbooks.</p>
      </div>
      <Button @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        New Playbook
      </Button>
    </div>

    <div v-if="loading && playbooks.length === 0" class="text-muted-foreground text-sm">Loading playbooks...</div>

    <div v-else-if="playbooks.length === 0" class="text-center py-12">
      <BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">No playbooks yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Create your first playbook to start designing plays.</p>
      <Button class="mt-4" @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Create Playbook
      </Button>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <PlaybookCard
        v-for="pb in playbooks"
        :key="pb.id"
        :playbook="pb"
        @edit="openDialog(pb)"
        @delete="handleDelete(pb.id)"
      />
    </div>

    <PlaybookDialog
      :open="dialogOpen"
      :playbook="editingPlaybook"
      @update:open="dialogOpen = $event"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type { Playbook } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Plus, BookOpen } from 'lucide-vue-next'

const { playbooks, loading, fetchPlaybooks, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybooks()

const dialogOpen = ref(false)
const editingPlaybook = ref<Playbook | null>(null)

function openDialog(playbook: Playbook | null) {
  editingPlaybook.value = playbook
  dialogOpen.value = true
}

async function handleSubmit(data: { name: string; description: string }) {
  if (editingPlaybook.value) {
    await updatePlaybook(editingPlaybook.value.id, data)
  } else {
    await createPlaybook(data.name, data.description)
  }
}

async function handleDelete(id: string) {
  if (confirm('Are you sure? This will delete all plays in this playbook.')) {
    await deletePlaybook(id)
  }
}

onMounted(() => {
  fetchPlaybooks()
})
</script>
