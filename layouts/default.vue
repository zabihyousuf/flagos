<template>
  <div class="flex h-screen overflow-hidden">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden bg-background">
      <main class="flex-1 overflow-y-auto p-6">
        <AppBreadcrumb />
        <slot />
      </main>
    </div>
    <QuickPlayDialog />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
const { open } = useQuickPlay()

// Register ⌘N / Ctrl+N keyboard shortcut
onMounted(() => {
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      open()
    }
  }
  window.addEventListener('keydown', handleKeydown)

  // Listen for custom event from sidebar
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
