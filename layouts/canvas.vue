<template>
  <div class="flex flex-col h-screen overflow-hidden bg-background">
    <!-- Mobile top bar (hidden ≥ 1024px via scoped CSS) -->
    <div class="canvas-mobile-topbar">
      <button class="canvas-topbar-btn" aria-label="Open navigation" @click="toggleNav">
        <Menu class="w-5 h-5" />
      </button>
      <span class="canvas-topbar-title font-copernicus">FlagLab</span>
      <div class="canvas-topbar-actions">
        <button class="canvas-topbar-btn" aria-label="Search" @click="openSearch">
          <Search class="w-5 h-5" />
        </button>
        <NuxtLink to="/settings" class="canvas-topbar-btn" aria-label="Settings">
          <Settings class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/notifications" class="canvas-topbar-btn relative" aria-label="Notifications">
          <Bell class="w-5 h-5" />
          <span v-if="unreadCount > 0" class="canvas-notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-1 min-h-0 overflow-hidden relative">
      <!-- Mobile backdrop -->
      <Transition name="canvas-backdrop-fade">
        <div
          v-if="mobileNavOpen && isMobile"
          class="canvas-mobile-backdrop lg:hidden"
          aria-hidden="true"
          @click="closeNav"
        />
      </Transition>

      <!-- Sidebar: fixed overlay on mobile, inline on desktop -->
      <AppSidebar />
      <SimHistorySidebar @select-job="onSelectHistoryJob" />
      <div class="flex flex-col flex-1 min-w-0 w-full h-full overflow-hidden relative">
        <main class="flex-1 min-h-0 relative p-0 overflow-hidden">
          <slot />
        </main>
        <AppFooter />
      </div>
    </div>

    <ConfirmDialog />
    <AppSearchCommand />
  </div>
</template>

<script setup lang="ts">
import { Menu, Bell, Search, Settings } from 'lucide-vue-next'

useTheme()
const router = useRouter()
const { open: openSearch } = useAppSearch()
const { close: closeHistoryPanel } = useSimHistoryPanel()
const { isDesktop } = useBreakpoint()
const isMobile = computed(() => !isDesktop.value)
const { isOpen: mobileNavOpen, toggle: toggleNav, close: closeNav } = useAppNav()
const { unreadCount } = useNotifications()

function onSelectHistoryJob(job: { job_id: string }) {
  closeHistoryPanel()
  navigateTo(`/blurai/playlab/${job.job_id}`)
}

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

<style scoped>
/* ── Canvas mobile top bar ─────────────────────────────────────── */
.canvas-mobile-topbar {
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
  .canvas-mobile-topbar {
    display: none;
  }
}

.canvas-topbar-title {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-topbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.canvas-topbar-btn {
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
  position: relative;
}

.canvas-topbar-btn:hover {
  background: var(--color-accent);
}

.canvas-notif-badge {
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

/* ── Canvas mobile backdrop ────────────────────────────────────── */
.canvas-mobile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  background: oklch(0 0 0 / 0.4);
}

.canvas-backdrop-fade-enter-active,
.canvas-backdrop-fade-leave-active {
  transition: opacity 0.25s ease;
}

.canvas-backdrop-fade-enter-from,
.canvas-backdrop-fade-leave-to {
  opacity: 0;
}
</style>
