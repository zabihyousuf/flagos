<template>
  <nav v-if="segments.length > 0" class="flex items-center gap-1.5 mb-4 text-sm" aria-label="Breadcrumb">
    <template v-for="(seg, i) in segments" :key="i">
      <template v-if="i > 0">
        <ChevronRight class="w-3 h-3 text-muted-foreground/50 shrink-0" aria-hidden="true" />
      </template>
      <NuxtLink
        v-if="seg.to"
        :to="seg.to"
        class="text-muted-foreground hover:text-foreground transition-colors"
      >
        {{ seg.label }}
      </NuxtLink>
      <span v-else class="font-medium text-foreground">{{ seg.label }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

const route = useRoute()
const { breadcrumbTitle } = useBreadcrumbs()

interface BreadcrumbSegment {
  label: string
  to?: string
}

const segments = computed<BreadcrumbSegment[]>(() => {
  const path = route.path

  if (path === '/') return []

  // Top-level pages: Dashboard > Page
  const topLevel: Record<string, string> = {
    '/playbooks': 'Playbooks',
    '/plays': 'All Plays',
    '/squad': 'Squad',
    '/settings': 'Settings',
    '/whats-new': "What's New",
    '/simulation/game': 'Match Sim',
    '/simulation/scenario': 'Play Lab',
    '/simulation/test': 'Test Play',
  }

  if (topLevel[path]) {
    return [
      { label: 'Dashboard', to: '/' },
      { label: topLevel[path] },
    ]
  }

  // /playbooks/[id]: Dashboard > Playbooks > [Playbook Name]
  if (path.match(/^\/playbooks\/[^/]+$/)) {
    return [
      { label: 'Dashboard', to: '/' },
      { label: 'Playbooks', to: '/playbooks' },
      { label: breadcrumbTitle.value || 'Playbook' },
    ]
  }

  // Fallback: try to derive from path
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return []

  const result: BreadcrumbSegment[] = [{ label: 'Dashboard', to: '/' }]
  let runningPath = ''
  for (let i = 0; i < parts.length; i++) {
    runningPath += '/' + parts[i]
    const isLast = i === parts.length - 1
    const label = isLast && breadcrumbTitle.value
      ? breadcrumbTitle.value
      : formatSegmentLabel(parts[i])
    result.push(isLast ? { label } : { label, to: runningPath })
  }
  return result
})

function formatSegmentLabel(part: string): string {
  if (part === 'new') return 'New'
  if (/^[0-9a-f-]{36}$/i.test(part)) return 'Details'
  return part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
}
</script>
