<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight font-display">Teams</h2>
          <p class="text-muted-foreground text-sm mt-1">Browse and request to join open teams.</p>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" class="h-8 text-xs" @click="teamDialogOpen = true">
            <Plus class="w-3 h-3 mr-1.5" />
            New Team
          </Button>
          <div class="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              class="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
              :class="filter === 'all' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              @click="filter = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
              :class="filter === 'open' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              @click="filter = 'open'"
            >
              Open to join
            </button>
          </div>
        </div>
      </div>
      <div class="relative">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search teams…" class="pl-9 h-9 w-full sm:max-w-xs" />
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i" class="glass">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <Skeleton class="h-10 w-10 rounded-xl" />
            <Skeleton class="h-5 w-14 rounded-full" />
          </div>
          <Skeleton class="h-4 w-32 mt-3" />
          <Skeleton class="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredTeams.length === 0" class="text-center py-12">
      <Users class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">
        {{ search ? 'No teams match your search.' : filter === 'open' ? 'No open teams right now.' : 'No teams found.' }}
      </h3>
      <p class="text-muted-foreground text-sm mt-1">
        {{ filter === 'open' ? 'Check back later or browse all teams.' : 'Teams will appear here once coaches create them.' }}
      </p>
      <Button v-if="filter === 'open'" variant="ghost" size="sm" class="mt-3" @click="filter = 'all'">
        Show all teams
      </Button>
    </div>

    <!-- Team grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="team in filteredTeams"
        :key="team.id"
        class="glass flex flex-col"
      >
        <CardHeader class="pb-2 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="team-avatar">
              {{ team.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <span v-if="team.user_id === user?.id" class="team-role-chip team-role-chip--coach">Coach</span>
              <span v-else-if="memberTeamIds.has(team.id)" class="team-role-chip team-role-chip--player">Player</span>
              <span v-if="team.is_joinable" class="team-open-chip">Open</span>
            </div>
          </div>
          <div class="mt-3 space-y-1">
            <h3 class="font-semibold text-[15px] leading-tight">{{ team.name }}</h3>
            <p v-if="team.description" class="text-muted-foreground text-[13px] line-clamp-2">{{ team.description }}</p>
          </div>
          <!-- Stats row -->
          <div class="flex items-center gap-3 mt-3 text-[12px] text-muted-foreground">
            <span class="flex items-center gap-1">
              <Users class="w-3 h-3" />
              {{ playerCount(team) }} player{{ playerCount(team) === 1 ? '' : 's' }}
            </span>
            <span class="text-muted-foreground/40">·</span>
            <span>{{ team.is_joinable ? 'Open to join' : 'Invite only' }}</span>
            <span class="text-muted-foreground/40">·</span>
            <span>{{ formatDate(team.created_at) }}</span>
          </div>
        </CardHeader>
        <CardContent class="pt-0">
          <!-- Owner: show chip + delete -->
          <div v-if="team.user_id === user?.id" class="flex items-center justify-between gap-2">
            <span class="team-status-chip team-status-chip--owner">Your team</span>
            <Button
              size="sm"
              variant="ghost"
              class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/8 shrink-0"
              :disabled="deleting === team.id"
              title="Delete team"
              @click="confirmDeleteTeam(team)"
            >
              <Loader2 v-if="deleting === team.id" class="w-3.5 h-3.5 animate-spin" />
              <Trash2 v-else class="w-3.5 h-3.5" />
            </Button>
          </div>
          <!-- Member (not owner): leave -->
          <Button
            v-else-if="memberTeamIds.has(team.id)"
            size="sm"
            variant="outline"
            class="w-full h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            :disabled="leaving === team.id"
            @click="leaveTeamById(team.id)"
          >
            <Loader2 v-if="leaving === team.id" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
            {{ leaving === team.id ? 'Leaving…' : 'Leave team' }}
          </Button>
          <!-- Open join request -->
          <Button
            v-else-if="team.is_joinable"
            size="sm"
            variant="outline"
            class="w-full h-8"
            :disabled="pendingRequests.has(team.id) || submitting === team.id"
            @click="requestToJoin(team.id)"
          >
            <Loader2 v-if="submitting === team.id" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
            {{ submitting === team.id ? 'Sending…' : pendingRequests.has(team.id) ? 'Request sent' : 'Request to join' }}
          </Button>
          <!-- Invite only -->
          <span v-else class="team-status-chip team-status-chip--closed">
            <Lock class="w-3 h-3" />
            Invite only
          </span>
        </CardContent>
      </Card>
    </div>
  </div>

  <TeamDialog
    :open="teamDialogOpen"
    :team="null"
    @update:open="teamDialogOpen = $event"
    @submit="handleCreateTeam"
  />
</template>

<script setup lang="ts">
import { Search, Users, Lock, Loader2, Plus, Trash2, Calendar } from 'lucide-vue-next'
import type { Team } from '~/lib/types'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({ layout: 'default' })
useHead({ title: 'Teams — FlagLab' })

const client = useSupabaseClient()
const user = useSupabaseUser()
const { submitRequest } = useTeamJoinRequests()
const { memberships, fetchMemberships, setActiveTeam, leaveTeam } = useTeamMemberships()
const { createTeam, updateTeam, deleteTeam } = useTeams()
const { confirm } = useConfirm()
const teamDialogOpen = ref(false)

const teams = ref<Team[]>([])
const loading = ref(true)
const search = ref('')
const filter = ref<'all' | 'open'>('all')
const submitting = ref<string | null>(null)
const leaving = ref<string | null>(null)
const deleting = ref<string | null>(null)
const pendingRequests = ref<Set<string>>(new Set())

const memberTeamIds = computed(() => new Set(memberships.value.map((m) => m.team_id)))

const filteredTeams = computed(() => {
  let list = teams.value
  if (filter.value === 'open') list = list.filter((t) => t.is_joinable)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
  }
  return list
})

function playerCount(team: Team): number {
  return (team as any).team_players?.length ?? 0
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

async function fetchAllTeams() {
  loading.value = true
  try {
    const { data } = await client
      .from('teams')
      .select('id, name, description, is_joinable, user_id, created_at, updated_at, team_players(player_id)')
      .neq('name', 'Free Agent')
      .order('created_at', { ascending: false })
      .limit(100)
    teams.value = (data ?? []) as Team[]
  } finally {
    loading.value = false
  }
}

async function confirmDeleteTeam(team: Team) {
  const ok = await confirm({
    title: `Delete "${team.name}"?`,
    description: 'This will permanently delete the team, remove all players from it, and cannot be undone.',
    actionLabel: 'Delete',
    variant: 'destructive',
  })
  if (!ok) return
  deleting.value = team.id
  try {
    await deleteTeam(team.id)
    teams.value = teams.value.filter((t) => t.id !== team.id)
  } finally {
    deleting.value = null
  }
}

async function leaveTeamById(teamId: string) {
  leaving.value = teamId
  try {
    await leaveTeam(teamId)
  } finally {
    leaving.value = null
  }
}

async function requestToJoin(teamId: string) {
  submitting.value = teamId
  try {
    await submitRequest(teamId)
    pendingRequests.value = new Set([...pendingRequests.value, teamId])
  } catch {
    pendingRequests.value = new Set([...pendingRequests.value, teamId])
  } finally {
    submitting.value = null
  }
}

async function handleCreateTeam(data: { name: string; description: string; is_joinable: boolean; go_to_squad: boolean }) {
  const team = await createTeam(data.name, data.description)
  if (team) {
    if (data.is_joinable) {
      await updateTeam(team.id, { is_joinable: true })
    }
    if (data.go_to_squad) {
      setActiveTeam(team.id)
      await navigateTo('/squad')
    } else {
      await fetchAllTeams()
    }
  }
}

onMounted(() => {
  fetchAllTeams()
  if (user.value) fetchMemberships()
})
</script>

<style scoped>
.team-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.team-role-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.team-role-chip--coach {
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.team-role-chip--player {
  background: color-mix(in oklch, #22c55e 12%, transparent);
  color: #22c55e;
}

.team-open-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  flex-shrink: 0;
}

.team-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.team-status-chip--member {
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.team-status-chip--owner {
  background: var(--color-accent);
  color: var(--color-muted-foreground);
}

.team-status-chip--closed {
  background: var(--color-accent);
  color: var(--color-muted-foreground);
}
</style>
