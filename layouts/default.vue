<template>
  <!-- Layout responsive down to 1024px (iPad Pro); lg = 1024px, xl = 1280px -->
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
      <main class="flex-1 flex flex-col min-h-0 overflow-hidden p-4 lg:p-6">
        <AppBreadcrumb />
        <div class="flex-1 min-h-0 overflow-y-auto">
          <slot />
        </div>
      </main>
      <AppFooter />
    </div>
    <QuickPlayDialog />
    <ConfirmDialog />
    <AppSearchCommand />
  </div>
</template>

<script setup lang="ts">
useTheme() // Apply theme and listen for system preference changes
useHead({ title: 'FlagOS' })
const { open } = useQuickPlay()
const { open: openSearch } = useAppSearch()

// Register ⌘N / Ctrl+N and ⌘K / Ctrl+K keyboard shortcuts
onMounted(() => {
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      open()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      openSearch()
    }
  }
  window.addEventListener('keydown', handleKeydown)

  function handleCustomOpen() {
    open()
  }
  window.addEventListener('open-quick-play', handleCustomOpen)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('open-quick-play', handleCustomOpen)
  })
})
</script>
