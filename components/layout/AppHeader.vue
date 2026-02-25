<template>
  <header class="h-14 border-border bg-background/80 backdrop-blur-sm flex items-center px-6 shrink-0">
    <h1 class="text-base font-medium text-foreground font-display">
      {{ pageTitle }}
    </h1>
  </header>
</template>

<script setup lang="ts">
const route = useRoute()

const pageTitle = computed(() => {
  const path = route.path
  if (path === '/') return 'Dashboard'
  if (path.startsWith('/playbooks')) return 'Playbooks'
  if (path.startsWith('/plays')) return 'Play Designer'
  if (path.startsWith('/players')) return 'Locker Room'
  if (path === '/settings') return 'Settings'
  return 'FlagLab'
})
</script>
