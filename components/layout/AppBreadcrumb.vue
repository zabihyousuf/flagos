<template>
  <div v-if="crumb" class="flex items-center gap-1.5 mb-4">
    <NuxtLink
      :to="crumb.parentTo"
      class="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>{{ crumb.parentLabel }}</span>
    </NuxtLink>
    <ChevronRight class="w-3 h-3 text-muted-foreground/50" />
    <span class="text-sm font-medium">{{ crumb.currentLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ChevronRight } from 'lucide-vue-next'

const route = useRoute()
const { breadcrumbTitle } = useBreadcrumbs()

interface Crumb {
  parentTo: string
  parentLabel: string
  currentLabel: string
}

const routeMap: Record<string, { parentTo: string; parentLabel: string; currentLabel: string }> = {
  '/playbooks': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Playbooks' },
  '/plays': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'All Plays' },
  '/lockerroom': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Locker Room' },
  '/teams': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Teams' },
  '/settings': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Settings' },
  '/simulation/game': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Game Sim' },
  '/simulation/test': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Test Play' },
  '/simulation/scenario': { parentTo: '/', parentLabel: 'Dashboard', currentLabel: 'Scenarios' },
}

const crumb = computed<Crumb | null>(() => {
  const path = route.path

  // Dashboard — no breadcrumb
  if (path === '/') return null

  // Exact match in route map
  if (routeMap[path]) return routeMap[path]

  // Dynamic: /playbooks/[id]
  if (path.startsWith('/playbooks/')) {
    return {
      parentTo: '/playbooks',
      parentLabel: 'Playbooks',
      currentLabel: breadcrumbTitle.value || 'Playbook',
    }
  }

  // Fallback for any unknown route under default layout
  return {
    parentTo: '/',
    parentLabel: 'Dashboard',
    currentLabel: path.split('/').pop() || 'Page',
  }
})
</script>
