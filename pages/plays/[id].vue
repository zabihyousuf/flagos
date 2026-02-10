<template>
  <div class="h-full w-full relative">
    <!-- Breadcrumb header (Floating) -->
    <div class="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-2 rounded-md bg-background/50 backdrop-blur-sm shadow-sm border border-white/10">
      <button
        class="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
        @click="goBack"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span v-if="playbookName">{{ playbookName }}</span>
        <span v-else>Playbooks</span>
      </button>
      <ChevronRight class="w-3 h-3 text-muted-foreground/50" />
      <span class="text-sm font-medium">{{ currentPlay?.name ?? '...' }}</span>
      <span
        v-if="currentPlay?.play_type"
        class="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground ml-1"
      >
        {{ currentPlay.play_type === 'offense' ? 'OFF' : 'DEF' }}
      </span>
    </div>

    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-muted-foreground bg-background">
      Loading play...
    </div>

    <PlayCanvas
      v-else-if="currentPlay"
      :initial-data="currentPlay.canvas_data"
      :play-type="currentPlay.play_type"
      :field-settings="fieldSettingsData"
      :starters="starters"
      :all-roster="players"
      @save="handleSave"
      class="w-full h-full block"
    />
  </div>
</template>

<script setup lang="ts">
import type { CanvasData } from '~/lib/types'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'
import { ArrowLeft, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'canvas',
})

const route = useRoute()
const router = useRouter()
const playId = computed(() => route.params.id as string)

const { currentPlay, loading, fetchPlay, saveCanvasData } = usePlays()
const { settings: fieldSettings, fetchSettings } = useFieldSettings()
const { players, fetchPlayers } = usePlayers()

// Fetch playbook name for breadcrumb
const playbookName = ref<string | null>(null)

const starters = computed(() => {
  if (!currentPlay.value) return []
  return players.value.filter((p) =>
    currentPlay.value!.play_type === 'offense' ? p.offense_starter : p.defense_starter,
  )
})

const fieldSettingsData = computed(() => {
  if (!fieldSettings.value) return DEFAULT_FIELD_SETTINGS
  return {
    field_length: fieldSettings.value.field_length,
    field_width: fieldSettings.value.field_width,
    endzone_size: fieldSettings.value.endzone_size,
    line_of_scrimmage: fieldSettings.value.line_of_scrimmage,
  }
})

function goBack() {
  if (currentPlay.value?.playbook_id) {
    router.push(`/playbooks/${currentPlay.value.playbook_id}`)
  } else {
    router.push('/playbooks')
  }
}

async function handleSave(data: CanvasData) {
  if (!currentPlay.value) return
  await saveCanvasData(currentPlay.value.id, data)
}

async function fetchPlaybookName(playbookId: string) {
  const client = useSupabaseDB()
  const { data } = await client
    .from('playbooks')
    .select('name')
    .eq('id', playbookId)
    .single()
  if (data) {
    playbookName.value = (data as any).name
  }
}

onMounted(async () => {
  await fetchPlay(playId.value)
  fetchSettings()
  fetchPlayers()
  if (currentPlay.value?.playbook_id) {
    fetchPlaybookName(currentPlay.value.playbook_id)
  }
})
</script>
