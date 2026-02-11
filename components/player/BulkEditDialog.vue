<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-2xl glass">
      <DialogHeader>
        <DialogTitle>Edit {{ playerIds.length }} Players</DialogTitle>
        <DialogDescription>Toggle sections on to apply changes. Untouched sections are skipped.</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
        <!-- Offense Positions -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyOffensePos" @update:model-value="applyOffensePos = !!$event" />
            <span class="text-sm font-medium">Apply Offense Positions</span>
          </label>
          <div v-if="applyOffensePos" class="flex gap-2 pl-6">
            <button
              v-for="pos in OFF_POS"
              :key="pos"
              @click="togglePos('offense', pos)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="form.offense_positions.includes(pos)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'"
            >
              {{ pos }}
            </button>
          </div>
        </div>

        <!-- Defense Positions -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyDefensePos" @update:model-value="applyDefensePos = !!$event" />
            <span class="text-sm font-medium">Apply Defense Positions</span>
          </label>
          <div v-if="applyDefensePos" class="flex gap-2 pl-6">
            <button
              v-for="pos in DEF_POS"
              :key="pos"
              @click="togglePos('defense', pos)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="form.defense_positions.includes(pos)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'"
            >
              {{ pos }}
            </button>
          </div>
        </div>

        <!-- Teams -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyTeams" @update:model-value="applyTeams = !!$event" />
            <span class="text-sm font-medium">Apply Teams</span>
          </label>
          <div v-if="applyTeams" class="flex gap-2 flex-wrap pl-6">
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
          <p v-if="applyTeams && form.team_ids.length === 0" class="text-xs text-muted-foreground pl-6">No teams selected — players will become Free Agents</p>
        </div>

        <Separator />

        <!-- Universal Attributes -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyUniversalAttrs" @update:model-value="applyUniversalAttrs = !!$event" />
            <span class="text-sm font-medium">Apply Universal Attributes</span>
          </label>
          <div v-if="applyUniversalAttrs" class="pl-6">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="attr in UNIVERSAL_ATTRIBUTE_GROUP.attrs" :key="attr.key" class="flex items-center gap-2">
                <span class="flex-1 text-sm text-muted-foreground">{{ attr.label }}</span>
                <input
                  inputmode="numeric"
                  :value="form.universal_attributes[attr.key]"
                  @input="(e: Event) => form.universal_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                  @blur="(e: Event) => form.universal_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                  class="w-16 h-8 text-center text-sm rounded-md border border-input bg-background px-2"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Offense Attributes -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyOffenseAttrs" @update:model-value="applyOffenseAttrs = !!$event" />
            <span class="text-sm font-medium">Apply Offense Attributes</span>
          </label>
          <div v-if="applyOffenseAttrs" class="space-y-3 pl-6">
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
        </div>

        <Separator />

        <!-- Defense Attributes -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox :model-value="applyDefenseAttrs" @update:model-value="applyDefenseAttrs = !!$event" />
            <span class="text-sm font-medium">Apply Defense Attributes</span>
          </label>
          <div v-if="applyDefenseAttrs" class="space-y-3 pl-6">
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
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!hasAnythingEnabled || saving">
          {{ saving ? 'Updating...' : `Update ${playerIds.length} Players` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { Player, Team } from '~/lib/types'
import {
  DEFAULT_UNIVERSAL_ATTRIBUTES,
  DEFAULT_OFFENSE_ATTRIBUTES,
  DEFAULT_DEFENSE_ATTRIBUTES,
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
} from '~/lib/constants'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Separator } from '~/components/ui/separator'

const OFF_POS = ['QB', 'WR', 'C']
const DEF_POS = ['DB', 'RSH', 'MLB']

const props = defineProps<{
  open: boolean
  playerIds: string[]
  teams: Team[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { bulkUpdatePlayers } = usePlayers()
const { bulkSetPlayerTeams } = useTeams()

const saving = ref(false)

// Section toggles
const applyOffensePos = ref(false)
const applyDefensePos = ref(false)
const applyTeams = ref(false)
const applyUniversalAttrs = ref(false)
const applyOffenseAttrs = ref(false)
const applyDefenseAttrs = ref(false)

const form = reactive({
  offense_positions: [] as string[],
  defense_positions: [] as string[],
  team_ids: [] as string[],
  universal_attributes: { ...DEFAULT_UNIVERSAL_ATTRIBUTES } as Record<string, number>,
  offense_attributes: { ...DEFAULT_OFFENSE_ATTRIBUTES } as Record<string, number>,
  defense_attributes: { ...DEFAULT_DEFENSE_ATTRIBUTES } as Record<string, number>,
})

const selectableTeams = computed(() => props.teams.filter((t) => t.name !== 'Free Agent'))

const hasAnythingEnabled = computed(() =>
  applyOffensePos.value || applyDefensePos.value || applyTeams.value ||
  applyUniversalAttrs.value || applyOffenseAttrs.value || applyDefenseAttrs.value
)

function clampAttr(v: string | number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  if (isNaN(n)) return 1
  return Math.min(10, Math.max(1, n))
}

function togglePos(side: 'offense' | 'defense', pos: string) {
  const arr = side === 'offense' ? form.offense_positions : form.defense_positions
  const idx = arr.indexOf(pos)
  if (idx === -1) arr.push(pos)
  else arr.splice(idx, 1)
}

function toggleTeam(teamId: string) {
  const idx = form.team_ids.indexOf(teamId)
  if (idx === -1) form.team_ids.push(teamId)
  else form.team_ids.splice(idx, 1)
}

// Reset form when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    applyOffensePos.value = false
    applyDefensePos.value = false
    applyTeams.value = false
    applyUniversalAttrs.value = false
    applyOffenseAttrs.value = false
    applyDefenseAttrs.value = false
    form.offense_positions = []
    form.defense_positions = []
    form.team_ids = []
    form.universal_attributes = { ...DEFAULT_UNIVERSAL_ATTRIBUTES }
    form.offense_attributes = { ...DEFAULT_OFFENSE_ATTRIBUTES }
    form.defense_attributes = { ...DEFAULT_DEFENSE_ATTRIBUTES }
  }
})

async function handleSubmit() {
  saving.value = true
  try {
    // Build player updates (positions + attributes)
    const updates: Partial<Player> = {}
    if (applyOffensePos.value) updates.offense_positions = [...form.offense_positions] as any
    if (applyDefensePos.value) updates.defense_positions = [...form.defense_positions] as any
    if (applyUniversalAttrs.value) updates.universal_attributes = { ...form.universal_attributes } as any
    if (applyOffenseAttrs.value) updates.offense_attributes = { ...form.offense_attributes } as any
    if (applyDefenseAttrs.value) updates.defense_attributes = { ...form.defense_attributes } as any

    // Apply player updates if any
    if (Object.keys(updates).length > 0) {
      await bulkUpdatePlayers(props.playerIds, updates)
    }

    // Apply team assignments if toggled
    if (applyTeams.value) {
      await bulkSetPlayerTeams(props.playerIds, form.team_ids)
    }

    emit('saved')
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>
