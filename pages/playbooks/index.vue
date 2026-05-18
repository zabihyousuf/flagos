<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Playbooks</h2>
        <p class="text-muted-foreground text-sm mt-1">
          {{ isPlayer ? 'Playbooks shared with your teams.' : 'Organize your plays into playbooks.' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/plays">
          <Button variant="outline" type="button">
            <Swords class="w-4 h-4 mr-2" />
            All plays
          </Button>
        </NuxtLink>
        <Button v-if="isManager" @click="openDialog(null)">
          <Plus class="w-4 h-4 mr-2" />
          New Playbook
        </Button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && displayedPlaybooks.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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

    <!-- Empty state -->
    <div v-else-if="displayedPlaybooks.length === 0" class="text-center py-12">
      <BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">No playbooks yet</h3>
      <p v-if="isManager" class="text-muted-foreground text-sm mt-1">Create your first playbook to start designing plays.</p>
      <p v-else class="text-muted-foreground text-sm mt-1">No playbooks have been shared with your teams yet.</p>
      <Button v-if="isManager" class="mt-4" @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Create Playbook
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div class="playbooks-view-toggle flex justify-end">
        <div class="flex rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
            :class="viewMode === 'grid' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'grid'"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
            :class="viewMode === 'list' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'list'"
          >
            <List class="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      <!-- Manager view: PlaybookCard with inline share/edit/delete -->
      <div v-if="isManager" :class="viewMode === 'list' ? 'flex flex-col gap-1.5' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'">
        <PlaybookCard
          v-for="pb in displayedPlaybooks"
          :key="pb.id"
          :playbook="pb"
          :variant="viewMode"
          :deleting="deletingId === pb.id"
          :show-share="true"
          @edit="openDialog(pb)"
          @delete="handleDelete(pb.id)"
          @share="openShareDialog(pb)"
        />
      </div>

      <!-- Player view: read-only playbook cards -->
      <div v-else :class="viewMode === 'list' ? 'flex flex-col gap-1.5' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'">
        <PlaybookCard
          v-for="pb in displayedPlaybooks"
          :key="pb.id"
          :playbook="pb"
          :variant="viewMode"
          :deleting="false"
        />
      </div>
    </div>

    <PlaybookDialog
      :open="dialogOpen"
      :playbook="editingPlaybook"
      @update:open="dialogOpen = $event"
      @submit="handleSubmit"
    />

    <SharePlaybookDialog
      v-model:open="shareDialogOpen"
      :playbook-id="shareDialogPlaybookId"
      :playbook-name="shareDialogPlaybookName"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({})

import type { Playbook } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Plus, BookOpen, LayoutGrid, List, Swords, Users } from 'lucide-vue-next'
import SharePlaybookDialog from '~/components/playbook/SharePlaybookDialog.vue'

const viewMode = ref<'grid' | 'list'>('grid')

const { isManager, isPlayer } = useAccountType()
const { fetchAccessiblePlaybooks, accessiblePlaybooks, loading: playbooksAccessLoading } = useTeamPlaybooks()

const { playbooks, loading: playbooksLoading, fetchPlaybooks, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybooks()
const { confirm } = useConfirm()

const loading = computed(() => isPlayer.value ? playbooksAccessLoading.value : playbooksLoading.value)
const displayedPlaybooks = computed<Playbook[]>(() =>
  isPlayer.value
    ? (accessiblePlaybooks.value as unknown as Playbook[])
    : (playbooks.value as unknown as Playbook[])
)

const dialogOpen = ref(false)
const editingPlaybook = ref<Playbook | null>(null)
const deletingId = ref<string | null>(null)

const shareDialogOpen = ref(false)
const shareDialogPlaybookId = ref<string | null>(null)
const shareDialogPlaybookName = ref('')

function openShareDialog(pb: Playbook) {
  shareDialogPlaybookId.value = pb.id
  shareDialogPlaybookName.value = pb.name
  shareDialogOpen.value = true
}

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

watch(isPlayer, (player) => {
  if (player) fetchAccessiblePlaybooks()
}, { immediate: true })
</script>

<style scoped>
.playbooks-view-toggle {
  display: none;
}

@media (min-width: 768px) {
  .playbooks-view-toggle {
    display: flex;
  }
}

.playbook-card-wrapper {
  position: relative;
}

</style>
