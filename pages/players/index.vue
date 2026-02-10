<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Locker Room</h2>
        <p class="text-muted-foreground text-sm mt-1">Manage your teams, roster, and player attributes.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="handleResetStarters" :disabled="loading || players.length === 0">
          <RotateCcw class="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button variant="outline" @click="handleAutoStarters" :disabled="loading || players.length === 0">
          <Zap class="w-4 h-4 mr-2" />
          Auto Starters
        </Button>
        <Button @click="openDialog(null)">
          <Plus class="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>
    </div>

    <!-- Team tracking slots -->
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide font-display">Teams</h3>
      <div class="grid grid-cols-3 gap-4">
        <template v-for="i in 3" :key="i">
          <!-- Empty slot -->
          <div
            v-if="!trackedTeams[i - 1]"
            class="rounded-lg border-2 border-dashed border-muted-foreground/15 p-4 min-h-[80px] flex flex-col justify-center"
          >
            <Select :model-value="''" @update:model-value="(v: string) => selectSlot(i - 1, v)">
              <SelectTrigger class="border-none bg-transparent shadow-none h-auto p-0 text-muted-foreground">
                <SelectValue placeholder="+ Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="t in availableTeamsForSlot"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.name }}
                </SelectItem>
                <SelectItem value="__new__">+ New Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <!-- Filled slot — solid card -->
          <div
            v-else
            class="rounded-lg border bg-card p-4 min-h-[80px] flex flex-col justify-center shadow-sm"
            :style="{ borderColor: SLOT_COLORS[i - 1] + '40' }"
          >
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <NuxtLink
                  :to="`/teams?id=${trackedTeams[i - 1]!.id}`"
                  class="font-semibold text-sm hover:underline"
                  :style="{ color: SLOT_COLORS[i - 1] }"
                >
                  {{ trackedTeams[i - 1]!.name }}
                </NuxtLink>
                <Button size="icon" variant="ghost" class="h-6 w-6" @click="removeSlot(i - 1)">
                  <X class="w-3 h-3" />
                </Button>
              </div>
              <div class="flex gap-3 text-xs text-muted-foreground">
                <span>OVR <span class="font-semibold text-primary">{{ slotScores[i - 1]?.overall ?? 0 }}</span></span>
                <span>OFF <span class="font-semibold text-chart-1">{{ slotScores[i - 1]?.off ?? 0 }}</span></span>
                <span>DEF <span class="font-semibold text-chart-4">{{ slotScores[i - 1]?.def ?? 0 }}</span></span>
                <span>{{ slotPlayerCounts[i - 1] }} players</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide font-display">Players</h3>
      <div v-if="players.length > 0" class="flex gap-2">
        <Select v-model="filterPosition">
          <SelectTrigger class="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem v-for="pos in ALL_POSITIONS" :key="pos" :value="pos">{{ pos }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterOff">
          <SelectTrigger class="h-8 w-[120px] text-xs">
            <SelectValue placeholder="OFF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OFF</SelectItem>
            <SelectItem value="starter">OFF Starter</SelectItem>
            <SelectItem value="bench">OFF Bench</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterDef">
          <SelectTrigger class="h-8 w-[120px] text-xs">
            <SelectValue placeholder="DEF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All DEF</SelectItem>
            <SelectItem value="starter">DEF Starter</SelectItem>
            <SelectItem value="bench">DEF Bench</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterTeam">
          <SelectTrigger class="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-xs text-muted-foreground"
          @click="clearFilters"
        >
          <X class="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>
    </div>

    <div v-if="loading && players.length === 0" class="text-muted-foreground text-sm">Loading players...</div>

    <div v-else-if="players.length === 0" class="text-center py-12">
      <Users class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">No players yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Add your first player to get started.</p>
      <Button class="mt-4" @click="openDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Add Player
      </Button>
    </div>

    <div v-else-if="filteredPlayers.length === 0" class="text-center py-8">
      <p class="text-muted-foreground text-sm">No players match the current filters.</p>
      <Button variant="ghost" size="sm" class="mt-2 text-xs" @click="clearFilters">Clear filters</Button>
    </div>

    <div v-else class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-16">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('number')">
                #
                <ArrowUp v-if="sortKey === 'number' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'number' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead>
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('name')">
                Name
                <ArrowUp v-if="sortKey === 'name' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'name' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead>OFF Pos</TableHead>
            <TableHead>DEF Pos</TableHead>
            <TableHead class="text-center">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('off')">
                OFF
                <ArrowUp v-if="sortKey === 'off' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'off' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead class="text-center">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('def')">
                DEF
                <ArrowUp v-if="sortKey === 'def' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'def' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead class="text-center">Teams</TableHead>
            <TableHead class="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="p in filteredPlayers"
            :key="p.id"
            class="cursor-pointer"
            @click="openDialog(p)"
          >
            <TableCell class="font-bold text-primary">{{ p.number }}</TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>
              <div class="flex gap-1.5 flex-wrap">
                <Badge
                  v-for="pos in p.offense_positions"
                  :key="'o-' + pos"
                  variant="secondary"
                  class="text-xs"
                  :style="getStartingPositions(p.id).has(pos)
                    ? { borderColor: '#fbbf24', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }
                    : {}"
                >
                  {{ pos }}<span v-if="getStartingPositions(p.id).has(pos)" class="ml-0.5">&#9733;</span>
                </Badge>
                <span v-if="p.offense_positions.length === 0" class="text-xs text-muted-foreground/40">—</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex gap-1.5 flex-wrap">
                <Badge
                  v-for="pos in p.defense_positions"
                  :key="'d-' + pos"
                  variant="outline"
                  class="text-xs"
                  :style="getStartingPositions(p.id).has(pos)
                    ? { borderColor: '#fbbf24', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }
                    : {}"
                >
                  {{ pos }}<span v-if="getStartingPositions(p.id).has(pos)" class="ml-0.5">&#9733;</span>
                </Badge>
                <span v-if="p.defense_positions.length === 0" class="text-xs text-muted-foreground/40">—</span>
              </div>
            </TableCell>
            <TableCell class="text-center">
              <span
                class="text-xs font-medium tabular-nums"
                :class="starterRatio(p.id, 'offense').starting > 0 ? 'text-green-400' : 'text-muted-foreground'"
              >
                {{ starterRatio(p.id, 'offense').starting }}/{{ starterRatio(p.id, 'offense').total }}
              </span>
            </TableCell>
            <TableCell class="text-center">
              <span
                class="text-xs font-medium tabular-nums"
                :class="starterRatio(p.id, 'defense').starting > 0 ? 'text-green-400' : 'text-muted-foreground'"
              >
                {{ starterRatio(p.id, 'defense').starting }}/{{ starterRatio(p.id, 'defense').total }}
              </span>
            </TableCell>
            <TableCell class="text-center" @click.stop>
              <div class="flex gap-1 justify-center flex-wrap">
                <span
                  v-for="team in getPlayerTeams(p.id)"
                  :key="team.id || 'fa'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  :class="team.name === 'Free Agent' ? 'bg-muted text-muted-foreground' : ''"
                  :style="team.color ? { backgroundColor: team.color + '20', color: team.color } : {}"
                >
                  {{ team.name }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex gap-1 justify-end">
                <Button size="icon" variant="ghost" class="h-8 w-8" @click.stop="openDialog(p)">
                  <Pencil class="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click.stop="handleDelete(p.id)">
                  <Trash2 class="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <PlayerDialog
      :open="dialogOpen"
      :player="editingPlayer"
      :teams="teams"
      :player-team-ids="editingPlayer ? getPlayerTeamIds(editingPlayer.id) : []"
      @update:open="dialogOpen = $event"
      @submit="handleSubmit"
    />

    <TeamDialog
      :open="teamDialogOpen"
      :team="null"
      @update:open="teamDialogOpen = $event"
      @submit="handleCreateTeam"
    />
  </div>
</template>

<script setup lang="ts">
import type { Player, Team } from '~/lib/types'
import { POSITION_COLORS } from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Plus, Users, Pencil, Trash2, Zap, RotateCcw, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'

const SLOT_COLORS = ['#f97316', '#22c55e', '#a855f7']
const ALL_POSITIONS = ['QB', 'WR', 'C', 'DB', 'RSH', 'MLB']

const { players, loading, fetchPlayers, createPlayer, updatePlayer, deletePlayer, teamScore } = usePlayers()
const { teams, fetchTeams, createTeam, addPlayerToTeam, removePlayerFromTeam, autoAssignTeamStarters, resetTeamStarters } = useTeams()

const dialogOpen = ref(false)
const editingPlayer = ref<Player | null>(null)
const teamDialogOpen = ref(false)
const pendingSlotIndex = ref(-1)

// Filters
const filterPosition = ref('all')
const filterOff = ref('all')
const filterDef = ref('all')
const filterTeam = ref('all')

// Sort
type SortKey = 'number' | 'name' | 'off' | 'def'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    if (sortDir.value === 'asc') sortDir.value = 'desc'
    else { sortKey.value = null; sortDir.value = 'asc' }
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const hasActiveFilters = computed(() =>
  filterPosition.value !== 'all' || filterOff.value !== 'all' || filterDef.value !== 'all' || filterTeam.value !== 'all'
)

function clearFilters() {
  filterPosition.value = 'all'
  filterOff.value = 'all'
  filterDef.value = 'all'
  filterTeam.value = 'all'
}

const filteredPlayers = computed(() => {
  let result = players.value.filter((p) => {
    // Position filter
    if (filterPosition.value !== 'all') {
      const pos = filterPosition.value
      if (!p.offense_positions.includes(pos as any) && !p.defense_positions.includes(pos as any)) return false
    }
    // OFF starter filter
    if (filterOff.value !== 'all') {
      const isOff = starterRatio(p.id, 'offense').starting > 0
      if (filterOff.value === 'starter' && !isOff) return false
      if (filterOff.value === 'bench' && isOff) return false
    }
    // DEF starter filter
    if (filterDef.value !== 'all') {
      const isDef = starterRatio(p.id, 'defense').starting > 0
      if (filterDef.value === 'starter' && !isDef) return false
      if (filterDef.value === 'bench' && isDef) return false
    }
    // Team filter
    if (filterTeam.value !== 'all') {
      const team = teams.value.find((t) => t.id === filterTeam.value)
      if (!team?.team_players?.some((tp) => tp.player_id === p.id)) return false
    }
    return true
  })

  // Sort
  if (sortKey.value) {
    const dir = sortDir.value === 'asc' ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (sortKey.value) {
        case 'number': return (a.number - b.number) * dir
        case 'name': return a.name.localeCompare(b.name) * dir
        case 'off': {
          const aR = starterRatio(a.id, 'offense')
          const bR = starterRatio(b.id, 'offense')
          return (aR.starting - bR.starting || aR.total - bR.total) * dir
        }
        case 'def': {
          const aR = starterRatio(a.id, 'defense')
          const bR = starterRatio(b.id, 'defense')
          return (aR.starting - bR.starting || aR.total - bR.total) * dir
        }
        default: return 0
      }
    })
  }

  return result
})

// Up to 3 tracked team IDs — persisted to localStorage
const STORAGE_KEY = 'flagos:tracked-teams'
const trackedTeamIds = ref<string[]>([])
if (import.meta.client) {
  trackedTeamIds.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
}
watch(trackedTeamIds, (ids) => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }
}, { deep: true })

const trackedTeams = computed(() =>
  [0, 1, 2].map((i) => {
    const id = trackedTeamIds.value[i]
    if (!id) return null
    return teams.value.find((t) => t.id === id) ?? null
  })
)

const availableTeamsForSlot = computed(() =>
  teams.value.filter((t) => !trackedTeamIds.value.includes(t.id) && t.name !== 'Free Agent')
)

// Player sets per tracked team
const trackedPlayerSets = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const team of trackedTeams.value) {
    if (!team) continue
    const ids = new Set<string>()
    for (const tp of team.team_players ?? []) {
      ids.add(tp.player_id)
    }
    map.set(team.id, ids)
  }
  return map
})

// Scores per slot
const slotScores = computed(() =>
  [0, 1, 2].map((i) => {
    const team = trackedTeams.value[i]
    if (!team?.team_players) return { off: 0, def: 0, overall: 0 }
    const ids = trackedPlayerSets.value.get(team.id)
    if (!ids || ids.size === 0) return { off: 0, def: 0, overall: 0 }
    const teamPlayers = players.value.filter((p) => ids.has(p.id))

    // Build position/starter data from team_players
    const offData = team.team_players.map((tp) => ({
      player_id: tp.player_id,
      position: tp.offense_position,
      starter: tp.offense_starter,
    }))
    const defData = team.team_players.map((tp) => ({
      player_id: tp.player_id,
      position: tp.defense_position,
      starter: tp.defense_starter,
    }))

    const off = teamScore(teamPlayers, 'offense', offData)
    const def = teamScore(teamPlayers, 'defense', defData)
    const overall = teamPlayers.length > 0 ? Math.round(((off + def) / 2) * 10) / 10 : 0
    return { off, def, overall }
  })
)

const slotPlayerCounts = computed(() =>
  [0, 1, 2].map((i) => {
    const id = trackedTeamIds.value[i]
    return id ? (trackedPlayerSets.value.get(id)?.size ?? 0) : 0
  })
)

function isPlayerOnTeam(playerId: string, teamId: string): boolean {
  return trackedPlayerSets.value.get(teamId)?.has(playerId) ?? false
}

function isTeamStarter(playerId: string, teamId: string): boolean {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team?.team_players) return false
  const tp = team.team_players.find((tp) => tp.player_id === playerId)
  return !!tp && (tp.offense_starter || tp.defense_starter)
}

// Returns set of positions this player is starting at across all teams
function getStartingPositions(playerId: string): Set<string> {
  const positions = new Set<string>()
  for (const team of teams.value) {
    if (!team.team_players) continue
    const tp = team.team_players.find((tp) => tp.player_id === playerId)
    if (!tp) continue
    if (tp.offense_starter && tp.offense_position) positions.add(tp.offense_position)
    if (tp.defense_starter && tp.defense_position) positions.add(tp.defense_position)
  }
  return positions
}

// Count how many teams a player starts for vs how many they're on
function starterRatio(playerId: string, side: 'offense' | 'defense'): { starting: number; total: number } {
  let starting = 0, total = 0
  for (const team of teams.value) {
    const tp = team.team_players?.find((tp) => tp.player_id === playerId)
    if (!tp) continue
    total++
    if (side === 'offense' && tp.offense_starter) starting++
    if (side === 'defense' && tp.defense_starter) starting++
  }
  return { starting, total }
}

const TEAM_COLORS = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#ef4444', '#ec4899', '#f59e0b', '#14b8a6']

const teamColorMap = computed(() => {
  const map = new Map<string, string>()
  let i = 0
  for (const t of teams.value) {
    if (t.name === 'Free Agent') continue
    map.set(t.id, TEAM_COLORS[i % TEAM_COLORS.length])
    i++
  }
  return map
})

function getPlayerTeams(playerId: string): { id: string; name: string; color: string }[] {
  const result: { id: string; name: string; color: string }[] = []
  for (const team of teams.value) {
    if (team.team_players?.some((tp) => tp.player_id === playerId)) {
      if (team.name === 'Free Agent') {
        result.push({ id: team.id, name: 'Free Agent', color: '' })
      } else {
        result.push({ id: team.id, name: team.name, color: teamColorMap.value.get(team.id) ?? '#888' })
      }
    }
  }
  return result.length > 0 ? result : [{ id: '', name: 'Free Agent', color: '' }]
}

function getPlayerTeamNames(playerId: string): string[] {
  return getPlayerTeams(playerId).map((t) => t.name)
}

function getPlayerTeamIds(playerId: string): string[] {
  const ids: string[] = []
  for (const team of teams.value) {
    if (team.team_players?.some((tp) => tp.player_id === playerId)) {
      ids.push(team.id)
    }
  }
  return ids
}

const freeAgentTeam = computed(() => teams.value.find((t) => t.name === 'Free Agent'))

function getTeamInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function selectSlot(index: number, teamId: string) {
  if (teamId === '__new__') {
    pendingSlotIndex.value = index
    teamDialogOpen.value = true
    return
  }
  // Always maintain a 3-slot sparse array so middle card stays in position
  const ids = [...trackedTeamIds.value]
  // Pad with empty strings up to the index
  while (ids.length <= index) ids.push('')
  ids[index] = teamId
  trackedTeamIds.value = ids
}

function removeSlot(index: number) {
  const ids = [...trackedTeamIds.value]
  ids[index] = ''
  // Trim trailing empty slots
  while (ids.length > 0 && !ids[ids.length - 1]) ids.pop()
  trackedTeamIds.value = ids
}

async function togglePlayerTeam(player: Player, teamId: string) {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team) return
  const tp = team.team_players?.find((tp) => tp.player_id === player.id)
  if (tp) {
    await removePlayerFromTeam(teamId, tp.id)
  } else {
    await addPlayerToTeam(
      teamId,
      player.id,
      player.offense_positions[0] ?? null,
      player.defense_positions[0] ?? null,
    )
  }
}

function openDialog(player: Player | null) {
  editingPlayer.value = player
  dialogOpen.value = true
}

async function handleSubmit(data: {
  name: string
  number: number
  offense_positions: string[]
  defense_positions: string[]
  offense_attributes: Record<string, number>
  defense_attributes: Record<string, number>
  team_ids: string[]
}) {
  const { team_ids, ...playerData } = data
  if (editingPlayer.value) {
    await updatePlayer(editingPlayer.value.id, playerData as Partial<Player>)
    // Sync team memberships
    await syncPlayerTeams(editingPlayer.value.id, team_ids, playerData)
  } else {
    const newPlayer = await createPlayer(playerData)
    if (newPlayer) {
      // Assign to selected teams, or Free Agent if no teams chosen
      const assignTeams = team_ids.length > 0 ? team_ids : (freeAgentTeam.value ? [freeAgentTeam.value.id] : [])
      for (const teamId of assignTeams) {
        await addPlayerToTeam(
          teamId,
          newPlayer.id,
          playerData.offense_positions[0] ?? null,
          playerData.defense_positions[0] ?? null,
        )
      }
    }
  }
}

async function syncPlayerTeams(playerId: string, newTeamIds: string[], playerData: { offense_positions: string[]; defense_positions: string[] }) {
  const fa = freeAgentTeam.value
  const currentTeamIds = getPlayerTeamIds(playerId)
  // Filter out Free Agent from both lists for comparison
  const currentReal = currentTeamIds.filter((id) => id !== fa?.id)
  const newReal = newTeamIds

  // Remove from teams no longer selected
  for (const teamId of currentReal) {
    if (!newReal.includes(teamId)) {
      const team = teams.value.find((t) => t.id === teamId)
      const tp = team?.team_players?.find((tp) => tp.player_id === playerId)
      if (tp) await removePlayerFromTeam(teamId, tp.id)
    }
  }
  // Add to newly selected teams
  for (const teamId of newReal) {
    if (!currentReal.includes(teamId)) {
      await addPlayerToTeam(
        teamId,
        playerId,
        playerData.offense_positions[0] ?? null,
        playerData.defense_positions[0] ?? null,
      )
    }
  }
  // If player now has real teams, remove from Free Agent
  if (newReal.length > 0 && fa) {
    const faTp = fa.team_players?.find((tp) => tp.player_id === playerId)
    if (faTp) await removePlayerFromTeam(fa.id, faTp.id)
  }
  // If player has no real teams, add to Free Agent
  if (newReal.length === 0 && fa) {
    const alreadyFA = fa.team_players?.some((tp) => tp.player_id === playerId)
    if (!alreadyFA) {
      await addPlayerToTeam(
        fa.id,
        playerId,
        playerData.offense_positions[0] ?? null,
        playerData.defense_positions[0] ?? null,
      )
    }
  }
}

async function handleAutoStarters() {
  // Auto-assign starters per team (all teams, not just tracked)
  for (const team of teams.value) {
    await autoAssignTeamStarters(team.id)
  }
}

async function handleResetStarters() {
  // Reset starters per team (all teams, not just tracked)
  for (const team of teams.value) {
    await resetTeamStarters(team.id)
  }
}

async function handleDelete(id: string) {
  if (confirm('Are you sure you want to delete this player?')) {
    await deletePlayer(id)
  }
}

async function handleCreateTeam(data: { name: string; description: string }) {
  const team = await createTeam(data.name, data.description)
  if (team) {
    const idx = pendingSlotIndex.value >= 0 ? pendingSlotIndex.value : trackedTeamIds.value.length
    if (idx < 3) {
      const ids = [...trackedTeamIds.value]
      while (ids.length <= idx) ids.push('')
      ids[idx] = team.id
      trackedTeamIds.value = ids
    }
    pendingSlotIndex.value = -1
  }
}

onMounted(() => {
  fetchPlayers()
  fetchTeams()
})
</script>
