<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <h2 class="text-2xl font-semibold tracking-tight font-display">{{ playbook?.name ?? 'Playbook' }}</h2>
        <p v-if="playbook?.description" class="text-muted-foreground text-sm mt-1">{{ playbook.description }}</p>
      </div>
      <Button as-child>
        <NuxtLink :to="`/plays/new?playbookId=${playbookId}`">
          <Plus class="w-4 h-4 mr-2" />
          New Play
        </NuxtLink>
      </Button>
    </div>

    <div v-if="loading && plays.length === 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i" class="glass">
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Skeleton class="w-10 h-10 rounded-lg" />
              <div class="space-y-1.5">
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-3 w-16" />
              </div>
            </div>
            <div class="flex gap-1">
              <Skeleton class="h-8 w-8 rounded" />
              <Skeleton class="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else-if="plays.length === 0" class="text-center py-12">
      <Swords class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg">No plays yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Create your first play to start designing.</p>
      <Button as-child class="mt-4">
        <NuxtLink :to="`/plays/new?playbookId=${playbookId}`">
          <Plus class="w-4 h-4 mr-2" />
          Create Play
        </NuxtLink>
      </Button>
    </div>

    <div v-else>
      <Tabs default-value="all">
        <TabsList>
          <TabsTrigger value="all">All ({{ plays.length }})</TabsTrigger>
          <TabsTrigger value="offense">Offense ({{ offensePlays.length }})</TabsTrigger>
          <TabsTrigger value="defense">Defense ({{ defensePlays.length }})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" class="mt-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PlayCard
              v-for="play in plays"
              :key="play.id"
              :play="play"
              @edit="navigateToPlay(play.id)"
              :deleting="deletingId === play.id"
              @delete="handleDelete(play.id)"
            />
          </div>
        </TabsContent>
        <TabsContent value="offense" class="mt-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PlayCard
              v-for="play in offensePlays"
              :key="play.id"
              :play="play"
              @edit="navigateToPlay(play.id)"
              :deleting="deletingId === play.id"
              @delete="handleDelete(play.id)"
            />
          </div>
        </TabsContent>
        <TabsContent value="defense" class="mt-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PlayCard
              v-for="play in defensePlays"
              :key="play.id"
              :play="play"
              @edit="navigateToPlay(play.id)"
              :deleting="deletingId === play.id"
              @delete="handleDelete(play.id)"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>


  </div>
</template>

<script setup lang="ts">
import type { Play, Playbook, Player } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Plus, Swords } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const playbookId = computed(() => route.params.id as string)

const client = useSupabaseDB()
const playbook = ref<Playbook | null>(null)

const { plays, loading, fetchPlays, createPlay, updatePlay, deletePlay } = usePlays(playbookId)
const { players, fetchPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()
const { profile, fetchProfile } = useProfile()
const { confirm } = useConfirm()
const { setTitle } = useBreadcrumbs()

const offensePlays = computed(() => plays.value.filter((p) => p.play_type === 'offense'))
const defensePlays = computed(() => plays.value.filter((p) => p.play_type === 'defense'))

// Removed openDialog and dialogOpen logic for creating/editing since we navigate now
// But we still need handleDelete
// We can remove: dialogOpen, editingPlay, openDialog, handleSubmit (for creation part)

const deletingId = ref<string | null>(null)

function navigateToPlay(id: string) {
  router.push(`/plays/${id}`)
}



async function handleDelete(id: string) {
  const ok = await confirm({
    title: 'Delete Play',
    description: 'Are you sure you want to delete this play? This action cannot be undone.',
    actionLabel: 'Delete',
  })
  if (!ok) return
  deletingId.value = id
  try {
    await deletePlay(id)
  } finally {
    deletingId.value = null
  }
}

async function fetchPlaybook() {
  const { data } = await client
    .from('playbooks')
    .select('*')
    .eq('id', playbookId.value)
    .single()
  playbook.value = data as Playbook
  if (playbook.value?.name) {
    setTitle(playbook.value.name)
  }
}

onMounted(() => {
  fetchPlaybook()
  fetchPlays()
  fetchPlayers()
  fetchTeams()
  fetchProfile()
})
</script>
