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

    <div v-if="loading && playbooks.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i" class="glass">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <Skeleton class="h-5 w-32" />
            <div class="flex gap-1">
              <Skeleton class="h-8 w-8 rounded" />
              <Skeleton class="h-8 w-8 rounded" />
            </div>
          </div>
          <Skeleton class="h-3 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4">
            <Skeleton class="h-4 w-16" />
            <Skeleton class="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>

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
        :deleting="deletingId === pb.id"
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
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Plus, BookOpen } from 'lucide-vue-next'

const { playbooks, loading, fetchPlaybooks, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybooks()
const { confirm } = useConfirm()

const dialogOpen = ref(false)
const editingPlaybook = ref<Playbook | null>(null)
const deletingId = ref<string | null>(null)

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
  const ok = await confirm({
    title: 'Delete Playbook',
    description: 'Are you sure? This will delete all plays in this playbook. This action cannot be undone.',
    actionLabel: 'Delete',
  })
  if (!ok) return
  deletingId.value = id
  try {
    await deletePlaybook(id)
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  fetchPlaybooks()
})
</script>
