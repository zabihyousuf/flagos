import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'vue-sonner'

export interface AppNotification {
  id: string
  user_id: string
  type: 'job_completed' | 'job_failed'
  title: string
  message: string | null
  metadata: { job_id?: string; job_type?: string } | null
  read: boolean
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
    const { data } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      notifications.value = data as AppNotification[]
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
          const n = payload.new as AppNotification
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
    notifications.value = notifications.value.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    )
    await client.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    if (!user.value) return
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }))
    await client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.value.id)
      .eq('read', false)
  }

  async function dismiss(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
    await client.from('notifications').delete().eq('id', id)
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
    dismiss,
    unsubscribe,
  }
}
