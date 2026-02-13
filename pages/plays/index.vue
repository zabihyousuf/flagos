<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">All Plays</h2>
        <p class="text-muted-foreground text-sm mt-1">Every play across all your playbooks.</p>
      </div>
      <Button @click="quickPlay.open()">
        <Plus class="w-4 h-4 mr-2" />
        New Play
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search plays..."
          class="pl-9"
        />
      </div>
      <div class="flex gap-1">
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
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="play-card glass">
        <div class="flex items-start justify-between mb-3">
          <Skeleton class="h-5 w-16 rounded-md" />
          <Skeleton class="h-3 w-12" />
        </div>
        <Skeleton class="h-4 w-28 mb-1" />
        <Skeleton class="h-3 w-20 mt-2" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="allPlays.length === 0" class="text-center py-16">
      <Swords class="w-14 h-14 text-muted-foreground mx-auto mb-4" />
      <h3 class="font-medium text-lg font-display">No plays yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Create your first play to start designing.</p>
      <Button class="mt-4" @click="quickPlay.open()">
        <Plus class="w-4 h-4 mr-2" />
        Create Play
      </Button>
    </div>

    <!-- Plays Grid -->
    <div v-else-if="filteredPlays.length === 0" class="text-center py-12">
      <p class="text-muted-foreground text-sm">No plays match your search.</p>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="play in filteredPlays"
        :key="play.id"
        class="play-card relative group cursor-pointer"
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
          
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">{{ formatDate(play.updated_at) }}</span>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-6 w-6 -mr-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <MoreVertical class="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click.stop="handleDelete(play.id)" class="text-destructive focus:text-destructive">
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
  </div>
</template>

<script setup lang="ts">
import type { Play } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Plus, Search, Swords, Shield, BookOpen, MoreVertical, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const quickPlay = useQuickPlay()
const client = useSupabaseDB()
const { confirm } = useConfirm()

interface PlayWithPlaybook extends Play {
  _playbookName?: string
}

const allPlays = ref<PlayWithPlaybook[]>([])
const loading = ref(false)
const searchQuery = ref('')
const typeFilter = ref<'all' | 'offense' | 'defense'>('all')

const offensePlays = computed(() => allPlays.value.filter(p => p.play_type === 'offense'))
const defensePlays = computed(() => allPlays.value.filter(p => p.play_type === 'defense'))

const filteredPlays = computed(() => {
  let result = allPlays.value

  if (typeFilter.value !== 'all') {
    result = result.filter(p => p.play_type === typeFilter.value)
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

  loading.value = true
  try {
    const { error } = await client.from('plays').delete().eq('id', id)
    if (error) throw error
    allPlays.value = allPlays.value.filter(p => p.id !== id)
  } catch (e) {
    console.error('Failed to delete play:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllPlays()
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

.play-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
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
</style>
