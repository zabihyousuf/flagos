<template>
  <aside 
    class="sidebar" 
    :class="{ collapsed }"
    :style="{ width: collapsed ? '64px' : '240px' }"
  >
    <!-- Logo + Collapse Toggle -->
    <div class="sidebar-header">
      <NuxtLink to="/" class="sidebar-logo">
        <Transition name="fade">
          <span v-if="!collapsed" class="sidebar-logo-text">FlagOS</span>
        </Transition>
      </NuxtLink>
      <button 
        class="sidebar-collapse-btn"
        @click="toggleCollapse"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <PanelLeftClose v-if="!collapsed" class="w-4 h-4" />
        <PanelLeftOpen v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Quick Play Button -->
    <div class="sidebar-quick-action">
      <button 
        class="quick-play-btn"
        @click="openQuickPlay"
        :title="collapsed ? 'New Play (⌘N)' : ''"
      >
        <Plus class="w-4 h-4 shrink-0" />
        <Transition name="fade">
          <span v-if="!collapsed">New Play</span>
        </Transition>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <template v-for="section in sections" :key="section.label">
        <Transition name="fade">
          <p v-if="!collapsed" class="sidebar-section-label">{{ section.label }}</p>
        </Transition>

        <NuxtLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ active: isActive(item.to) }"
          :title="collapsed ? item.label : ''"
        >
          <component 
            :is="isActive(item.to) ? item.filledIcon : item.icon" 
            class="sidebar-nav-icon"
            :class="{ filled: isActive(item.to) }"
          />
          <Transition name="fade">
            <span v-if="!collapsed" class="sidebar-nav-label">{{ item.label }}</span>
          </Transition>
        </NuxtLink>
      </template>
    </nav>

    <!-- Bottom: User Profile Menu -->
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
          <Transition name="fade">
            <div v-if="!collapsed" class="sidebar-user-info">
              <p class="sidebar-user-name">{{ displayName }}</p>
              <p class="sidebar-user-email">{{ user?.email }}</p>
            </div>
          </Transition>
          <Transition name="fade">
            <ChevronUp v-if="!collapsed" class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </Transition>
        </button>

        <!-- Popup Menu -->
        <Transition name="menu-pop">
          <div v-if="userMenuOpen" class="user-menu" :class="{ 'menu-collapsed': collapsed }">
            <NuxtLink to="/settings" class="user-menu-item" @click="userMenuOpen = false">
              <Settings class="w-4 h-4" />
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
  Settings,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  Gamepad2,
  Play,
  FlaskConical,
} from 'lucide-vue-next'

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()

// Collapse state persisted to localStorage
const collapsed = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const saved = localStorage.getItem('flagos-sidebar-collapsed')
  if (saved !== null) collapsed.value = saved === 'true'

  // Close menu on outside click
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

// For filled icons, we use the same icon but apply CSS fill on active state
// Lucide doesn't have separate filled variants, so we use CSS to fill them
const sections = [
  {
    label: 'Home',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, filledIcon: LayoutDashboard },
    ],
  },
  {
    label: 'Playbook',
    items: [
      { to: '/playbooks', label: 'Playbooks', icon: BookOpen, filledIcon: BookOpen },
      { to: '/plays', label: 'All Plays', icon: Swords, filledIcon: Swords },
    ],
  },
  {
    label: 'Roster',
    items: [
      { to: '/lockerroom', label: 'Locker Room', icon: Users, filledIcon: Users },
      { to: '/teams', label: 'Teams', icon: Shield, filledIcon: Shield },
    ],
  },
  {
    label: 'Flag.ai',
    items: [
      { to: '/simulation/game', label: 'Game Sim', icon: Gamepad2, filledIcon: Gamepad2 },
      { to: '/simulation/test', label: 'Test Your Play', icon: Play, filledIcon: Play },
      { to: '/simulation/scenario', label: 'Scenarios', icon: FlaskConical, filledIcon: FlaskConical },
    ],
  },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// Quick Play
function openQuickPlay() {
  const event = new CustomEvent('open-quick-play')
  window.dispatchEvent(event)
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
  border-right: 1px solid var(--color-border);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  width: v-bind("collapsed ? '64px' : '240px'");
}

/* Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  gap: 8px;
  min-height: 56px;
}

.collapsed .sidebar-header {
  justify-content: center;
  padding: 16px 10px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  overflow: hidden;
  min-width: 0;
}

.sidebar-logo-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
}

.sidebar-logo-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
  white-space: nowrap;
  font-family: var(--font-display, inherit);
}

.sidebar-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sidebar-collapse-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

/* Quick Play */
.sidebar-quick-action {
  padding: 0 12px 8px;
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
  background: color-mix(in oklch, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-play-btn:hover {
  background: color-mix(in oklch, var(--color-primary) 15%, transparent);
  border-color: var(--color-primary);
  border-style: solid;
}

.collapsed .quick-play-btn {
  padding: 8px;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 12px;
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted-foreground);
  padding: 16px 8px 4px;
  margin: 0;
  opacity: 0.7;
}

.sidebar-section-label:first-child {
  padding-top: 4px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-muted-foreground);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  margin: 1px 0;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-nav-item:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

.sidebar-nav-item.active {
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-weight: 600;
}

.collapsed .sidebar-nav-item {
  justify-content: center;
  padding: 10px 0;
}

.sidebar-nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  transition: all 0.15s;
}

.sidebar-nav-icon.filled {
  stroke-width: 2.5;
}

.sidebar-nav-label {
  white-space: nowrap;
}

/* Footer */
.sidebar-footer {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-border);
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
  transition: all 0.15s;
  text-align: left;
}

.sidebar-user-btn:hover {
  background: var(--color-accent);
}

.collapsed .sidebar-user-btn {
  justify-content: center;
  padding: 8px 0;
}

.sidebar-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, #000));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
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

.sidebar-user-email {
  font-size: 11px;
  color: var(--color-muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

/* User Menu Popup */
.user-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
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
  transition: all 0.1s;
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

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.menu-pop-enter-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-pop-leave-active {
  transition: all 0.1s ease;
}

.menu-pop-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

.menu-pop-enter-from.menu-collapsed,
.menu-pop-leave-to.menu-collapsed {
  transform: translateX(-50%) translateY(4px) scale(0.97);
}
</style>

