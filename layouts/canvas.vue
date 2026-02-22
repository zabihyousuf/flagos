<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar is still visible but content area has no padding -->
    <AppSidebar />
    <div class="flex flex-col flex-1 min-w-0 w-full h-full overflow-hidden relative">
      <main class="flex-1 min-h-0 relative p-0 overflow-hidden">
        <slot />
      </main>
      <AppFooter />
    </div>
    <ConfirmDialog />
    <AppSearchCommand />
  </div>
</template>

<script setup lang="ts">
useTheme()
const router = useRouter()
const { open: openSearch } = useAppSearch()

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    router.push('/plays/new')
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}
function handleOpenQuickPlay() {
  router.push('/plays/new')
}

// New Play + Search: same behavior as default layout so sidebar "New Play", ⌘N, and ⌘K work in canvas
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('open-quick-play', handleOpenQuickPlay)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('open-quick-play', handleOpenQuickPlay)
})
</script>
