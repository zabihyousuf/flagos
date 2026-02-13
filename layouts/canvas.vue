<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar is still visible but content area has no padding -->
    <AppSidebar />
    <div class="flex flex-col flex-1 w-full h-full overflow-hidden relative">
      <main class="w-full h-full relative p-0 overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    router.push('/plays/new')
  }
}
function handleOpenQuickPlay() {
  router.push('/plays/new')
}

// New Play: same behavior as default layout so sidebar "New Play" and ⌘N work in canvas
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('open-quick-play', handleOpenQuickPlay)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('open-quick-play', handleOpenQuickPlay)
})
</script>
