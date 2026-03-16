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
      <span
        v-else-if="seg.gradient"
        class="breadcrumb-ai-gradient"
      >
        {{ seg.label }}
      </span>
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
  /** When true, segment is not a link and uses Blur.AI gradient styling */
  gradient?: boolean
}

const segments = computed<BreadcrumbSegment[]>(() => {
  const path = route.path

  if (path === '/' || path === '/dashboard') return []

  // Top-level pages: Dashboard > Page
  const topLevel: Record<string, string> = {
    '/playbooks': 'Playbooks',
    '/plays': 'All Plays',
    '/squad': 'Squad',
    '/settings': 'Settings',
    '/simulation/game': 'Match Sim',
    '/simulation/scenario': 'Play Lab',
    '/simulation/engine-picks': 'Engine Picks',
  }

  // Play Lab: Dashboard > Blur.AI (disabled, gradient) > Play Lab [> Result]
  if (path === '/blurai/playlab') {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'BLUR.AI', gradient: true },
      { label: 'Play Lab' },
    ]
  }
  if (path.match(/^\/blurai\/playlab\/[^/]+$/)) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'BLUR.AI', gradient: true },
      { label: 'Play Lab', to: '/blurai/playlab' },
      { label: breadcrumbTitle.value || 'Result' },
    ]
  }

  if (topLevel[path]) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: topLevel[path] },
    ]
  }

  // /playbooks/[id]: Dashboard > Playbooks > [Playbook Name]
  if (path.match(/^\/playbooks\/[^/]+$/)) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Playbooks', to: '/playbooks' },
      { label: breadcrumbTitle.value || 'Playbook' },
    ]
  }

  // Fallback: try to derive from path
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return []

  const result: BreadcrumbSegment[] = [{ label: 'Dashboard', to: '/dashboard' }]
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

<style scoped>
@keyframes breadcrumb-ai-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.breadcrumb-ai-gradient {
  background: linear-gradient(
    to right,
    #3b82f6,
    #6366f1,
    #8b5cf6,
    #d946ef,
    #ec4899,
    #6366f1,
    #3b82f6
  );
  background-size: 400% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: breadcrumb-ai-gradient 8s ease-in-out infinite;
  font-weight: 800;
  letter-spacing: -0.02em;
}
</style>
