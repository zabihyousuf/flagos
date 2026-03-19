<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Notifications</h2>
        <p class="text-muted-foreground text-sm mt-1">Stay updated on your simulation jobs.</p>
      </div>
      <button
        v-if="unreadCount > 0"
        class="mark-all-btn"
        @click="markAllRead"
      >
        <CheckCheck class="w-4 h-4" />
        <span>Mark all read</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="notifications-filters">
      <button
        class="filter-btn"
        :class="{ active: filter === 'all' }"
        @click="filter = 'all'"
      >
        All
      </button>
      <button
        class="filter-btn"
        :class="{ active: filter === 'unread' }"
        @click="filter = 'unread'"
      >
        Unread
        <span v-if="unreadCount > 0" class="filter-count">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- Notification List -->
    <div class="notifications-list">
      <div v-if="filteredNotifications.length === 0" class="notifications-empty">
        <Bell class="w-10 h-10 text-muted-foreground/30" />
        <p class="text-muted-foreground mt-3">
          {{ filter === 'unread' ? 'No unread notifications' : 'No notifications yet' }}
        </p>
        <p class="text-sm text-muted-foreground/60 mt-1">
          Notifications will appear here when your simulations complete.
        </p>
      </div>

      <TransitionGroup name="notif-list" tag="div">
        <div
          v-for="n in filteredNotifications"
          :key="n.id"
          class="notification-card"
          :class="{ unread: !n.read }"
        >
          <div class="notification-card-icon" :class="n.type === 'job_completed' ? 'icon-success' : 'icon-error'">
            <CheckCircle2 v-if="n.type === 'job_completed'" class="w-5 h-5" />
            <XCircle v-else class="w-5 h-5" />
          </div>

          <div class="notification-card-body" @click="goToJob(n)">
            <div class="notification-card-title-row">
              <p class="notification-card-title">{{ n.title }}</p>
              <span class="notification-card-time">{{ timeAgo(n.created_at) }}</span>
            </div>
            <p v-if="n.message" class="notification-card-message">{{ n.message }}</p>
          </div>

          <div class="notification-card-actions">
            <button
              v-if="!n.read"
              class="card-action-btn"
              title="Mark as read"
              @click="markAsRead(n.id)"
            >
              <Check class="w-4 h-4" />
            </button>
            <button
              class="card-action-btn card-action-dismiss"
              title="Dismiss"
              @click="dismiss(n.id)"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bell,
  CheckCircle2,
  XCircle,
  X,
  Check,
  CheckCheck,
} from 'lucide-vue-next'
import type { AppNotification } from '~/composables/useNotifications'

const { notifications, unreadCount, markAsRead, markAllRead, dismiss } = useNotifications()

const filter = ref<'all' | 'unread'>('all')

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') return notifications.value.filter((n) => !n.read)
  return notifications.value
})

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffS = Math.floor((now - then) / 1000)
  if (diffS < 60) return 'Just now'
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function goToJob(n: AppNotification) {
  if (!n.read) markAsRead(n.id)
  if (n.metadata?.job_id) {
    navigateTo(`/blurai/playlab/${n.metadata.job_id}`)
  }
}
</script>

<style scoped>
.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.mark-all-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-border);
}

/* ── Filters ──────────────────────────────────────────────────── */
.notifications-filters {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  background: none;
  color: var(--color-muted-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.filter-btn:hover {
  color: var(--color-foreground);
}

.filter-btn.active {
  color: var(--color-foreground);
  border-bottom-color: var(--color-primary);
}

.filter-count {
  background: var(--color-destructive);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 0 6px;
  border-radius: 9999px;
  line-height: 18px;
  min-width: 18px;
  text-align: center;
}

/* ── List ─────────────────────────────────────────────────────── */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notifications-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

/* ── Card ─────────────────────────────────────────────────────── */
.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  transition: background 0.1s;
}

.notification-card:hover {
  background: var(--color-accent);
}

.notification-card.unread {
  background: color-mix(in oklch, var(--color-primary) 5%, transparent);
}

.notification-card.unread:hover {
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
}

.notification-card-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.icon-success {
  background: color-mix(in oklch, #22c55e 15%, transparent);
  color: #22c55e;
}

.icon-error {
  background: color-mix(in oklch, var(--color-destructive) 15%, transparent);
  color: var(--color-destructive);
}

.notification-card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.notification-card-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.notification-card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-foreground);
  margin: 0;
  line-height: 1.4;
}

.notification-card.unread .notification-card-title {
  font-weight: 600;
}

.notification-card-time {
  font-size: 12px;
  color: var(--color-muted-foreground);
  white-space: nowrap;
  flex-shrink: 0;
}

.notification-card-message {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin: 3px 0 0;
  line-height: 1.4;
}

.notification-card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s;
}

.notification-card:hover .notification-card-actions {
  opacity: 1;
}

.card-action-btn {
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
  transition: background 0.1s, color 0.1s;
}

.card-action-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

.card-action-dismiss:hover {
  color: var(--color-destructive);
}

/* ── List transition ──────────────────────────────────────────── */
.notif-list-enter-active,
.notif-list-leave-active {
  transition: all 0.25s ease;
}

.notif-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.notif-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.notif-list-move {
  transition: transform 0.25s ease;
}
</style>
