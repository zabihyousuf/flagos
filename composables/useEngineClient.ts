export function useEngineClient() {
  const config = useRuntimeConfig()
  const baseUrl = (config.public.engineUrl as string)?.replace(/\/$/, '') || ''

  const engineError = ref<string | null>(null)
  const engineDown = useState<boolean>('engine-down', () => false)
  const rateLimited = ref(false)
  const retryAfterSeconds = ref(0)

  let rateLimitTimer: ReturnType<typeof setInterval> | null = null

  async function getToken(): Promise<string> {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session')
    }
    return session.access_token
  }

  function clearRateLimitTimer() {
    if (rateLimitTimer) {
      clearInterval(rateLimitTimer)
      rateLimitTimer = null
    }
  }

  function setRateLimit(seconds: number) {
    rateLimited.value = true
    retryAfterSeconds.value = Math.max(0, seconds)
    clearRateLimitTimer()
    if (retryAfterSeconds.value <= 0) {
      rateLimited.value = false
      return
    }
    if (import.meta.client) {
      rateLimitTimer = setInterval(() => {
        retryAfterSeconds.value -= 1
        if (retryAfterSeconds.value <= 0) {
          rateLimited.value = false
          clearRateLimitTimer()
        }
      }, 1000)
    }
  }

  function clearRateLimit() {
    rateLimited.value = false
    retryAfterSeconds.value = 0
    clearRateLimitTimer()
  }

  function clearEngineDown() {
    engineDown.value = false
  }

  async function post<T = unknown>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; status: number }> {
    engineError.value = null
    if (!baseUrl) {
      return { ok: false, status: 0 }
    }
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        engineDown.value = false
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      if (res.status === 429) {
        engineDown.value = false
        let seconds = 60
        try {
          const data = await res.json()
          if (typeof data?.retry_after_seconds === 'number') {
            seconds = data.retry_after_seconds
          }
        } catch (_) {}
        setRateLimit(seconds)
        engineError.value = null
        return { ok: false, status: 429 }
      }
      if (res.status === 503) engineDown.value = true
      if (!res.ok) {
        engineDown.value = false
        const text = await res.text()
        engineError.value = text || `Request failed (${res.status})`
        return { ok: false, status: res.status }
      }
      engineDown.value = false
      const data = (await res.json()) as T
      return { ok: true, data, status: res.status }
    } catch (e: any) {
      if (e?.message === 'No active session') {
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      engineError.value = e?.message ?? 'Engine request failed'
      if (baseUrl) engineDown.value = true
      return { ok: false, status: 0 }
    }
  }

  async function get<T = unknown>(path: string): Promise<{ ok: boolean; data?: T; status: number }> {
    engineError.value = null
    if (!baseUrl) {
      return { ok: false, status: 0 }
    }
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        engineDown.value = false
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      if (res.status === 429) {
        engineDown.value = false
        let seconds = 60
        try {
          const data = await res.json()
          if (typeof data?.retry_after_seconds === 'number') {
            seconds = data.retry_after_seconds
          }
        } catch (_) {}
        setRateLimit(seconds)
        engineError.value = null
        return { ok: false, status: 429 }
      }
      if (!res.ok) {
        engineDown.value = false
        engineError.value = null
        return { ok: false, status: res.status }
      }
      engineDown.value = false
      const data = (await res.json()) as T
      return { ok: true, data, status: res.status }
    } catch (e: any) {
      if (e?.message === 'No active session') {
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      engineError.value = e?.message ?? 'Engine request failed'
      if (baseUrl) engineDown.value = true
      return { ok: false, status: 0 }
    }
  }

  async function del(path: string): Promise<{ ok: boolean; status: number }> {
    engineError.value = null
    if (!baseUrl) {
      return { ok: false, status: 0 }
    }
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      if (res.status === 429) {
        let seconds = 60
        try {
          const data = await res.json()
          if (typeof data?.retry_after_seconds === 'number') {
            seconds = data.retry_after_seconds
          }
        } catch (_) {}
        setRateLimit(seconds)
        engineError.value = null
        return { ok: false, status: 429 }
      }
      if (!res.ok) {
        engineError.value = null
        return { ok: false, status: res.status }
      }
      return { ok: true, status: res.status }
    } catch (e: any) {
      if (e?.message === 'No active session') {
        engineError.value = 'Session expired. Please log in again.'
        return { ok: false, status: 401 }
      }
      engineError.value = e?.message ?? 'Engine request failed'
      return { ok: false, status: 0 }
    }
  }

  async function stream(path: string): Promise<WebSocket | null> {
    if (!baseUrl) return null
    try {
      const token = await getToken()
      const wsUrl = baseUrl.replace(/^http/, 'ws')
      const url = `${wsUrl}${path}?token=${encodeURIComponent(token)}`
      return new WebSocket(url)
    } catch (_) {
      engineError.value = 'Session expired. Please log in again.'
      return null
    }
  }

  onUnmounted(() => {
    clearRateLimitTimer()
  })

  return {
    baseUrl,
    engineError,
    engineDown,
    rateLimited,
    retryAfterSeconds,
    clearRateLimit,
    clearEngineDown,
    post,
    get,
    del,
    stream,
  }
}
