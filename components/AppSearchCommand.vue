<template>
  <Dialog :open="searchOpen" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-xl p-0 gap-0 overflow-hidden" :show-close-button="true">
      <div class="flex flex-col max-h-[70vh]">
        <div class="flex items-center border-b border-border px-3">
          <Search class="w-4 h-4 shrink-0 text-muted-foreground" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search pages, plays, playbooks…"
            class="flex-1 min-w-0 py-3 px-3 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.enter.prevent="selectCurrent"
          />
          <kbd class="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground mr-2">⌘K</kbd>
        </div>
        <div class="overflow-y-auto flex-1 min-h-0">
          <template v-if="filteredResults.length === 0">
            <div class="py-8 text-center text-sm text-muted-foreground">
              {{ query.trim() ? 'No results.' : 'Type to search…' }}
            </div>
          </template>
          <template v-else>
            <div
              v-for="(group, key) in groupedResults"
              :key="key"
              class="py-1"
            >
              <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {{ key }}
              </div>
              <button
                v-for="(item, idx) in group"
                :key="item.id"
                type="button"
                class="search-result-item w-full flex items-center gap-3 px-3 py-2 text-left text-sm"
                :class="{ 'bg-accent': selectedId === item.id }"
                @click="goTo(item)"
                @mouseenter="selectedId = item.id"
              >
                <component :is="item.icon" class="w-4 h-4 shrink-0 text-muted-foreground" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.meta" class="text-xs text-muted-foreground truncate max-w-[120px]">{{ item.meta }}</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent } from '~/components/ui/dialog'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Swords,
  Settings as SettingsIcon,
  Sparkles,
  FileText,
  FolderOpen,
  Search,
} from 'lucide-vue-next'
import { computed, watch, nextTick, ref } from 'vue'

const router = useRouter()
const { searchOpen, close } = useAppSearch()
const user = useSupabaseUser()
const client = useSupabaseDB()

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const selectedId = ref<string | null>(null)

interface SearchItem {
  id: string
  type: 'page' | 'play' | 'playbook'
  label: string
  to: string
  meta?: string
  icon: any
}

const staticPages: SearchItem[] = [
  { id: 'page-dashboard', type: 'page', label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { id: 'page-playbooks', type: 'page', label: 'Playbooks', to: '/playbooks', icon: BookOpen },
  { id: 'page-plays', type: 'page', label: 'Plays', to: '/plays', icon: Swords },
  { id: 'page-squad', type: 'page', label: 'Squad', to: '/squad', icon: Users },
  { id: 'page-settings', type: 'page', label: 'Settings', to: '/settings', icon: SettingsIcon },
  { id: 'page-whats-new', type: 'page', label: "What's New", to: '/whats-new', icon: Sparkles },
]

const dynamicItems = ref<SearchItem[]>([])

const allResults = computed(() => [...staticPages, ...dynamicItems.value])

const filteredResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allResults.value
  return allResults.value.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.meta && item.meta.toLowerCase().includes(q))
  )
})

const groupedResults = computed(() => {
  const groups: Record<string, SearchItem[]> = { Pages: [], Plays: [], Playbooks: [] }
  for (const item of filteredResults.value) {
    if (item.type === 'page') groups.Pages.push(item)
    else if (item.type === 'play') groups.Plays.push(item)
    else if (item.type === 'playbook') groups.Playbooks.push(item)
  }
  return Object.fromEntries(Object.entries(groups).filter(([, arr]) => arr.length > 0))
})

const flatResults = computed(() => filteredResults.value)

function moveSelection(delta: number) {
  if (flatResults.value.length === 0) return
  const idx = flatResults.value.findIndex((r) => r.id === selectedId.value)
  const next = Math.max(0, Math.min(flatResults.value.length - 1, idx + delta))
  selectedId.value = flatResults.value[next].id
}

function selectCurrent() {
  const item = flatResults.value.find((r) => r.id === selectedId.value)
  if (item) goTo(item)
}

function goTo(item: SearchItem) {
  router.push(item.to)
  close()
  query.value = ''
  selectedId.value = null
}

function onOpenChange(open: boolean) {
  if (!open) {
    close()
    query.value = ''
    selectedId.value = null
  }
}

async function fetchDynamic() {
  if (!user.value?.id) return
  dynamicItems.value = []
  try {
    const [playsRes, playbooksRes] = await Promise.all([
      client.from('plays').select('id, name, play_type').eq('user_id', user.value.id).order('updated_at', { ascending: false }).limit(30),
      client.from('playbooks').select('id, name').eq('user_id', user.value.id).order('updated_at', { ascending: false }).limit(20),
    ])
    const plays = (playsRes.data ?? []) as { id: string; name: string; play_type: string }[]
    const playbooks = (playbooksRes.data ?? []) as { id: string; name: string }[]
    dynamicItems.value = [
      ...plays.map((p) => ({
        id: `play-${p.id}`,
        type: 'play' as const,
        label: p.name,
        to: `/plays/${p.id}`,
        meta: p.play_type === 'offense' ? 'Offense' : 'Defense',
        icon: FileText,
      })),
      ...playbooks.map((pb) => ({
        id: `playbook-${pb.id}`,
        type: 'playbook' as const,
        label: pb.name,
        to: `/playbooks/${pb.id}`,
        meta: 'Playbook',
        icon: FolderOpen,
      })),
    ]
  } catch {
    dynamicItems.value = []
  }
}

watch(searchOpen, (open) => {
  if (open) {
    query.value = ''
    selectedId.value = staticPages[0]?.id ?? null
    fetchDynamic()
    nextTick(() => inputRef.value?.focus())
  }
})

watch(filteredResults, (results) => {
  if (results.length > 0 && !results.some((r) => r.id === selectedId.value)) {
    selectedId.value = results[0].id
  }
}, { immediate: true })
</script>

<style scoped>
.search-result-item:hover {
  background: var(--color-accent);
}
</style>
