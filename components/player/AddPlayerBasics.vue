<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label class="mx-2">Name</Label>
        <Input v-model="form.name" placeholder="Player name" class="mx-2" />
      </div>
      <div class="space-y-2">
        <Label class="mx-2">Number</Label>
        <Input v-model.number="form.number" type="number" placeholder="#" :min="0" :max="99" class="mx-2" />
      </div>
      <div class="space-y-2">
        <Label class="mx-2">Height</Label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Input
              type="text"
              inputmode="numeric"
              placeholder="Ft"
              class="pr-7 mx-2"
              :model-value="String(Math.floor((form.height ?? 0) / 12) || '')"
              @update:model-value="onHeightFtInput"
            />
            <span class="absolute right-2.5 top-2.5 text-xs text-muted-foreground">ft</span>
          </div>
          <div class="relative flex-1">
            <Input
              type="text"
              inputmode="numeric"
              placeholder="In"
              class="pr-7 mx-2"
              :model-value="String((form.height ?? 0) % 12 || '')"
              @update:model-value="onHeightInInput"
            />
            <span class="absolute right-2.5 top-2.5 text-xs text-muted-foreground">in</span>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <Label class="mx-2">Weight (lbs)</Label>
        <Input
          type="text"
          inputmode="numeric"
          placeholder="lbs"
          class="mx-2"
          :model-value="form.weight != null ? String(form.weight) : ''"
          @update:model-value="onWeightInput"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label class="mx-2">Offense Positions</Label>
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
      <Label class="mx-2">Defense Positions</Label>
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
      <Label class="mx-2">Teams</Label>
      <div class="flex gap-2 flex-wrap mx-2">
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
      <p v-if="form.team_ids.length === 0" class="text-xs text-muted-foreground mx-2">No teams selected — player will be a Free Agent</p>
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

function onHeightFtInput(val: string | number) {
  const raw = String(val).replace(/\D/g, '')
  const num = parseInt(raw) || 0
  const currentIn = (props.form.height ?? 0) % 12
  props.form.height = num * 12 + currentIn
  if (props.form.height === 0 && raw === '') props.form.height = null
}

function onHeightInInput(val: string | number) {
  const raw = String(val).replace(/\D/g, '')
  const num = parseInt(raw) || 0
  const currentFt = Math.floor((props.form.height ?? 0) / 12)
  props.form.height = currentFt * 12 + num
  if (props.form.height === 0 && raw === '') props.form.height = null
}

function onWeightInput(val: string | number) {
  const raw = String(val).replace(/\D/g, '')
  props.form.weight = raw === '' ? null : parseInt(raw)
}
</script>
