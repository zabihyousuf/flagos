<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Teams</h2>
        <p class="text-muted-foreground text-sm mt-1">Create teams and assign players to positions.</p>
      </div>
      <Button @click="openTeamDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Create Team
      </Button>
    </div>

    <div v-if="loading && teams.length === 0" class="text-muted-foreground text-sm">Loading teams...</div>

    <div v-else-if="teams.length === 0" class="text-center py-12">
      <Shield class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">No teams yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Create your first team to start organizing players.</p>
      <Button class="mt-4" @click="openTeamDialog(null)">
        <Plus class="w-4 h-4 mr-2" />
        Create Team
      </Button>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="team in teams"
        :key="team.id"
        class="space-y-3"
      >
        <TeamCard
          :team="team"
          @edit="openTeamDialog(team)"
          @delete="handleDeleteTeam(team.id)"
        />

        <!-- Player assignment section -->
        <Card class="glass ml-4">
          <CardContent class="p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-muted-foreground">Roster</span>
              <Button size="sm" variant="outline" @click="openAddPlayerDialog(team.id)">
                <UserPlus class="w-3.5 h-3.5 mr-1.5" />
                Add Player
              </Button>
            </div>

            <div v-if="!team.team_players?.length" class="text-sm text-muted-foreground py-2">
              No players assigned yet.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="tp in team.team_players"
                :key="tp.id"
                class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium">{{ tp.player?.name ?? 'Unknown' }}</span>
                  <Badge v-if="tp.offense_position" variant="secondary" class="text-xs">
                    {{ tp.offense_position }}
                  </Badge>
                  <Badge v-if="tp.defense_position" variant="outline" class="text-xs">
                    {{ tp.defense_position }}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-7 w-7 text-destructive"
                  @click="handleRemovePlayer(team.id, tp.id)"
                >
                  <X class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <TeamDialog
      :open="teamDialogOpen"
      :team="editingTeam"
      @update:open="teamDialogOpen = $event"
      @submit="handleTeamSubmit"
    />

    <!-- Add Player to Team Dialog -->
    <Dialog :open="addPlayerDialogOpen" @update:open="addPlayerDialogOpen = $event">
      <DialogContent class="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle>Add Player to Team</DialogTitle>
          <DialogDescription>Select a player and assign their position.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Player</Label>
            <Select v-model="addPlayerForm.playerId">
              <SelectTrigger>
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="p in availablePlayers"
                  :key="p.id"
                  :value="p.id"
                >
                  #{{ p.number }} {{ p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Offense Position</Label>
              <Select v-model="addPlayerForm.offensePosition">
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem v-for="pos in OFFENSE_POSITIONS" :key="pos" :value="pos">
                    {{ pos }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Defense Position</Label>
              <Select v-model="addPlayerForm.defensePosition">
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem v-for="pos in DEFENSE_POSITIONS" :key="pos" :value="pos">
                    {{ pos }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="addPlayerDialogOpen = false">Cancel</Button>
          <Button @click="handleAddPlayer" :disabled="!addPlayerForm.playerId">Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '~/lib/types'
import { OFFENSE_POSITIONS, DEFENSE_POSITIONS } from '~/lib/constants'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Plus, Shield, UserPlus, X } from 'lucide-vue-next'

const { teams, loading, fetchTeams, createTeam, updateTeam, deleteTeam, addPlayerToTeam, removePlayerFromTeam } = useTeams()
const { players: allPlayers, fetchPlayers } = usePlayers()

const teamDialogOpen = ref(false)
const editingTeam = ref<Team | null>(null)
const addPlayerDialogOpen = ref(false)
const addToTeamId = ref<string | null>(null)

const addPlayerForm = reactive({
  playerId: '',
  offensePosition: 'none',
  defensePosition: 'none',
})

watch(() => addPlayerForm.playerId, (playerId) => {
  if (!playerId) return
  const player = allPlayers.value.find((p) => p.id === playerId)
  if (!player) return
  addPlayerForm.offensePosition = player.offense_positions[0] ?? 'none'
  addPlayerForm.defensePosition = player.defense_positions[0] ?? 'none'
})

const availablePlayers = computed(() => {
  if (!addToTeamId.value) return allPlayers.value
  const team = teams.value.find((t) => t.id === addToTeamId.value)
  const assignedIds = new Set(team?.team_players?.map((tp) => tp.player_id) ?? [])
  return allPlayers.value.filter((p) => !assignedIds.has(p.id))
})

function openTeamDialog(team: Team | null) {
  editingTeam.value = team
  teamDialogOpen.value = true
}

function openAddPlayerDialog(teamId: string) {
  addToTeamId.value = teamId
  addPlayerForm.playerId = ''
  addPlayerForm.offensePosition = 'none'
  addPlayerForm.defensePosition = 'none'
  addPlayerDialogOpen.value = true
}

async function handleTeamSubmit(data: { name: string; description: string }) {
  if (editingTeam.value) {
    await updateTeam(editingTeam.value.id, data)
  } else {
    await createTeam(data.name, data.description)
  }
}

async function handleDeleteTeam(id: string) {
  if (confirm('Are you sure you want to delete this team?')) {
    await deleteTeam(id)
  }
}

async function handleAddPlayer() {
  if (!addToTeamId.value || !addPlayerForm.playerId) return
  await addPlayerToTeam(
    addToTeamId.value,
    addPlayerForm.playerId,
    addPlayerForm.offensePosition === 'none' ? null : addPlayerForm.offensePosition,
    addPlayerForm.defensePosition === 'none' ? null : addPlayerForm.defensePosition,
  )
  addPlayerDialogOpen.value = false
}

async function handleRemovePlayer(teamId: string, teamPlayerId: string) {
  await removePlayerFromTeam(teamId, teamPlayerId)
}

onMounted(() => {
  fetchTeams()
  fetchPlayers()
})
</script>
