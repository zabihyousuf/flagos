/**
 * Plan and trial access. New users get a 3-day free trial; after that Pro features
 * require plan === 'pro'. Use hasProAccess to gate features; use isPaidPro / isTrialing for UI.
 */
const TRIAL_DAYS = 3

const DEV_PRO_STORAGE_KEY = 'flagos-dev-pro-override'
const DEV_TRIAL_ENDS_KEY = 'flagos-dev-trial-ends-at'
/** Dev trial length — same as production (3 days). Change to a small value (e.g. 10*1000) for quick expiry testing. */
const DEV_TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000

function getDevTrialEndsAtFromStorage(): string | null {
  if (import.meta.server || typeof localStorage === 'undefined') return null
  const s = localStorage.getItem(DEV_TRIAL_ENDS_KEY)
  if (!s) return null
  const t = new Date(s).getTime()
  if (t > Date.now()) return s
  localStorage.removeItem(DEV_TRIAL_ENDS_KEY)
  return null
}

export function usePlanAccess() {
  const profile = useState<{ created_at: string; plan?: 'free' | 'pro' | null } | null>('profile', () => null)
  const devProOverride = useState<boolean>('dev-pro-override', () => false)
  const devTrialEndsAt = useState<string | null>('dev-trial-ends-at', () => null)
  /** Shared so layout can show banner again when trial is restarted from settings. */
  const trialBannerDismissed = useState<boolean>('trial-banner-dismissed', () => false)

  if (import.meta.client && import.meta.dev) {
    const stored = getDevTrialEndsAtFromStorage()
    if (stored && !devTrialEndsAt.value) devTrialEndsAt.value = stored
  }

  /** Reactive "now" so trial state updates every second without refresh. */
  const countdownNow = ref(0)
  onMounted(() => {
    if (import.meta.server) return
    countdownNow.value = Date.now()
    const id = setInterval(() => {
      countdownNow.value = Date.now()
    }, 1000)
    onUnmounted(() => clearInterval(id))
  })
  const nowForTrial = () => (import.meta.server ? Date.now() : countdownNow.value || Date.now())

  const trialEndsAt = computed(() => {
    if (import.meta.dev && devTrialEndsAt.value) {
      const end = new Date(devTrialEndsAt.value)
      if (end.getTime() > nowForTrial()) return end
      return null
    }
    const p = profile.value
    if (!p?.created_at) return null
    const start = new Date(p.created_at).getTime()
    const trialMs = import.meta.dev ? DEV_TRIAL_MS : TRIAL_DAYS * 24 * 60 * 60 * 1000
    return new Date(start + trialMs)
  })

  const isPaidPro = computed(() => {
    if (import.meta.dev && devProOverride.value) return true
    return profile.value?.plan === 'pro'
  })

  const isTrialing = computed(() => {
    if (isPaidPro.value) return false
    const end = trialEndsAt.value
    if (!end) return false
    return nowForTrial() < end.getTime()
  })

  /** True if user has full Pro tier (paid Pro or dev override). Trial users only get free-trial tier limits. */
  const hasProAccess = computed(() => (import.meta.dev && devProOverride.value) || isPaidPro.value)

  /** True if user can access simulation/Play Lab at all (Pro or free trial). Used for sidebar and upgrade gates. */
  const hasSimulationAccess = computed(() => hasProAccess.value || isTrialing.value)

  function setDevProOverride(value: boolean) {
    devProOverride.value = value
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_PRO_STORAGE_KEY, value ? '1' : '0')
    }
  }

  /** Dev only: start or restart a time-based trial. Turns off Pro override so you see trial UI/banner. Resets banner dismissed. Each click resets the timer. */
  function startDevTrial() {
    setDevProOverride(false)
    trialBannerDismissed.value = false
    const end = new Date(Date.now() + DEV_TRIAL_MS)
    const iso = end.toISOString()
    devTrialEndsAt.value = iso
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_TRIAL_ENDS_KEY, iso)
    }
  }

  /** Dev only: immediately expire the trial so the user becomes a free user. */
  function stopDevTrial() {
    setDevProOverride(false)
    devTrialEndsAt.value = null
    trialBannerDismissed.value = true
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEV_TRIAL_ENDS_KEY)
    }
  }

  const trialDaysLeft = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return 0
    const diff = end.getTime() - nowForTrial()
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
  })

  const trialHoursLeft = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return 0
    const diff = end.getTime() - nowForTrial()
    return Math.max(0, Math.ceil(diff / (60 * 60 * 1000)))
  })

  const trialMinutesLeft = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return 0
    const diff = end.getTime() - nowForTrial()
    return Math.max(0, Math.ceil(diff / (60 * 1000)))
  })

  /** Exact countdown string (e.g. "0d 0h 2m 35s"), updates every second. Use for display. */
  const trialCountdownExact = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return null
    const now = nowForTrial()
    let diff = end.getTime() - now
    if (diff <= 0) return '0d 0h 0m 0s'
    const d = Math.floor(diff / (24 * 60 * 60 * 1000))
    diff %= 24 * 60 * 60 * 1000
    const h = Math.floor(diff / (60 * 60 * 1000))
    diff %= 60 * 60 * 1000
    const m = Math.floor(diff / (60 * 1000))
    diff %= 60 * 1000
    const s = Math.floor(diff / 1000)
    return `${d}d ${h}h ${m}m ${s}s`
  })

  return {
    TRIAL_DAYS,
    trialEndsAt,
    isPaidPro,
    isTrialing,
    hasProAccess,
    hasSimulationAccess,
    trialDaysLeft,
    trialHoursLeft,
    trialMinutesLeft,
    trialCountdownExact,
    /** Dev only: override to act as Pro. Persisted in localStorage. */
    devProOverride,
    setDevProOverride,
    /** Dev only: start a time-based trial (TRIAL_DAYS). Persisted in localStorage. */
    startDevTrial,
    /** Dev only: stop the trial and become a free user. */
    stopDevTrial,
    trialBannerDismissed,
  }
}
