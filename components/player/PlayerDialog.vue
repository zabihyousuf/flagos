<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-2xl glass max-h-[90vh] overflow-hidden grid-rows-[auto_1fr_auto]">
      <DialogHeader>
        <DialogTitle>{{ player ? 'Edit Player' : 'Add Player' }}</DialogTitle>
        <DialogDescription>
          {{ player ? 'Update player details and attributes.' : 'Add a new player. You can edit attributes later from the roster.' }}
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 overflow-y-auto space-y-4 py-4 pr-1">
        <AddPlayerBasics
          :form="form"
          :selectable-teams="selectableTeams"
          @toggle-position="togglePosition"
          @toggle-team="toggleTeam"
        />

        <!-- Attributes (only when at least one position is selected) -->
        <template v-if="form.offense_positions.length > 0 || form.defense_positions.length > 0">
          <div class="space-y-2 pt-2 border-t border-border">
            <Label class="text-sm font-medium">Attributes</Label>
            <p class="text-xs text-muted-foreground">How would you like to set this player&apos;s attributes?</p>
            <div class="flex gap-2">
              <Button
                :variant="attributeMode === 'defaults' ? 'default' : 'outline'"
                size="sm"
                @click="setAttributeMode('defaults')"
              >
                Use default attributes
              </Button>
              <Button
                :variant="attributeMode === 'custom' ? 'default' : 'outline'"
                size="sm"
                @click="setAttributeMode('custom')"
              >
                Enter my own
              </Button>
            </div>
          </div>

        <!-- Attribute sliders (when custom) -->
        <template v-if="attributeMode === 'custom'">
          <div class="space-y-2 pt-2">
            <div class="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
              <Button variant="ghost" size="sm" class="h-7 text-xs" @click="applyDefaults">
                Reset to defaults
              </Button>
              <div v-if="copyablePlayers.length > 0" class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">Copy from:</span>
                <Select v-model="copyFromPlayerId" @update:model-value="(id) => id && applyCopyFrom(id)">
                  <SelectTrigger class="w-[160px] h-7 text-xs">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="p in copyablePlayers" :key="p.id" :value="p.id">
                      {{ p.name }} (#{{ p.number }})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="max-h-[40vh] overflow-y-auto pr-1 space-y-2">
              <CollapsibleSection v-model:open="sectionsOpen.universal" title="Universal">
                <div class="grid grid-cols-1 gap-3 pt-2">
                  <AttributeSlider
                    v-for="attr in UNIVERSAL_ATTRIBUTE_GROUP.attrs"
                    :key="attr.key"
                    :label="attr.label"
                    :model-value="form.universal_attributes[attr.key] ?? 5"
                    @update:model-value="form.universal_attributes[attr.key] = $event"
                  />
                </div>
              </CollapsibleSection>
              <CollapsibleSection v-if="visibleOffenseGroups.length > 0" v-model:open="sectionsOpen.offense" title="Offense">
                <div v-for="group in visibleOffenseGroups" :key="group.label" class="space-y-2 pt-3 first:pt-2">
                  <span class="text-xs font-semibold text-muted-foreground/80">{{ group.label }}</span>
                  <div class="grid grid-cols-1 gap-3">
                    <AttributeSlider
                      v-for="attr in group.attrs"
                      :key="attr.key"
                      :label="attr.label"
                      :model-value="form.offense_attributes[attr.key] ?? 5"
                      @update:model-value="form.offense_attributes[attr.key] = $event"
                    />
                  </div>
                </div>
              </CollapsibleSection>
              <CollapsibleSection v-if="visibleDefenseGroups.length > 0" v-model:open="sectionsOpen.defense" title="Defense">
                <div v-for="group in visibleDefenseGroups" :key="group.label" class="space-y-2 pt-3 first:pt-2">
                  <span class="text-xs font-semibold text-muted-foreground/80">{{ group.label }}</span>
                  <div class="grid grid-cols-1 gap-3">
                    <AttributeSlider
                      v-for="attr in group.attrs"
                      :key="attr.key"
                      :label="attr.label"
                      :model-value="form.defense_attributes[attr.key] ?? 5"
                      @update:model-value="form.defense_attributes[attr.key] = $event"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </template>
        </template>
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
import type { Player, Team } from '~/lib/types'
import {
  DEFAULT_UNIVERSAL_ATTRIBUTES,
  DEFAULT_OFFENSE_ATTRIBUTES,
  DEFAULT_DEFENSE_ATTRIBUTES,
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
} from '~/lib/constants'
import {
  sanitizeAttributesForPositions,
  resetAttributesForPosition,
} from '~/lib/playerAttributes'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import AddPlayerBasics from '~/components/player/AddPlayerBasics.vue'
import CollapsibleSection from '~/components/player/CollapsibleSection.vue'
import AttributeSlider from '~/components/player/AttributeSlider.vue'

const props = defineProps<{
  open: boolean
  player: Player | null
  teams: Team[]
  playerTeamIds: string[]
  allPlayers?: Player[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: {
    name: string
    number: number
    height: number | null
    weight: number | null
    offense_positions: string[]
    defense_positions: string[]
    universal_attributes: Record<string, number>
    offense_attributes: Record<string, number>
    defense_attributes: Record<string, number>
    team_ids: string[]
  }]
}>()

const form = reactive({
  name: '',
  number: 0,
  height: null as number | null,
  weight: null as number | null,
  offense_positions: [] as string[],
  defense_positions: [] as string[],
  universal_attributes: { ...DEFAULT_UNIVERSAL_ATTRIBUTES } as Record<string, number>,
  offense_attributes: { ...DEFAULT_OFFENSE_ATTRIBUTES } as Record<string, number>,
  defense_attributes: { ...DEFAULT_DEFENSE_ATTRIBUTES } as Record<string, number>,
  team_ids: [] as string[],
})

const sectionsOpen = reactive({ universal: true, offense: true, defense: true })
const copyFromPlayerId = ref<string>('')
const attributeMode = ref<'defaults' | 'custom'>('defaults')

const selectableTeams = computed(() => props.teams.filter((t) => t.name !== 'Free Agent'))
const copyablePlayers = computed(() => (props.allPlayers ?? []).filter((p) => p.id !== props.player?.id))

const visibleOffenseGroups = computed(() => {
  const pos = form.offense_positions
  if (pos.length === 0) return []
  return OFFENSE_ATTRIBUTE_GROUPS.filter((g) => {
    if (g.label === 'Evasion') return pos.length > 0
    return pos.includes(g.label)
  })
})

const visibleDefenseGroups = computed(() => {
  const pos = form.defense_positions
  if (pos.length === 0) return []
  return DEFENSE_ATTRIBUTE_GROUPS.filter((g) => {
    if (g.label === 'Evasion') return pos.length > 0
    return pos.includes(g.label)
  })
})

function setAttributeMode(mode: 'defaults' | 'custom') {
  attributeMode.value = mode
  if (mode === 'defaults') {
    applyDefaults()
  }
}

function applyDefaults() {
  form.universal_attributes = { ...DEFAULT_UNIVERSAL_ATTRIBUTES }
  form.offense_attributes = { ...DEFAULT_OFFENSE_ATTRIBUTES }
  form.defense_attributes = { ...DEFAULT_DEFENSE_ATTRIBUTES }
  copyFromPlayerId.value = ''
}

function applyCopyFrom(playerId: string) {
  if (!playerId) return
  const src = props.allPlayers?.find((p) => p.id === playerId)
  if (!src) return
  form.universal_attributes = { ...DEFAULT_UNIVERSAL_ATTRIBUTES, ...src.universal_attributes }
  const offRelevant = new Set(visibleOffenseGroups.value.flatMap((g) => g.attrs.map((a) => a.key)))
  const defRelevant = new Set(visibleDefenseGroups.value.flatMap((g) => g.attrs.map((a) => a.key)))
  Object.keys(form.offense_attributes).forEach((k) => {
    form.offense_attributes[k] = offRelevant.has(k) ? (src.offense_attributes as any)?.[k] ?? 5 : 5
  })
  Object.keys(form.defense_attributes).forEach((k) => {
    form.defense_attributes[k] = defRelevant.has(k) ? (src.defense_attributes as any)?.[k] ?? 5 : 5
  })
  copyFromPlayerId.value = playerId
}

function resetAttrsForPosition(side: 'offense' | 'defense', position: string) {
  resetAttributesForPosition(side, position, form.offense_attributes, form.defense_attributes)
}

function togglePosition(side: 'offense' | 'defense', pos: string) {
  const arr = side === 'offense' ? form.offense_positions : form.defense_positions
  const idx = arr.indexOf(pos)
  if (idx === -1) {
    arr.push(pos)
    resetAttrsForPosition(side, pos)
  } else {
    arr.splice(idx, 1)
    resetAttrsForPosition(side, pos)
  }
}

function toggleTeam(teamId: string) {
  const idx = form.team_ids.indexOf(teamId)
  if (idx === -1) form.team_ids.push(teamId)
  else form.team_ids.splice(idx, 1)
}

function handleSubmit() {
  const sanitized = sanitizeAttributesForPositions(
    form.offense_positions,
    form.defense_positions,
    form.universal_attributes,
    form.offense_attributes,
    form.defense_attributes,
  )
  emit('submit', {
    ...form,
    ...sanitized,
  })
  emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.player) {
    const sanitized = sanitizeAttributesForPositions(
      props.player.offense_positions,
      props.player.defense_positions,
      props.player.universal_attributes ?? {},
      props.player.offense_attributes ?? {},
      props.player.defense_attributes ?? {},
    )
    form.name = props.player.name
    form.number = props.player.number
    form.height = props.player.height ?? null
    form.weight = props.player.weight ?? null
    form.offense_positions = [...props.player.offense_positions]
    form.defense_positions = [...props.player.defense_positions]
    form.universal_attributes = { ...sanitized.universal_attributes }
    form.offense_attributes = { ...sanitized.offense_attributes }
    form.defense_attributes = { ...sanitized.defense_attributes }
    form.team_ids = [...props.playerTeamIds].filter((id) => {
      const team = props.teams.find((t) => t.id === id)
      return team && team.name !== 'Free Agent'
    })
    copyFromPlayerId.value = ''
    attributeMode.value = 'custom'
  } else if (isOpen) {
    form.name = ''
    form.number = 0
    form.height = null
    form.weight = null
    form.offense_positions = []
    form.defense_positions = []
    form.universal_attributes = { ...DEFAULT_UNIVERSAL_ATTRIBUTES }
    form.offense_attributes = { ...DEFAULT_OFFENSE_ATTRIBUTES }
    form.defense_attributes = { ...DEFAULT_DEFENSE_ATTRIBUTES }
    form.team_ids = []
    copyFromPlayerId.value = ''
    attributeMode.value = 'defaults'
  }
})
</script>
