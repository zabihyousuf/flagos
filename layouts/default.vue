<template>
  <!-- Layout responsive down to 1024px (iPad Pro); lg = 1024px, xl = 1280px -->
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Trial ending soon banner - app-wide, above sidebar and all content -->
    <div
      v-if="showTrialEndingBanner"
      class="shrink-0 flex items-center justify-between gap-3 px-3 py-1.5 lg:px-4 bg-amber-500 text-amber-950 dark:bg-amber-500 dark:text-amber-950 border-b border-amber-600/50"
    >
      <p class="text-sm font-semibold">
        Your free trial ends in {{ trialMinutesLeft }} minute{{ trialMinutesLeft === 1 ? '' : 's' }}. Upgrade to Pro to keep access.
      </p>
      <button
        type="button"
        class="shrink-0 p-1 rounded-md hover:bg-amber-600/30 dark:hover:bg-amber-600/30 transition-colors"
        aria-label="Dismiss"
        @click.stop="dismissTrialBanner"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <AppSidebar />
      <SimHistorySidebar @select-job="onSelectHistoryJob" />
      <div
        class="flex flex-col flex-1 min-w-0 overflow-hidden bg-background"
        @click="maybeCloseHistoryPanel"
      >
      <main
        class="flex-1 flex flex-col min-h-0 overflow-hidden p-4 lg:p-6"
        :class="route.path.startsWith('/blurai/playlab') ? 'pb-0 -mb-5 lg:-mb-6' : 'pb-2 lg:pb-3'"
      >
        <AppBreadcrumb />
        <div class="flex-1 min-h-0 overflow-y-auto">
          <slot />
        </div>
      </main>
      <footer class="shrink-0 w-full flex justify-center py-0 -mt-1 mb-2">
        <AppFooter />
      </footer>
      </div>
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
const route = useRoute()
const { close: closeHistoryPanel, isOpen: historyPanelOpen } = useSimHistoryPanel()
const { isTrialing, trialMinutesLeft, trialBannerDismissed } = usePlanAccess()
const showTrialEndingBanner = computed(
  () => isTrialing.value && trialMinutesLeft.value > 0 && trialMinutesLeft.value < 5 && !trialBannerDismissed.value
)
function dismissTrialBanner() {
  trialBannerDismissed.value = true
}
// When trial ends, close the banner so it doesn’t linger or reappear
watch(isTrialing, (v) => {
  if (!v) trialBannerDismissed.value = true
})

function onSelectHistoryJob(job: { job_id: string }) {
  closeHistoryPanel()
  navigateTo(`/blurai/playlab/${job.job_id}`)
}

function maybeCloseHistoryPanel() {
  if (historyPanelOpen.value) closeHistoryPanel()
}

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
