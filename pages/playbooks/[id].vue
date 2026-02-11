<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="$router.push('/playbooks')">
        <ArrowLeft class="w-4 h-4" />
      </Button>
      <div class="flex-1">
        <h2 class="text-2xl font-semibold tracking-tight font-display">{{ playbook?.name ?? 'Playbook' }}</h2>
        <p v-if="playbook?.description" class="text-muted-foreground text-sm mt-1">{{ playbook.description }}</p>
      </div>
      <Button @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        New Play
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
      <Button class="mt-4" @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Create Play
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
              @edit="openDialog(play)"
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
              @edit="openDialog(play)"
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
              @edit="openDialog(play)"
              :deleting="deletingId === play.id"
              @delete="handleDelete(play.id)"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <PlayDialog
      :open="dialogOpen"
      :play="editingPlay"
      @update:open="dialogOpen = $event"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type { Play, Playbook, Player } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ArrowLeft, Plus, Swords } from 'lucide-vue-next'

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

const offensePlays = computed(() => plays.value.filter((p) => p.play_type === 'offense'))
const defensePlays = computed(() => plays.value.filter((p) => p.play_type === 'defense'))

const dialogOpen = ref(false)
const editingPlay = ref<Play | null>(null)
const deletingId = ref<string | null>(null)

function openDialog(play: Play | null) {
  editingPlay.value = play
  dialogOpen.value = true
}

async function handleSubmit(data: { name: string; playType: 'offense' | 'defense'; formation: string }) {
  if (editingPlay.value) {
    await updatePlay(editingPlay.value.id, {
      name: data.name,
      play_type: data.playType,
      formation: data.formation,
    } as Partial<Play>)
  } else {
    // Determine starters to load onto the field
    let starters: Player[] = []

    // 1. Try to find user's default team
    let defaultTeam = teams.value.find((t) => t.id === profile.value?.default_team_id)

    // 2. If no default team set but user has teams, fallback to the first one (most recent usually)
    if (!defaultTeam && teams.value.length > 0) {
      defaultTeam = teams.value[0]
    }

    if (defaultTeam?.team_players) {
      // Filter for designated starters on this team
      starters = defaultTeam.team_players
        .filter((tp) => {
          if (!tp.player) return false
          return data.playType === 'offense' ? tp.offense_starter : tp.defense_starter
        })
        .map((tp) => tp.player)
        .filter((p): p is Player => !!p)
    } else {
      // Fallback: Global starters from 'players' list (old behavior)
      starters = players.value.filter((p) =>
        data.playType === 'offense' ? p.offense_starter : p.defense_starter,
      )
    }

    const newPlay = await createPlay(playbookId.value, data.name, data.playType, data.formation, starters)
    // Navigate to the new play's canvas
    if (newPlay) {
      router.push(`/plays/${newPlay.id}`)
    }
  }
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
}

onMounted(() => {
  fetchPlaybook()
  fetchPlays()
  fetchPlayers()
  fetchTeams()
  fetchProfile()
})
</script>
