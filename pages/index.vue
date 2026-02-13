<template>
  <!-- Skeleton while loading -->
  <div v-if="!ready" class="space-y-8">
    <div>
      <Skeleton class="h-8 w-64 mb-2" />
      <Skeleton class="h-4 w-48" />
    </div>
    <Skeleton class="h-[76px] w-full rounded-xl" />
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="stat-card glass min-w-0">
        <div class="flex items-center justify-between">
          <div>
            <Skeleton class="h-3 w-16 mb-2" />
            <Skeleton class="h-8 w-12" />
          </div>
          <Skeleton class="w-10 h-10 rounded-[10px]" />
        </div>
      </div>
    </div>
    <div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <div class="xl:col-span-2 min-w-0">
        <Skeleton class="h-6 w-32 mb-4" />
        <div class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" class="h-[52px] w-full rounded-[10px]" />
        </div>
      </div>
      <div>
        <Skeleton class="h-6 w-16 mb-4" />
        <Skeleton class="h-[160px] w-full rounded-xl" />
      </div>
    </div>
  </div>

  <div v-else class="space-y-8">
    <!-- Welcome Header: greeting changes daily; name in cursive -->
    <div>
      <h2 class="text-2xl font-semibold tracking-tight font-display">
        <span class="welcome-greeting">{{ dailyGreeting }}{{ displayName ? ', ' : '' }}</span><span v-if="displayName" class="welcome-name">{{ displayName }}</span>
      </h2>
    </div>

    <!-- Quick Play CTA -->
    <button
      class="quick-play-cta"
      @click="quickPlay.open()"
    >
      <div class="cta-icon">
        <Plus class="w-6 h-6" />
      </div>
      <div class="cta-text">
        <p class="cta-title">Design a New Play</p>
        <p class="cta-sub">Jump straight into the play designer <kbd class="cta-kbd">⌘N</kbd></p>
      </div>
      <ArrowRight class="w-5 h-5 text-muted-foreground cta-arrow" />
    </button>

    <!-- Stats Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="stat-card bg-white min-w-0">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-label">{{ stat.label }}</p>
            <p class="stat-value">{{ stat.value }}</p>
            <p v-if="stat.sub" class="stat-sub">{{ stat.sub }}</p>
          </div>
          <div class="stat-icon-bg" :style="{ background: stat.color }">
            <component :is="stat.icon" class="w-5 h-5" style="color: inherit" />
          </div>
        </div>
      </div>
    </div>

    <!-- Two-column Grid: Recent Plays + Team Overview -->
    <div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <!-- Recent Plays (2/3 width on xl) -->
      <div class="xl:col-span-2 min-w-0">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold font-display">Recent Plays ({{ recentPlays.length }})</h3>
          <NuxtLink to="/plays" class="text-sm text-primary hover:underline">View all</NuxtLink>
        </div>
        
        <div v-if="recentPlays.length === 0" class="empty-state">
          <Swords class="w-10 h-10 text-muted-foreground" />
          <p class="text-sm text-muted-foreground mt-2">No plays yet. Create your first play!</p>
        </div>

        <div v-else class="space-y-2">
          <NuxtLink
            v-for="play in recentPlays"
            :key="play.id"
            :to="`/plays/${play.id}`"
            class="recent-play-item glass glass-hover"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div 
                class="play-type-badge"
                :class="play.play_type === 'offense' ? 'badge-offense' : 'badge-defense'"
              >
                <Swords v-if="play.play_type === 'offense'" class="w-3 h-3" />
                <ShieldIcon v-else class="w-3 h-3" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ play.name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ play._playbookName || 'Unknown playbook' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-muted-foreground">{{ formatDate(play.updated_at) }}</span>
              <ArrowRight class="w-4 h-4 text-muted-foreground" />
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Team Overview (1/3 width on xl) -->
      <div class="min-w-0">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold font-display">Team</h3>
          <NuxtLink v-if="primaryTeam" to="/teams" class="text-sm text-primary hover:underline">Manage</NuxtLink>
        </div>

        <div v-if="!primaryTeam" class="empty-state">
          <ShieldIcon class="w-10 h-10 text-muted-foreground" />
          <p class="text-sm text-muted-foreground mt-2">No primary team set.</p>
          <NuxtLink to="/settings" class="text-xs text-primary hover:underline mt-1">Set in Settings</NuxtLink>
        </div>

        <!-- white background with border -->
        <div v-else class="team-card bg-white rounded-lg p-4">
          <div class="team-info">
            <p class="team-name">{{ primaryTeam.name }}</p>
            <p v-if="primaryTeam.description" class="team-description">{{ primaryTeam.description }}</p>
          </div>
          <div class="team-stats">
            <div class="team-stat">
              <p class="team-stat-value">{{ offenseStarters }}</p>
              <p class="team-stat-label">Offense Starters</p>
            </div>
            <div class="team-stat">
              <p class="team-stat-value">{{ defenseStarters }}</p>
              <p class="team-stat-label">Defense Starters</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Playbooks -->
    <div v-if="playbooks.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold font-display">Playbooks</h3>
        <NuxtLink to="/playbooks" class="text-sm text-primary hover:underline">View all</NuxtLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <PlaybookCard
          v-for="pb in playbooks.slice(0, 3)"
          :key="pb.id"
          :playbook="pb"
          @edit="() => {}"
          @delete="() => {}"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Play, Team } from '~/lib/types'
import { Skeleton } from '~/components/ui/skeleton'
import { BookOpen, Users, Shield as ShieldIcon, Swords, Plus, ArrowRight } from 'lucide-vue-next'

const quickPlay = useQuickPlay()
const { playbooks, fetchPlaybooks } = usePlaybooks()
const { players, fetchPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()
const { profile, fetchProfile } = useProfile()
const client = useSupabaseDB()
const ready = ref(false)

const displayName = computed(() => {
  return profile.value?.display_name || ''
})

// Greetings rotate by day (same greeting all day, new one next day)
const GREETINGS = [
  'Welcome back',
  'Good to see you',
  'Hey there',
  'Hello again',
  'Nice to have you',
  'Welcome in',
  'Good day',
  'Hi there',
  'Welcome home',
  'Back at it',
  'Ready to design',
  'Let’s go',
  'Here we go',
  'Time to create',
  'Welcome',
]

const dailyGreeting = computed(() => {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()
  const index = seed % GREETINGS.length
  return GREETINGS[index]
})

// Primary team
const primaryTeam = computed(() => {
  if (!profile.value?.default_team_id) return null
  return teams.value.find((t) => t.id === profile.value!.default_team_id) ?? null
})

const primaryTeamName = computed(() => primaryTeam.value?.name ?? null)

const offenseStarters = computed(() => {
  if (!primaryTeam.value) return 0
  const tp = primaryTeam.value.team_players ?? []
  return tp.filter((p: any) => p.offense_starter).length
})

const defenseStarters = computed(() => {
  if (!primaryTeam.value) return 0
  const tp = primaryTeam.value.team_players ?? []
  return tp.filter((p: any) => p.defense_starter).length
})

// Recent plays across all playbooks
interface PlayWithPlaybook extends Play {
  _playbookName?: string
}

const recentPlays = ref<PlayWithPlaybook[]>([])

async function fetchRecentPlays() {
  const user = useSupabaseUser()
  if (!user.value) return

  const { data } = await client
    .from('plays')
    .select('*, playbooks!inner(name)')
    .eq('user_id', user.value.id)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (data) {
    recentPlays.value = data.map((p: any) => ({
      ...p,
      _playbookName: p.playbooks?.name,
    }))
  }
}

// All plays stats (separate from recentPlays which is limited to 3)
const totalPlayCount = ref(0)
const offensePlayCount = ref(0)
const defensePlayCount = ref(0)

async function fetchPlayStats() {
  const user = useSupabaseUser()
  if (!user.value) return

  const { data } = await client
    .from('plays')
    .select('play_type')
    .eq('user_id', user.value.id)

  if (data) {
    totalPlayCount.value = data.length
    offensePlayCount.value = data.filter((p: any) => p.play_type === 'offense').length
    defensePlayCount.value = data.length - offensePlayCount.value
  }
}

// Stats
const stats = computed(() => {
  return [
    {
      label: 'Playbooks',
      value: playbooks.value.length,
      sub: null,
      icon: BookOpen,
      color: 'color-mix(in oklch, var(--color-primary) 12%, transparent)',
    },
    {
      label: 'Total Plays',
      value: totalPlayCount.value,
      sub: totalPlayCount.value > 0 ? `${offensePlayCount.value} off · ${defensePlayCount.value} def` : null,
      icon: Swords,
      color: 'color-mix(in oklch, var(--color-chart-1) 12%, transparent)',
    },
    {
      label: 'Players',
      value: players.value.length,
      sub: null,
      icon: Users,
      color: 'color-mix(in oklch, var(--color-chart-2) 12%, transparent)',
    },
    {
      label: 'Teams',
      value: teams.value.length,
      sub: primaryTeamName.value ? `Primary: ${primaryTeamName.value}` : null,
      icon: ShieldIcon,
      color: 'color-mix(in oklch, var(--color-chart-4) 12%, transparent)',
    },
  ]
})

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

onMounted(async () => {
  await Promise.all([
    fetchPlaybooks(),
    fetchPlayers(),
    fetchTeams(),
    fetchProfile(),
    fetchRecentPlays(),
    fetchPlayStats(),
  ])
  ready.value = true
})
</script>

<style scoped>
/* Welcome: user name in cursive (Parisienne – Google Fonts “Hello Paris” style) */
.welcome-greeting {
  color: var(--color-muted-foreground);
  font-weight: 500;
}
.welcome-name {
  font-family: 'Parisienne', cursive;
  font-weight: 400;
  font-size: 1.35em;
  color: var(--color-foreground);
}

/* Quick Play CTA */
.quick-play-cta {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  background: color-mix(in oklch, var(--color-primary) 4%, var(--color-card));
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.quick-play-cta:hover {
  border-color: var(--color-primary);
  border-style: solid;
  background: color-mix(in oklch, var(--color-primary) 8%, var(--color-card));
}

.quick-play-cta:hover .cta-arrow {
  transform: translateX(4px);
  color: var(--color-primary);
}

.cta-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, #000));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cta-text {
  flex: 1;
}

.cta-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0;
}

.cta-sub {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 2px 0 0;
}

.cta-kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-accent);
  border: 1px solid var(--color-border);
  font-family: ui-monospace, monospace;
  font-size: 11px;
  margin-left: 4px;
}

.cta-arrow {
  transition: all 0.2s;
  flex-shrink: 0;
}

/* Stat Cards */
.stat-card {
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.stat-label {
  font-size: 14px;
  color: var(--color-muted-foreground);
  margin: 0;
}

.stat-value {
  font-size: 29px;
  font-weight: 700;
  line-height: 1.2;
  margin: 4px 0 0;
  color: var(--color-foreground);
  font-variant-numeric: tabular-nums;
}

.stat-sub {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 2px 0 0;
}

.stat-icon-bg {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Recent Plays */
.recent-play-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  text-decoration: none;
  text-decoration: none;
  transition: all 0.15s;
  gap: 12px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.play-type-badge {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-offense {
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.badge-defense {
  background: color-mix(in oklch, var(--color-destructive) 12%, transparent);
  color: var(--color-destructive);
}

/* Team Card – spells out T E A M */
.team-card {
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  border: 1px solid var(--color-border);
}

.team-letters {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  justify-content: center;
}

.team-letter {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: var(--font-display, ui-sans-serif, system-ui, sans-serif);
  color: var(--color-foreground);
  background: color-mix(in oklch, var(--color-chart-4) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-chart-4) 25%, transparent);
}

.team-letter[data-letter="T"] { background: color-mix(in oklch, var(--color-primary) 14%, transparent); border-color: color-mix(in oklch, var(--color-primary) 28%, transparent); color: var(--color-primary); }
.team-letter[data-letter="E"] { background: color-mix(in oklch, var(--color-chart-2) 14%, transparent); border-color: color-mix(in oklch, var(--color-chart-2) 28%, transparent); color: var(--color-chart-2); }
.team-letter[data-letter="A"] { background: color-mix(in oklch, var(--color-chart-4) 14%, transparent); border-color: color-mix(in oklch, var(--color-chart-4) 28%, transparent); color: var(--color-chart-4); }
.team-letter[data-letter="M"] { background: color-mix(in oklch, var(--color-chart-1) 14%, transparent); border-color: color-mix(in oklch, var(--color-chart-1) 28%, transparent); color: var(--color-chart-1); }

.team-info {
  margin-bottom: 14px;
}

.team-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0;
}

.team-description {
  font-size: 12px;
  color: var(--color-muted-foreground);
  margin: 4px 0 0;
}

.team-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.team-stat {
  padding: 12px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--color-accent) 50%, transparent);
  text-align: center;
  border: 1px solid var(--color-border);
}

.team-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-foreground);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.team-stat-label {
  font-size: 11px;
  color: var(--color-muted-foreground);
  margin: 4px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-accent) 30%, transparent);
}
</style>
