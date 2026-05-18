<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-md space-y-6">
      <div class="text-center space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight font-display">Choose Your Team</h1>
        <p class="text-sm text-muted-foreground">You're on multiple teams. Pick one to get started.</p>
      </div>

      <div class="space-y-3">
        <button
          v-for="team in allTeams"
          :key="team.id"
          type="button"
          class="w-full flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none"
          :class="selectedTeamId === team.id
            ? 'ring-2 ring-primary border-primary shadow-sm'
            : 'border-border hover:border-muted-foreground/30'"
          @click="selectedTeamId = team.id"
        >
          <div
            class="h-10 w-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            :class="team.role === 'player' ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary'"
          >
            {{ team.name.charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">{{ team.name }}</p>
          </div>

          <span
            class="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
            :class="team.role === 'player' ? 'bg-green-500/15 text-green-600' : 'bg-primary/15 text-primary'"
          >
            {{ team.role === 'coach' ? 'Coach' : 'Player' }}
          </span>

          <Check v-if="selectedTeamId === team.id" class="w-4 h-4 text-primary shrink-0" />
        </button>
      </div>

      <!-- Set as primary preference -->
      <div class="flex items-start gap-3 px-1">
        <Checkbox
          id="set-primary"
          :model-value="setAsPrimary"
          @update:model-value="setAsPrimary = !!$event"
        />
        <div class="space-y-0.5">
          <Label for="set-primary" class="cursor-pointer text-sm font-medium">Remember this choice</Label>
          <p class="text-xs text-muted-foreground">Skip this screen on future logins by saving your preferred team.</p>
        </div>
      </div>

      <Button
        class="w-full"
        :disabled="!selectedTeamId || saving"
        @click="handleContinue"
      >
        <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
        Continue
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'

definePageMeta({ layout: false })

const { allTeams, activeTeam, setActiveTeam } = useActiveContext()
const { fetchTeams } = useTeams()
const { fetchMemberships } = useTeamMemberships()
const { updateProfile } = useProfile()

const selectedTeamId = ref<string | null>(null)
const setAsPrimary = ref(true)
const saving = ref(false)

onMounted(async () => {
  await Promise.all([fetchTeams(), fetchMemberships()])

  if (activeTeam.value) {
    selectedTeamId.value = activeTeam.value.id
  } else if (allTeams.value.length === 1) {
    selectedTeamId.value = allTeams.value[0].id
    setActiveTeam(allTeams.value[0].id)
    await navigateTo('/dashboard')
  }
})

async function handleContinue() {
  if (!selectedTeamId.value) return
  saving.value = true
  try {
    setActiveTeam(selectedTeamId.value)
    if (setAsPrimary.value) {
      await updateProfile({ default_team_id: selectedTeamId.value } as any)
    }
    await navigateTo('/dashboard')
  } finally {
    saving.value = false
  }
}
</script>
