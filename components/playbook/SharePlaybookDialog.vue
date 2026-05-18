<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md glass">
      <DialogHeader>
        <DialogTitle>Share Playbook</DialogTitle>
        <DialogDescription>
          Share "{{ playbookName }}" with your teams.
        </DialogDescription>
      </DialogHeader>

      <div class="py-2 space-y-2">
        <div v-if="fetchingShares" class="flex items-center justify-center py-6">
          <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
          <span class="ml-2 text-sm text-muted-foreground">Loading teams…</span>
        </div>

        <div v-else-if="visibleTeams.length === 0" class="text-center py-6">
          <Users class="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">No teams found. Create a team first.</p>
        </div>

        <template v-else>
          <div
            v-for="team in visibleTeams"
            :key="team.id"
            class="team-row"
          >
            <Checkbox
              :id="`share-team-${team.id}`"
              :model-value="sharedTeamIds.has(team.id)"
              :disabled="togglingId === team.id"
              @update:model-value="handleToggle(team.id, $event as boolean)"
            />
            <label :for="`share-team-${team.id}`" class="team-row__label">
              <span class="team-row__name">{{ team.name }}</span>
              <Loader2
                v-if="togglingId === team.id"
                class="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1 shrink-0"
              />
            </label>
          </div>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Checkbox } from '~/components/ui/checkbox'
import { Loader2, Users } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  playbookId: string | null
  playbookName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const client = useSupabaseDB()
const { teams, fetchTeams } = useTeams()
const { sharePlaybook, unsharePlaybook } = useTeamPlaybooks()

const fetchingShares = ref(false)
const sharedTeamIds = ref(new Set<string>())
const togglingId = ref<string | null>(null)

const visibleTeams = computed(() =>
  teams.value.filter((t) => t.name !== 'Free Agent')
)

async function loadCurrentShares() {
  if (!props.playbookId) return
  fetchingShares.value = true
  try {
    const { data } = await client
      .from('team_playbooks')
      .select('team_id')
      .eq('playbook_id', props.playbookId)
    sharedTeamIds.value = new Set((data ?? []).map((r: { team_id: string }) => r.team_id))
  } finally {
    fetchingShares.value = false
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.playbookId) {
    await fetchTeams()
    await loadCurrentShares()
  }
})

async function handleToggle(teamId: string, checked: boolean) {
  if (!props.playbookId) return
  togglingId.value = teamId
  try {
    if (checked) {
      await sharePlaybook(teamId, props.playbookId)
      sharedTeamIds.value = new Set([...sharedTeamIds.value, teamId])
    } else {
      await unsharePlaybook(teamId, props.playbookId)
      const next = new Set(sharedTeamIds.value)
      next.delete(teamId)
      sharedTeamIds.value = next
    }
  } finally {
    togglingId.value = null
  }
}
</script>

<style scoped>
.team-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border);
}

.team-row:last-child {
  border-bottom: none;
}

.team-row__label {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: pointer;
  font-size: 14px;
}

.team-row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
