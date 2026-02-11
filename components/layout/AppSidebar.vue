<template>
  <aside
    class="sidebar"
    :class="{ collapsed }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- Header: Logo + Utility Buttons -->
    <div class="sidebar-header">
      <button
        v-if="collapsed"
        class="sidebar-logo-btn"
        @click="toggleCollapse"
        title="Expand sidebar"
      >
        <PanelLeftOpen v-if="hovering" class="w-5 h-5" />
        <Flag v-else class="w-5 h-5 text-primary" />
      </button>

      <NuxtLink v-if="!collapsed" to="/" class="sidebar-logo">
        <Flag class="w-5 h-5 text-primary shrink-0" />
        <span class="sidebar-logo-text">FlagOS</span>
      </NuxtLink>

      <div v-if="!collapsed" class="sidebar-utility">
        <button class="utility-btn" title="Search">
          <Search class="w-4 h-4" />
        </button>
        <button class="utility-btn" title="Notifications">
          <Bell class="w-4 h-4" />
        </button>
        <NuxtLink to="/settings" class="utility-btn" title="Settings">
          <SettingsIcon class="w-4 h-4" />
        </NuxtLink>
        <button class="utility-btn" @click="toggleCollapse" title="Collapse sidebar">
          <PanelLeftClose class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Quick Play Button -->
    <div class="sidebar-quick-action">
      <button
        class="quick-play-btn"
        @click="openQuickPlay"
        :title="collapsed ? 'New Play (⌘N)' : ''"
      >
        <Plus class="w-4 h-4 shrink-0" />
        <span class="quick-play-label">New Play</span>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-nav-item"
        :class="{ active: isActive(item.to) }"
        :title="collapsed ? item.label : ''"
      >
        <component :is="item.icon" class="sidebar-nav-icon" />
        <span class="sidebar-nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Footer: User Profile -->
    <div class="sidebar-footer">
      <div class="sidebar-user-wrapper" ref="userMenuRef">
        <button
          class="sidebar-user-btn"
          @click="userMenuOpen = !userMenuOpen"
          :title="collapsed ? displayName : ''"
        >
          <div class="sidebar-user-avatar">
            {{ avatarInitial }}
          </div>
          <div class="sidebar-user-info">
            <p class="sidebar-user-name">{{ displayName }}</p>
          </div>
          <ChevronDown class="sidebar-user-chevron" />
        </button>

        <!-- Popup Menu -->
        <Transition name="menu-pop">
          <div v-if="userMenuOpen" class="user-menu" :class="{ 'menu-collapsed': collapsed }">
            <NuxtLink to="/settings" class="user-menu-item" @click="userMenuOpen = false">
              <SettingsIcon class="w-4 h-4" />
              <span>Settings</span>
            </NuxtLink>
            <div class="user-menu-divider" />
            <button class="user-menu-item text-destructive" @click="handleLogout">
              <LogOut class="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  LayoutDashboard,
  BookOpen,
  Swords,
  Users,
  Shield,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Gamepad2,
  Play,
  FlaskConical,
  Flag,
  Search,
  Bell,
} from 'lucide-vue-next'

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()

const collapsed = ref(false)
const hovering = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const saved = localStorage.getItem('flagos-sidebar-collapsed')
  if (saved !== null) collapsed.value = saved === 'true'
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('flagos-sidebar-collapsed', String(collapsed.value))
  userMenuOpen.value = false
}

const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.user_metadata?.display_name || user.value.email?.split('@')[0] || ''
})

const avatarInitial = computed(() => {
  return displayName.value.charAt(0).toUpperCase() || '?'
})

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/playbooks', label: 'Playbooks', icon: BookOpen },
  { to: '/plays', label: 'All Plays', icon: Swords },
  { to: '/lockerroom', label: 'Locker Room', icon: Users },
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/simulation/game', label: 'Game Sim', icon: Gamepad2 },
  { to: '/simulation/test', label: 'Test Your Play', icon: Play },
  { to: '/simulation/scenario', label: 'Scenarios', icon: FlaskConical },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function openQuickPlay() {
  window.dispatchEvent(new CustomEvent('open-quick-play'))
}

async function handleLogout() {
  userMenuOpen.value = false
  await client.auth.signOut()
  await navigateTo('/auth/login')
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  flex-shrink: 0;
  width: 260px;
}

.sidebar.collapsed {
  width: 64px;
}

/* ── Collapsible text — shared rule ────────────────────────────── */
/* All text labels shrink to 0 width when collapsed, in sync with  */
/* the sidebar width. The matching gap on their parent also goes   */
/* to 0 so icons end up perfectly centered.                        */
.sidebar-nav-label,
.quick-play-label,
.sidebar-user-info,
.sidebar-user-chevron {
  overflow: hidden;
  white-space: nowrap;
  max-width: 180px;
  transition: max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapsed .sidebar-nav-label,
.collapsed .quick-play-label,
.collapsed .sidebar-user-info,
.collapsed .sidebar-user-chevron {
  max-width: 0;
}

/* ── Header ────────────────────────────────────────────────────── */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  gap: 8px;
  min-height: 52px;
}

.collapsed .sidebar-header {
  justify-content: center;
  padding: 16px 14px 8px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  min-width: 0;
}

.sidebar-logo-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
  white-space: nowrap;
}

.sidebar-logo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.sidebar-logo-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

.sidebar-utility {
  display: flex;
  align-items: center;
  gap: 2px;
}

.utility-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  text-decoration: none;
}

.utility-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

/* ── Quick Play ────────────────────────────────────────────────── */
.sidebar-quick-action {
  padding: 4px 12px 8px;
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapsed .sidebar-quick-action {
  padding: 4px 10px 8px;
}

.quick-play-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed var(--color-border);
  background: color-mix(in oklch, var(--color-primary) 6%, transparent);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s,
              gap 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-play-btn:hover {
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  border-color: var(--color-primary);
  border-style: solid;
}

.collapsed .quick-play-btn {
  gap: 0;
  padding: 8px;
}

/* ── Navigation ────────────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 12px;
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapsed .sidebar-nav {
  padding: 4px 10px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-muted-foreground);
  font-size: 14px;
  font-weight: 500;
  margin: 1px 0;
  white-space: nowrap;
  overflow: hidden;
  transition: color 0.15s, background 0.15s,
              gap 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-nav-item:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

.sidebar-nav-item.active {
  background: var(--color-accent);
  color: var(--color-foreground);
  font-weight: 600;
}

.collapsed .sidebar-nav-item {
  gap: 0;
  padding: 10px 12px;
}

.sidebar-nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ── Footer ────────────────────────────────────────────────────── */
.sidebar-footer {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-sidebar-border);
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapsed .sidebar-footer {
  padding: 8px 10px 12px;
}

.sidebar-user-wrapper {
  position: relative;
}

.sidebar-user-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: background 0.15s,
              gap 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-user-btn:hover {
  background: var(--color-accent);
}

.collapsed .sidebar-user-btn {
  gap: 0;
  padding: 8px 7px;
}

.sidebar-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, #000));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

/* ── User Menu Popup ───────────────────────────────────────────── */
.user-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 50;
  min-width: 160px;
}

.user-menu.menu-collapsed {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: 180px;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.1s;
  text-decoration: none;
  width: 100%;
  text-align: left;
}

.user-menu-item:hover {
  background: var(--color-accent);
}

.user-menu-item.text-destructive {
  color: var(--color-destructive);
}

.user-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* ── Menu Transition ───────────────────────────────────────────── */
.menu-pop-enter-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-pop-leave-active {
  transition: all 0.1s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

.menu-pop-enter-from.menu-collapsed,
.menu-pop-leave-to.menu-collapsed {
  transform: translateX(-50%) translateY(4px) scale(0.97);
}
</style>
