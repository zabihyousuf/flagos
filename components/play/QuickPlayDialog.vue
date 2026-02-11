<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md glass">
      <DialogHeader>
        <DialogTitle>Quick Create Play</DialogTitle>
        <DialogDescription>Jump straight into the play designer.</DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Playbook Selector -->
        <div class="space-y-2">
          <Label>Playbook</Label>
          <Select v-model="form.playbookId">
            <SelectTrigger>
              <SelectValue placeholder="Select a playbook" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="pb in playbooks" :key="pb.id" :value="pb.id">
                {{ pb.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Play Name -->
        <div class="space-y-2">
          <Label>Play Name</Label>
          <Input v-model="form.name" placeholder="e.g. Slant Right" @keydown.enter="handleSubmit" />
        </div>

        <!-- Play Type -->
        <div class="space-y-2">
          <Label>Type</Label>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="form.playType = 'offense'"
              :class="form.playType === 'offense' ? 'bg-primary/10 border-primary text-primary' : ''"
            >
              <Swords class="w-3.5 h-3.5 mr-1.5" />
              Offense
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="form.playType = 'defense'"
              :class="form.playType === 'defense' ? 'bg-destructive/10 border-destructive text-destructive' : ''"
            >
              <Shield class="w-3.5 h-3.5 mr-1.5" />
              Defense
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">Cancel</Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || creating">
          <Loader2 v-if="creating" class="w-4 h-4 mr-2 animate-spin" />
          {{ creating ? 'Creating...' : 'Create & Open' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Swords, Shield, Loader2 } from 'lucide-vue-next'
import type { Player } from '~/lib/types'

const router = useRouter()
const { isOpen, close } = useQuickPlay()
const { playbooks, fetchPlaybooks } = usePlaybooks()
const { createPlay } = usePlays()
const { profile, fetchProfile } = useProfile()
const { teams, fetchTeams } = useTeams()

const creating = ref(false)

const form = reactive({
  playbookId: '',
  name: '',
  playType: 'offense' as 'offense' | 'defense',
})

const canSubmit = computed(() => {
  return form.playbookId && form.name.trim() && form.playType
})

// Get primary team's starters based on play type
const teamStarters = computed<Player[]>(() => {
  if (!profile.value?.default_team_id) return []
  const team = teams.value.find((t) => t.id === profile.value!.default_team_id)
  if (!team?.team_players) return []

  return team.team_players
    .filter((tp) => {
      if (!tp.player) return false
      return form.playType === 'offense' ? tp.offense_starter : tp.defense_starter
    })
    .map((tp) => tp.player!)
})

// Fetch data when dialog opens
watch(isOpen, async (open) => {
  if (open) {
    await Promise.all([fetchPlaybooks(), fetchProfile(), fetchTeams()])
    // Pre-select the first playbook if none selected
    if (!form.playbookId && playbooks.value.length > 0) {
      form.playbookId = playbooks.value[0].id
    }
  } else {
    // Reset form
    form.name = ''
    form.playType = 'offense'
  }
})

function handleOpenChange(open: boolean) {
  if (!open) close()
}

async function handleSubmit() {
  if (!canSubmit.value || creating.value) return

  creating.value = true
  try {
    // Use team starters if primary team is set, otherwise empty (no auto-placement)
    const starters = teamStarters.value
    const newPlay = await createPlay(
      form.playbookId,
      form.name.trim(),
      form.playType,
      '',
      starters,
    )
    if (newPlay) {
      close()
      await router.push(`/plays/${newPlay.id}`)
    }
  } finally {
    creating.value = false
  }
}
</script>

