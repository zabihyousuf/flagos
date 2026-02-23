<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Name</Label>
        <Input v-model="form.name" placeholder="Player name" />
      </div>
      <div class="space-y-2">
        <Label>Number</Label>
        <Input v-model.number="form.number" type="number" placeholder="#" :min="0" :max="99" />
      </div>
      <div class="space-y-2">
        <Label>Height</Label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Input
              type="number"
              placeholder="Ft"
              class="pr-7"
              :value="Math.floor((form.height ?? 0) / 12) || ''"
              @input="onHeightFtInput"
            />
            <span class="absolute right-2.5 top-2.5 text-xs text-muted-foreground">ft</span>
          </div>
          <div class="relative flex-1">
            <Input
              type="number"
              placeholder="In"
              class="pr-7"
              :value="(form.height ?? 0) % 12 || ''"
              @input="onHeightInInput"
            />
            <span class="absolute right-2.5 top-2.5 text-xs text-muted-foreground">in</span>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <Label>Weight (lbs)</Label>
        <Input v-model.number="form.weight" type="number" placeholder="lbs" :min="50" :max="400" />
      </div>
    </div>

    <div class="space-y-2">
      <Label>Offense Positions</Label>
      <div class="flex gap-2">
        <button
          v-for="pos in OFFENSE_POSITIONS"
          :key="pos"
          type="button"
          @click="$emit('toggle-position', 'offense', pos)"
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
          type="button"
          @click="$emit('toggle-position', 'defense', pos)"
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
          type="button"
          @click="$emit('toggle-team', team.id)"
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
  </div>
</template>

<script setup lang="ts">
import { OFFENSE_POSITIONS, DEFENSE_POSITIONS } from '~/lib/constants'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import type { Team } from '~/lib/types'

const props = defineProps<{
  form: {
    name: string
    number: number
    height: number | null
    weight: number | null
    offense_positions: string[]
    defense_positions: string[]
    team_ids: string[]
  }
  selectableTeams: Team[]
}>()

defineEmits<{
  'toggle-position': [side: 'offense' | 'defense', pos: string]
  'toggle-team': [teamId: string]
}>()

function onHeightFtInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  const currentIn = (props.form.height ?? 0) % 12
  props.form.height = val * 12 + currentIn
  if (props.form.height === 0 && (e.target as HTMLInputElement).value === '') props.form.height = null
}

function onHeightInInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  const currentFt = Math.floor((props.form.height ?? 0) / 12)
  props.form.height = currentFt * 12 + val
  if (props.form.height === 0 && (e.target as HTMLInputElement).value === '') props.form.height = null
}
</script>
