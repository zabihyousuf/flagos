<template>
  <aside class="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
    <div class="p-6 border-b border-border">
      <NuxtLink to="/" class="flex items-center gap-3">
        <img src="/logo.svg" alt="FlagOS" class="w-8 h-8 rounded-lg" />
        <span class="text-lg font-semibold tracking-tight font-display">FlagOS</span>
      </NuxtLink>
    </div>

    <nav class="flex-1 p-4 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
      >
        <component :is="item.icon" class="w-4 h-4" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="p-4 border-t border-border">
      <NuxtLink
        to="/settings"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isActive('/settings')
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
      >
        <Settings class="w-4 h-4" />
        Settings
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/playbooks', label: 'Playbooks', icon: BookOpen },
  { to: '/players', label: 'Locker Room', icon: Users },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
