<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-2xl glass">
      <DialogHeader>
        <DialogTitle>{{ player ? 'Edit Player' : 'Add Player' }}</DialogTitle>
        <DialogDescription>{{ player ? 'Update player details.' : 'Add a new player to your roster.' }}</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Name</Label>
            <Input v-model="form.name" placeholder="Player name" />
          </div>
          <div class="space-y-2">
            <Label>Number</Label>
            <Input v-model.number="form.number" type="number" placeholder="#" :min="0" :max="99" />
          </div>
        </div>

        <div class="space-y-2">
          <Label>Offense Positions</Label>
          <div class="flex gap-2">
            <button
              v-for="pos in OFFENSE_POSITIONS"
              :key="pos"
              @click="togglePosition('offense', pos)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="form.offense_positions.includes(pos)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'"
            >
              {{ pos }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label>Defense Positions</Label>
          <div class="flex gap-2">
            <button
              v-for="pos in DEFENSE_POSITIONS"
              :key="pos"
              @click="togglePosition('defense', pos)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="form.defense_positions.includes(pos)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'"
            >
              {{ pos }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label>Teams</Label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="team in selectableTeams"
              :key="team.id"
              @click="toggleTeam(team.id)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="form.team_ids.includes(team.id)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'"
            >
              {{ team.name }}
            </button>
          </div>
          <p v-if="form.team_ids.length === 0" class="text-xs text-muted-foreground">No teams selected — player will be a Free Agent</p>
        </div>

        <Separator />

        <div class="space-y-3">
          <Label class="text-muted-foreground text-xs uppercase tracking-wide">Offense Attributes</Label>
          <div v-for="group in OFFENSE_ATTRIBUTE_GROUPS" :key="group.label" class="space-y-2">
            <span class="text-xs font-semibold text-muted-foreground/70">{{ group.label }}</span>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="attr in group.attrs" :key="attr.key" class="flex items-center gap-2">
                <span class="flex-1 text-sm text-muted-foreground">{{ attr.label }}</span>
                <input
                  inputmode="numeric"
                  :value="form.offense_attributes[attr.key]"
                  @input="(e: Event) => form.offense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                  @blur="(e: Event) => form.offense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                  class="w-16 h-8 text-center text-sm rounded-md border border-input bg-background px-2"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div class="space-y-3">
          <Label class="text-muted-foreground text-xs uppercase tracking-wide">Defense Attributes</Label>
          <div v-for="group in DEFENSE_ATTRIBUTE_GROUPS" :key="group.label" class="space-y-2">
            <span class="text-xs font-semibold text-muted-foreground/70">{{ group.label }}</span>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="attr in group.attrs" :key="attr.key" class="flex items-center gap-2">
                <span class="flex-1 text-sm text-muted-foreground">{{ attr.label }}</span>
                <input
                  inputmode="numeric"
                  :value="form.defense_attributes[attr.key]"
                  @input="(e: Event) => form.defense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                  @blur="(e: Event) => form.defense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                  class="w-16 h-8 text-center text-sm rounded-md border border-input bg-background px-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!form.name">
          {{ player ? 'Save' : 'Add Player' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { Player, Team, OffenseAttributes, DefenseAttributes } from '~/lib/types'
import {
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
  DEFAULT_OFFENSE_ATTRIBUTES,
  DEFAULT_DEFENSE_ATTRIBUTES,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
} from '~/lib/constants'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'

const props = defineProps<{
  open: boolean
  player: Player | null
  teams: Team[]
  playerTeamIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: {
    name: string
    number: number
    offense_positions: string[]
    defense_positions: string[]
    offense_attributes: Record<string, number>
    defense_attributes: Record<string, number>
    team_ids: string[]
  }]
}>()

const form = reactive({
  name: '',
  number: 0,
  offense_positions: [] as string[],
  defense_positions: [] as string[],
  offense_attributes: { ...DEFAULT_OFFENSE_ATTRIBUTES } as Record<string, number>,
  defense_attributes: { ...DEFAULT_DEFENSE_ATTRIBUTES } as Record<string, number>,
  team_ids: [] as string[],
})

const selectableTeams = computed(() => props.teams.filter((t) => t.name !== 'Free Agent'))

function clampAttr(v: string | number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  if (isNaN(n)) return 1
  return Math.min(10, Math.max(1, n))
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.player) {
    form.name = props.player.name
    form.number = props.player.number
    form.offense_positions = [...props.player.offense_positions]
    form.defense_positions = [...props.player.defense_positions]
    form.offense_attributes = { ...DEFAULT_OFFENSE_ATTRIBUTES, ...props.player.offense_attributes }
    form.defense_attributes = { ...DEFAULT_DEFENSE_ATTRIBUTES, ...props.player.defense_attributes }
    form.team_ids = [...props.playerTeamIds].filter((id) => {
      const team = props.teams.find((t) => t.id === id)
      return team && team.name !== 'Free Agent'
    })
  } else if (isOpen) {
    form.name = ''
    form.number = 0
    form.offense_positions = []
    form.defense_positions = []
    form.offense_attributes = { ...DEFAULT_OFFENSE_ATTRIBUTES }
    form.defense_attributes = { ...DEFAULT_DEFENSE_ATTRIBUTES }
    form.team_ids = []
  }
})

function toggleTeam(teamId: string) {
  const idx = form.team_ids.indexOf(teamId)
  if (idx === -1) form.team_ids.push(teamId)
  else form.team_ids.splice(idx, 1)
}

function togglePosition(side: 'offense' | 'defense', pos: string) {
  const arr = side === 'offense' ? form.offense_positions : form.defense_positions
  const idx = arr.indexOf(pos)
  if (idx === -1) arr.push(pos)
  else arr.splice(idx, 1)
}

function handleSubmit() {
  emit('submit', { ...form })
  emit('update:open', false)
}
</script>
