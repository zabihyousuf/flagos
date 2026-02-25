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
    <TutorialModal />
  </div>
</template>

<script setup lang="ts">
useTheme() // Apply theme and listen for system preference changes
useHead({ title: 'FlagLab' })
const { open } = useQuickPlay()
const { shouldShowTutorial, showTutorial } = useTutorial()
const { profile, fetchProfile } = useProfile()
const { open: openSearch } = useAppSearch()

// Register ⌘N / Ctrl+N and ⌘K / Ctrl+K keyboard shortcuts
// Show tutorial for first-time users once profile is loaded
watch(
  () => [shouldShowTutorial.value, profile.value],
  ([should, p]) => {
    if (should && p) showTutorial()
  },
  { immediate: true }
)

onMounted(() => {
  fetchProfile()
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
