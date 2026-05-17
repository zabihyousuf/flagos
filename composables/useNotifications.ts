import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'vue-sonner'

/** Read notifications older than this are deleted on fetch (server + local list). */
export const READ_NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface AppNotification {
  id: string
  user_id: string
  type: 'job_completed' | 'job_failed'
  title: string
  message: string | null
  metadata: { job_id?: string; job_type?: string } | null
  read: boolean
  read_at: string | null
  created_at: string
}

const notifications = ref<AppNotification[]>([])
const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)
let _channel: RealtimeChannel | null = null
let _initialized = false

export function useNotifications() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function fetchRecent() {
    if (!user.value) return
    const cutoff = new Date(Date.now() - READ_NOTIFICATION_TTL_MS).toISOString()
    await client
      .from('notifications')
      .delete()
      .eq('user_id', user.value.id)
      .eq('read', true)
      .lt('read_at', cutoff)

    const { data } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      const rows = data as AppNotification[]
      const cutoffMs = Date.now() - READ_NOTIFICATION_TTL_MS
      notifications.value = rows
        .map((n) => ({ ...n, read_at: n.read_at ?? null }))
        .filter((n) => {
          if (!n.read || !n.read_at) return true
          return new Date(n.read_at).getTime() >= cutoffMs
        })
    }
  }

  function subscribe() {
    if (_channel || !user.value) return
    _channel = client
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.value.id}`,
        },
        (payload) => {
          const n = { ...(payload.new as AppNotification), read_at: (payload.new as AppNotification).read_at ?? null }
          // Prepend to list (avoid duplicates)
          if (!notifications.value.some((x) => x.id === n.id)) {
            notifications.value.unshift(n)
          }
          // Show toast
          if (n.type === 'job_completed') {
            toast.success(n.title, { description: n.message ?? undefined })
          } else if (n.type === 'job_failed') {
            toast.error(n.title, { description: n.message ?? undefined })
          }
        },
      )
      .subscribe()
  }

  function unsubscribe() {
    if (_channel) {
      client.removeChannel(_channel)
      _channel = null
    }
  }

  async function markAsRead(id: string) {
    if (!user.value) return
    const read_at = new Date().toISOString()
    notifications.value = notifications.value.map((n) =>
      n.id === id ? { ...n, read: true, read_at } : n,
    )
    await client.from('notifications').update({ read: true, read_at }).eq('id', id).eq('user_id', user.value.id)
  }

  async function markAllRead() {
    if (!user.value) return
    const read_at = new Date().toISOString()
    notifications.value = notifications.value.map((n) => (n.read ? n : { ...n, read: true, read_at }))
    await client
      .from('notifications')
      .update({ read: true, read_at })
      .eq('user_id', user.value.id)
      .eq('read', false)
  }

  /** Mark all unread notifications for a sim job (e.g. user is already on Play Lab for that job). */
  async function markReadForJob(jobId: string) {
    if (!user.value || !jobId) return
    const read_at = new Date().toISOString()
    notifications.value = notifications.value.map((n) =>
      !n.read && n.metadata?.job_id === jobId ? { ...n, read: true, read_at } : n,
    )
    await client
      .from('notifications')
      .update({ read: true, read_at })
      .eq('user_id', user.value.id)
      .eq('read', false)
      .contains('metadata', { job_id: jobId })
  }

  async function dismiss(id: string) {
    if (!user.value) return
    notifications.value = notifications.value.filter((n) => n.id !== id)
    await client.from('notifications').delete().eq('id', id).eq('user_id', user.value.id)
  }

  /** Remove all notifications linked to a specific job (called when job is deleted). */
  function dismissByJobId(jobId: string) {
    notifications.value = notifications.value.filter(
      (n) => n.metadata?.job_id !== jobId,
    )
    // DB deletion handled by the caller (useJobHistory.deleteJob)
  }

  function init() {
    if (_initialized) return
    _initialized = true
    fetchRecent()
    subscribe()
  }

  // Re-init when user changes (login/logout)
  watch(user, (u) => {
    unsubscribe()
    _initialized = false
    if (u) {
      notifications.value = []
      init()
    } else {
      notifications.value = []
    }
  })

  return {
    notifications: readonly(notifications),
    unreadCount,
    init,
    fetchRecent,
    markAsRead,
    markAllRead,
    markReadForJob,
    dismiss,
    dismissByJobId,
    unsubscribe,
  }
}
