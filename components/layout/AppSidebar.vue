<template>
  <aside
    class="sidebar"
    :class="{ collapsed, 'sidebar--hover': hovering }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @click="onSidebarClick"
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
        <button class="utility-btn" title="Search (⌘K)" @click="openSearch">
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
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="quick-play-btn"
              @click="openQuickPlay"
            >
              <Plus class="w-4 h-4 shrink-0" />
              <span class="quick-play-label">New Play</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" :side-offset="10" v-if="collapsed">
            New Play (⌘N)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <template v-for="(group, index) in navGroups" :key="index">
        <div v-if="!collapsed && (group.label || group.badge)" class="sidebar-group-label flex items-center gap-2">
          <span :class="{ 'ai-gradient-text': group.label === 'blur.ai' }">{{ group.label }}</span>
          <span v-if="group.badge" class="px-1.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary normal-case tracking-normal">
            {{ group.badge }}
          </span>
        </div>
        <TooltipProvider v-for="item in group.items.filter(i => !i.devOnly || isDev)" :key="item.to" :delay-duration="0">
          <Tooltip>
            <TooltipTrigger as-child>
              <NuxtLink
                :to="item.disabled ? '' : item.to"
                class="sidebar-nav-item"
                :class="{ 
                  active: isActive(item.to),
                  'opacity-50 pointer-events-none grayscale': item.disabled
                }"
              >
                <component :is="item.icon" class="sidebar-nav-icon" />
                <span class="sidebar-nav-label">{{ item.label }}</span>
                <span v-if="item.devOnly" class="ml-auto text-[11px] font-mono text-muted-foreground/50 border border-muted-foreground/20 rounded px-1">DEV</span>
              </NuxtLink>
            </TooltipTrigger>
            <TooltipContent side="right" :side-offset="10" v-if="collapsed">
              {{ item.label }} <span v-if="item.disabled">(Coming Soon)</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div v-if="!collapsed && index < navGroups.length - 1" class="sidebar-group-divider" />
      </template>
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
          
          <div class="sidebar-user-info flex-1 min-w-0 flex flex-col items-start justify-center">
            <p class="sidebar-user-name truncate w-full">{{ displayName }}</p>
            <p class="sidebar-user-email truncate w-full text-muted-foreground text-[11px]">{{ emailAddress }}</p>
          </div>
          
          <ChevronDown class="sidebar-user-chevron ml-auto w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <!-- Popup Menu -->
        <Transition name="menu-pop">
          <div v-if="userMenuOpen" class="user-menu" :class="{ 'menu-collapsed': collapsed }">
            <div class="px-3 py-2 border-b border-border mb-1" v-if="collapsed">
               <p class="text-xs font-semibold truncate">{{ displayName }}</p>
               <p class="text-[11px] text-muted-foreground truncate">{{ emailAddress }}</p>
            </div>
            <NuxtLink to="/settings" class="user-menu-item" @click="userMenuOpen = false">
              <SettingsIcon class="w-4 h-4" />
              <span>Settings</span>
            </NuxtLink>
            <NuxtLink to="/whats-new" class="user-menu-item" @click="userMenuOpen = false">
              <Sparkles class="w-4 h-4" />
              <span>What's New</span>
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
  Sparkles,
} from 'lucide-vue-next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()
const { profile, fetchProfile } = useProfile()

const collapsed = ref(false)
const hovering = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const saved = localStorage.getItem('flagos-sidebar-collapsed')
  if (saved !== null) {
    collapsed.value = saved === 'true'
  } else if (typeof window !== 'undefined' && window.innerWidth < 1280) {
    collapsed.value = true
    localStorage.setItem('flagos-sidebar-collapsed', 'true')
  }
  document.addEventListener('click', handleClickOutside)
  fetchProfile()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

function onSidebarClick(e: MouseEvent) {
  if (!collapsed.value) return
  if ((e.target as HTMLElement).closest('button, a')) return
  toggleCollapse()
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('flagos-sidebar-collapsed', String(collapsed.value))
  userMenuOpen.value = false
}

const displayName = computed(() => {
  const fromProfile = profile.value?.display_name
  if (fromProfile?.trim()) return fromProfile.trim()
  if (user.value?.user_metadata?.display_name) return user.value.user_metadata.display_name
  return 'User'
})

const emailAddress = computed(() => {
  if (!user.value) return ''
  return user.value.email || ''
})

const avatarInitial = computed(() => {
  return (displayName.value || emailAddress.value).charAt(0).toUpperCase() || '?'
})

const isDev = import.meta.dev

interface NavItem {
  to: string
  label: string
  icon: any
  badge?: string
  disabled?: boolean
  devOnly?: boolean
}

interface NavGroup {
  label: string
  badge?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Locker Room',
    items: [
      { to: '/playbooks', label: 'Playbooks', icon: BookOpen },
      { to: '/squad', label: 'Squad', icon: Users }
    ]
  },
  {
    label: 'blur.ai',
    badge: 'Coming Soon',
    items: [
      { to: '/simulation/game', label: 'Game Sim', icon: Gamepad2, disabled: true },
      { to: '/simulation/test', label: 'Test Your Play', icon: Play, disabled: true },
      { to: '/simulation/scenario', label: 'Scenarios', icon: FlaskConical, disabled: true },
    ]
  }
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const { open: openSearch } = useAppSearch()

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
  background: var(--color-background);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
  flex-shrink: 0;
  width: 260px;
  position: relative;
  z-index: 40;
}

/* Hover background only when collapsed (hover anywhere on the narrow strip) */
.sidebar.collapsed.sidebar--hover {
  background: color-mix(in oklch, var(--color-background) 40%, var(--color-muted));
}

.sidebar.collapsed {
  width: 64px;
}

/* ── Collapsible text handling ─────────────────────────────────── */
.sidebar-nav-label,
.quick-play-label,
.sidebar-user-info, 
.sidebar-user-email,
.sidebar-group-label {
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.2s, width 0.2s;
  overflow: hidden;
}

.collapsed .sidebar-nav-label,
.collapsed .quick-play-label,
.collapsed .sidebar-user-info,
.collapsed .sidebar-user-email,
.collapsed .sidebar-group-label,
.collapsed .sidebar-user-chevron {
  opacity: 0;
  width: 0;
  display: none; /* Hide completely when collapsed to prevent layout shifts */
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
  padding: 16px 0;
  justify-content: center;
}

/* ── AI Gradient Text ──────────────────────────────────────────── */
@keyframes ai-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.ai-gradient-text {
  background: linear-gradient(
    to right,
    #3b82f6,
    #6366f1,
    #8b5cf6,
    #d946ef,
    #ec4899,
    #6366f1,
    #3b82f6
  );
  background-size: 400% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ai-gradient 8s ease-in-out infinite;
  font-weight: 800;
  letter-spacing: -0.02em;
}


.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  min-width: 0;
}

.sidebar-logo-text {
  font-size: 17px;
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
  border-radius: 9999px;
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
  padding: 10px 12px;
  border-radius: 8px;
  border: none; /* Removed border */
  background: var(--color-primary); /* Updated to solid primary */
  color: var(--color-primary-foreground); /* Consistent text color */
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  transition: background 0.15s, opacity 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1); /* Subtle shadow for button feel */
  position: relative;
  overflow: visible;
}

.quick-play-btn:hover {
  background: color-mix(in oklch, var(--color-primary) 90%, black); /* Slightly darker on hover */
}

.collapsed .quick-play-btn {
  gap: 0;
  padding: 10px; /* Keep padding consistent */
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

.sidebar-group-label {
  padding: 16px 10px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-muted-foreground);
  letter-spacing: 0.05em;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-muted-foreground);
  font-size: 14px;
  font-weight: 500;
  margin: 1px 0;
  white-space: nowrap;
  overflow: visible;
  transition: color 0.15s, background 0.15s;
  position: relative;
}

/* Tooltip styles removed - using Shadcn Tooltip component */

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
  gap: 0; /* Just show icon */
  padding: 10px;
  justify-content: center;
}

.sidebar-nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar-group-divider {
  display: none; /* Hide if using labels, or use instead of labels if preferred */
}

/* ── Footer ────────────────────────────────────────────────────── */
.sidebar-footer {
  padding: 8px 12px 12px;
  transition: padding 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  /* Ensure popup can go outside */
  position: relative; 
  z-index: 50; 
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
  transition: background 0.15s;
}

.sidebar-user-btn:hover {
  background: var(--color-accent);
}

.collapsed .sidebar-user-btn {
  gap: 0;
  justify-content: center;
  padding: 8px 7px;
}

.sidebar-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, #000));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
}



.sidebar-user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
  line-height: 1.2;
}

.sidebar-user-email {
  font-size: 12px;
  color: var(--color-muted-foreground);
  line-height: 1.2;
}

.sidebar-user-chevron {
  transition: transform 0.2s;
}

.user-menu-open .sidebar-user-chevron {
  transform: rotate(180deg);
}


/* ── User Menu Popup ───────────────────────────────────────────── */
.user-menu {
  position: absolute;
  bottom: calc(100% + 8px); 
  left: 0;
  width: 100%;
  min-width: 220px; /* Ensure content fits */
  background: var(--color-card);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

/* Fix popup position when sidebar is collapsed */
.user-menu.menu-collapsed {
  left: 100%; /* Position to the right of the sidebar */
  bottom: 0;
  margin-left: 12px; /* Add some spacing */
  width: 200px; /* Fixed width */
}

/* Ensure the arrow points left in collapsed mode? Not strictly needed but nice */

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-foreground);
  font-size: 14px;
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

.user-menu-item.text-destructive:hover {
  background: color-mix(in oklch, var(--color-destructive) 10%, transparent);
}

.user-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* ── Menu Transition ───────────────────────────────────────────── */
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.menu-pop-enter-from.menu-collapsed,
.menu-pop-leave-to.menu-collapsed {
  transform: translateX(-8px) scale(0.96); /* Slide in from left when collapsed */
}
</style>
