<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">All Plays</h2>
        <p class="text-muted-foreground text-sm mt-1">Every play across all your playbooks.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="plays-view-toggle flex rounded-lg border border-border bg-muted/30 p-0.5">
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
        <Button @click="quickPlay.open()">
          <Plus class="w-4 h-4 mr-2" />
          New Play
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div class="relative flex-1 min-w-[12rem] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search plays..."
          class="pl-9"
        />
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          :class="typeFilter === 'all' ? 'bg-accent' : ''"
          @click="typeFilter = 'all'"
        >
          All ({{ allPlays.length }})
        </Button>
        <Button
          variant="outline"
          size="sm"
          :class="typeFilter === 'offense' ? 'bg-primary/10 border-primary text-primary' : ''"
          @click="typeFilter = 'offense'"
        >
          <Swords class="w-3.5 h-3.5 mr-1" />
          Offense ({{ offensePlays.length }})
        </Button>
        <Button
          variant="outline"
          size="sm"
          :class="typeFilter === 'defense' ? 'bg-destructive/10 border-destructive text-destructive' : ''"
          @click="typeFilter = 'defense'"
        >
          <Shield class="w-3.5 h-3.5 mr-1" />
          Defense ({{ defensePlays.length }})
        </Button>
        <Button
          variant="outline"
          size="sm"
          :class="favoritesFilter ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300' : ''"
          @click="favoritesFilter = !favoritesFilter"
        >
          <Star class="w-3.5 h-3.5 mr-1" :class="favoritesFilter ? 'fill-amber-500 text-amber-600' : ''" />
          Favorites ({{ favoriteCount }})
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      :class="viewMode === 'list' ? 'flex flex-col gap-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'"
    >
      <div v-for="i in 6" :key="i" class="play-card glass" :class="viewMode === 'list' ? 'flex flex-row items-center gap-4 py-3' : ''">
        <template v-if="viewMode === 'list'">
          <Skeleton class="h-8 w-8 rounded shrink-0" />
          <Skeleton class="h-5 w-14 rounded-md shrink-0" />
          <div class="flex-1 min-w-0 space-y-1">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-24" />
          </div>
          <Skeleton class="h-3 w-16 shrink-0" />
        </template>
        <template v-else>
          <div class="flex items-start justify-between mb-3">
            <Skeleton class="h-5 w-16 rounded-md" />
            <Skeleton class="h-3 w-12" />
          </div>
          <Skeleton class="h-4 w-28 mb-1" />
          <Skeleton class="h-3 w-20 mt-2" />
        </template>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="allPlays.length === 0" class="text-center py-16">
      <Swords class="w-14 h-14 text-muted-foreground mx-auto mb-4" />
      <h3 class="font-medium text-lg font-display">No plays yet</h3>
      <p class="text-muted-foreground text-sm mt-1">No plays yet. Create your first one to start designing.</p>
      <Button class="mt-4" @click="quickPlay.open()">
        <Plus class="w-4 h-4 mr-2" />
        Create Play
      </Button>
    </div>

    <!-- Plays Grid -->
    <div v-else-if="filteredPlays.length === 0" class="text-center py-12">
      <p class="text-muted-foreground text-sm">
        {{ favoritesFilter ? 'No favorite plays yet. Star a play to add it here.' : 'No plays match your filters.' }}
      </p>
    </div>

    <!-- Grid view -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="play in filteredPlays"
        :key="play.id"
        class="play-card relative group cursor-pointer min-w-0"
        @click="navigateToPlay(play.id)"
      >
        <div class="flex items-start justify-between mb-3">
          <div
            class="play-type-badge"
            :class="play.play_type === 'offense' ? 'badge-offense' : 'badge-defense'"
          >
            <Swords v-if="play.play_type === 'offense'" class="w-3.5 h-3.5" />
            <Shield v-else class="w-3.5 h-3.5" />
            <span>{{ play.play_type }}</span>
          </div>

          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-amber-600"
              :class="isFavorite(play.id) ? 'text-amber-600' : ''"
              title="Favorite"
              @click.stop="toggleFavorite(play.id)"
            >
              <Star class="w-4 h-4" :class="isFavorite(play.id) ? 'fill-amber-500' : ''" />
            </Button>
            <span class="text-xs text-muted-foreground">{{ formatDate(play.updated_at) }}</span>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-6 w-6 -mr-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <MoreVertical class="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem v-if="isManager" @click.stop="openShareDialog(play)">
                  <Share2 class="w-3.5 h-3.5 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem v-if="isManager" @click.stop="openNotifyDialog(play)">
                  <Bell class="w-3.5 h-3.5 mr-2" />
                  Notify Team
                </DropdownMenuItem>
                <DropdownMenuItem v-if="isManager" @click.stop="handleDelete(play.id)" class="text-destructive focus:text-destructive">
                  <Trash2 class="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h4 class="font-medium text-sm mb-1">{{ play.name }}</h4>
        <p class="text-xs text-muted-foreground">
          <BookOpen class="w-3 h-3 inline mr-1" />
          {{ play._playbookName || 'Unknown' }}
        </p>
        <p v-if="play.formation" class="text-xs text-muted-foreground mt-1 opacity-70">
          {{ play.formation }}
        </p>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="play in filteredPlays"
        :key="play.id"
        class="play-card play-card--list glass flex flex-row items-center gap-3 sm:gap-4 cursor-pointer group min-w-0"
        @click="navigateToPlay(play.id)"
      >
        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9 shrink-0 text-muted-foreground hover:text-amber-600"
          :class="isFavorite(play.id) ? 'text-amber-600' : ''"
          title="Favorite"
          @click.stop="toggleFavorite(play.id)"
        >
          <Star class="w-4 h-4" :class="isFavorite(play.id) ? 'fill-amber-500' : ''" />
        </Button>
        <div
          class="play-type-badge shrink-0"
          :class="play.play_type === 'offense' ? 'badge-offense' : 'badge-defense'"
        >
          <Swords v-if="play.play_type === 'offense'" class="w-3.5 h-3.5" />
          <Shield v-else class="w-3.5 h-3.5" />
          <span>{{ play.play_type }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-sm truncate">{{ play.name }}</h4>
          <p class="text-xs text-muted-foreground truncate">
            <BookOpen class="w-3 h-3 inline mr-1" />
            {{ play._playbookName || 'Unknown' }}
            <span v-if="play.formation" class="opacity-70"> · {{ play.formation }}</span>
          </p>
        </div>
        <span class="text-xs text-muted-foreground shrink-0 hidden sm:inline tabular-nums">{{ formatDate(play.updated_at) }}</span>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 sm:opacity-100" @click.stop>
              <MoreVertical class="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="isManager" @click.stop="openShareDialog(play)">
              <Share2 class="w-3.5 h-3.5 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem v-if="isManager" @click.stop="openNotifyDialog(play)">
              <Bell class="w-3.5 h-3.5 mr-2" />
              Notify Team
            </DropdownMenuItem>
            <DropdownMenuItem v-if="isManager" @click.stop="handleDelete(play.id)" class="text-destructive focus:text-destructive">
              <Trash2 class="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <SharePlayDialog v-model:open="shareDialogOpen" :play="shareDialogPlay" />

    <!-- Notify Team Dialog -->
    <Dialog v-model:open="notifyDialogOpen">
      <DialogContent class="sm:max-w-sm glass">
        <DialogHeader>
          <DialogTitle>Notify Team</DialogTitle>
          <DialogDescription>
            Send a notification about "{{ notifyDialogPlay?.name }}" to your team.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-1.5">
            <label class="notify-label">Team</label>
            <Select v-model="notifySelectedTeamId">
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="team in managerTeams" :key="team.id" :value="team.id">
                  {{ team.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <label class="notify-label">Message <span class="notify-optional">(optional)</span></label>
            <textarea
              v-model="notifyMessage"
              class="notify-textarea"
              rows="3"
              placeholder="Add a message for your team…"
            />
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <Button variant="outline" @click="notifyDialogOpen = false">Cancel</Button>
            <Button :disabled="!notifySelectedTeamId || notifying" @click="handleNotifyTeam">
              <Bell class="w-3.5 h-3.5 mr-1.5" />
              {{ notifying ? 'Sending…' : 'Send Notification' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({})

import type { Play } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Plus, Search, Swords, Shield, BookOpen, MoreVertical, Trash2, Share2, LayoutGrid, List, Star, Bell, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const router = useRouter()
const quickPlay = useQuickPlay()
const client = useSupabaseDB()
const { confirm } = useConfirm()
const { isFavorite, toggleFavorite, favoritePlayIds } = usePlayFavorites()
const { isManager, isPlayer } = useAccountType()
const { teams, fetchTeams } = useTeams()
const { fetchAccessiblePlaybooks, accessiblePlaybooks } = useTeamPlaybooks()

const viewMode = ref<'grid' | 'list'>('grid')
const favoritesFilter = ref(false)

interface PlayWithPlaybook extends Play {
  _playbookName?: string
  _authorName?: string
}

const allPlays = ref<PlayWithPlaybook[]>([])
const loading = ref(false)
const searchQuery = ref('')
const typeFilter = ref<'all' | 'offense' | 'defense'>('all')

const offensePlays = computed(() => allPlays.value.filter(p => p.play_type === 'offense'))
const defensePlays = computed(() => allPlays.value.filter(p => p.play_type === 'defense'))

const favoriteCount = computed(() => favoritePlayIds.value.length)

const filteredPlays = computed(() => {
  let result = allPlays.value

  if (typeFilter.value !== 'all') {
    result = result.filter(p => p.play_type === typeFilter.value)
  }

  if (favoritesFilter.value) {
    const fav = new Set(favoritePlayIds.value)
    result = result.filter(p => fav.has(p.id))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p._playbookName?.toLowerCase().includes(q)) ||
      (p.formation?.toLowerCase().includes(q))
    )
  }

  return result
})

async function fetchAllPlays() {
  const user = useSupabaseUser()
  if (!user.value) return

  loading.value = true
  try {
    if (isPlayer.value) {
      // Fetch accessible playbook IDs first
      await fetchAccessiblePlaybooks()
      const playbookIds = accessiblePlaybooks.value.map((pb) => pb.id)
      if (playbookIds.length === 0) {
        allPlays.value = []
        return
      }
      const { data } = await client
        .from('plays')
        .select('*, playbooks!inner(name)')
        .in('playbook_id', playbookIds)
        .order('updated_at', { ascending: false })
      if (data) {
        allPlays.value = data.map((p: any) => ({
          ...p,
          _playbookName: p.playbooks?.name,
        }))
      }
    } else {
      const { data } = await client
        .from('plays')
        .select('*, playbooks!inner(name)')
        .eq('user_id', user.value.id)
        .order('updated_at', { ascending: false })
      if (data) {
        allPlays.value = data.map((p: any) => ({
          ...p,
          _playbookName: p.playbooks?.name,
        }))
      }
    }
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const shareDialogOpen = ref(false)
const shareDialogPlay = ref<PlayWithPlaybook | null>(null)

function openShareDialog(play: PlayWithPlaybook) {
  shareDialogPlay.value = play
  shareDialogOpen.value = true
}

// Notify team dialog state
const notifyDialogOpen = ref(false)
const notifyDialogPlay = ref<PlayWithPlaybook | null>(null)
const notifySelectedTeamId = ref<string>('')
const notifyMessage = ref('')
const notifying = ref(false)

const managerTeams = computed(() => teams.value.filter((t) => t.name !== 'Free Agent'))

function openNotifyDialog(play: PlayWithPlaybook) {
  notifyDialogPlay.value = play
  notifySelectedTeamId.value = managerTeams.value[0]?.id ?? ''
  notifyMessage.value = ''
  notifyDialogOpen.value = true
}

async function handleNotifyTeam() {
  if (!notifyDialogPlay.value || !notifySelectedTeamId.value) return
  notifying.value = true
  try {
    await $fetch('/api/notifications/notify-team', {
      method: 'POST',
      body: {
        team_id: notifySelectedTeamId.value,
        type: 'new_play',
        title: `New play: ${notifyDialogPlay.value.name}`,
        message: notifyMessage.value.trim() || undefined,
        metadata: { play_id: notifyDialogPlay.value.id },
      },
    })
    notifyDialogOpen.value = false
    toast.success('Team notified', {
      description: 'Your team has been notified about this play.',
    })
  } catch {
    toast.error('Failed to notify team', {
      description: 'Please try again in a moment.',
    })
  } finally {
    notifying.value = false
  }
}

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

  await nextTick()
  loading.value = true
  try {
    const { error } = await client.from('plays').delete().eq('id', id)
    if (error) throw error
    allPlays.value = allPlays.value.filter(p => p.id !== id)
    favoritePlayIds.value = favoritePlayIds.value.filter((pid) => pid !== id)
  } catch (e) {
    console.error('Failed to delete play:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllPlays()
  if (isManager.value) {
    fetchTeams()
  }
})
</script>

<style scoped>
.play-card {
  display: block;
  padding: 16px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.15s;
}

.play-card--list {
  padding: 10px 14px;
}

.play-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.badge-offense {
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.badge-defense {
  background: color-mix(in oklch, var(--color-destructive) 12%, transparent);
  color: var(--color-destructive);
}

.plays-view-toggle {
  display: none;
}

@media (min-width: 768px) {
  .plays-view-toggle {
    display: flex;
  }
}

.notify-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-foreground);
}

.notify-optional {
  font-weight: 400;
  color: var(--color-muted-foreground);
  font-size: 12px;
}

.notify-textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-foreground);
  font-size: 13px;
  padding: 8px 10px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}

.notify-textarea:focus {
  border-color: var(--color-primary);
}
</style>
