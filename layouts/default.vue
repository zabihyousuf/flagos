<template>
  <!-- Layout: full app shell. Mobile (< lg): top bar + drawer. Desktop (≥ lg): sidebar inline. -->
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Trial ending soon banner -->
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

    <!-- Mobile top bar (hidden ≥ 1024px via scoped CSS) -->
    <div class="mobile-topbar">
      <button class="mobile-topbar-btn" aria-label="Open navigation" @click="toggleNav">
        <Menu class="w-5 h-5" />
      </button>
      <div class="mobile-topbar-actions">
        <button class="mobile-topbar-btn" aria-label="Search" @click="openSearch">
          <Search class="w-5 h-5" />
        </button>
        <NuxtLink to="/settings" class="mobile-topbar-btn" aria-label="Settings">
          <Settings class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/notifications" class="mobile-topbar-btn relative" aria-label="Notifications">
          <Bell class="w-5 h-5" />
          <span v-if="unreadCount > 0" class="mobile-notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-1 min-h-0 overflow-hidden relative">
      <!-- Mobile backdrop (blocks interaction with content when drawer is open) -->
      <Transition name="backdrop-fade">
        <div
          v-if="mobileNavOpen && isMobileOrTablet"
          class="mobile-backdrop lg:hidden"
          aria-hidden="true"
          @click="closeNav"
        />
      </Transition>

      <AppSidebar />
      <SimHistorySidebar v-if="isManager && isDesktop" @select-job="onSelectHistoryJob" />
      <div
        class="flex flex-col flex-1 min-w-0 overflow-hidden bg-background"
        @click="maybeCloseHistoryPanel"
      >
        <main
          class="flex-1 flex flex-col min-h-0 overflow-hidden p-4 lg:p-6"
          :class="route.path.startsWith('/blurai/playlab') ? 'pb-2 lg:pb-0 lg:-mb-5' : 'pb-2 lg:pb-3'"
        >
          <!-- Breadcrumb: desktop only; mobile top bar provides context -->
          <div class="hidden lg:block">
            <AppBreadcrumb />
          </div>
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
    <WelcomePlanModal
      :open="welcomePlanOpen"
      @update:open="(v: boolean) => { if (!v) welcomePlanOnDismiss() }"
      @subscribe="welcomePlanOnSubscribe"
      @start-trial="welcomePlanOnStartTrial"
      @dismiss="welcomePlanOnDismiss"
    />
  </div>
</template>

<script setup lang="ts">
import { Menu, Bell, Search, Settings } from 'lucide-vue-next'

useTheme() // Apply theme and listen for system preference changes
const { isManager } = useAccountType()
useHead({ title: 'FlagLab' })
const route = useRoute()

const { isMobile, isDesktop } = useBreakpoint()
const isMobileOrTablet = computed(() => !isDesktop.value)
const { isOpen: mobileNavOpen, toggle: toggleNav, close: closeNav } = useAppNav()
const { unreadCount } = useNotifications()
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
const { profile, fetchProfile, updateProfile } = useProfile()
const { open: openSearch } = useAppSearch()
const { open: welcomePlanOpen, shouldShowPrompt: shouldShowWelcomePlan, showPrompt: welcomePlanShow, closePrompt: welcomePlanClose } = useWelcomePlanPrompt()
const { startDevTrial } = usePlanAccess()

async function markWelcomePlanSeen() {
  if (!profile.value) return
  await updateProfile({ welcome_plan_prompt_seen_at: new Date().toISOString() })
  welcomePlanClose()
}

function welcomePlanOnSubscribe() {
  markWelcomePlanSeen().then(() => { navigateTo('/settings?tab=billing') })
}

async function welcomePlanOnStartTrial() {
  if (import.meta.dev) startDevTrial()
  await markWelcomePlanSeen()
}

function welcomePlanOnDismiss() {
  markWelcomePlanSeen()
}

// Show welcome plan prompt for first-time users once profile is loaded
watch(
  () => [shouldShowWelcomePlan.value, profile.value],
  ([should, p]) => {
    if (should && p) welcomePlanShow()
  },
  { immediate: true }
)

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

<style scoped>
/* ── Mobile top bar ────────────────────────────────────────────── */
.mobile-topbar {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
  flex-shrink: 0;
  z-index: 10;
}

@media (min-width: 1024px) {
  .mobile-topbar {
    display: none;
  }
}

.mobile-topbar-logo {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
  text-decoration: none;
  white-space: nowrap;
}

.mobile-topbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.mobile-topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  text-decoration: none;
}

.mobile-topbar-btn:hover {
  background: var(--color-accent);
}

.mobile-notif-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: var(--color-destructive);
  color: white;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
}

/* ── Mobile nav backdrop ───────────────────────────────────────── */
.mobile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  background: oklch(0 0 0 / 0.4);
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.25s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
</style>
