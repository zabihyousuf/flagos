/**
 * Plan and trial access. New users get a 3-day free trial; after that Pro features
 * require plan === 'pro'. Use hasProAccess to gate features; use isPaidPro / isTrialing for UI.
 */
const TRIAL_DAYS = 3

const DEV_PRO_STORAGE_KEY = 'flagos-dev-pro-override'

export function usePlanAccess() {
  const profile = useState<{ created_at: string; plan?: 'free' | 'pro' | null } | null>('profile', () => null)
  const devProOverride = useState<boolean>('dev-pro-override', () => false)

  const trialEndsAt = computed(() => {
    const p = profile.value
    if (!p?.created_at) return null
    const start = new Date(p.created_at).getTime()
    return new Date(start + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  })

  const isPaidPro = computed(() => {
    if (import.meta.dev && devProOverride.value) return true
    return profile.value?.plan === 'pro'
  })

  const isTrialing = computed(() => {
    if (isPaidPro.value) return false
    const end = trialEndsAt.value
    if (!end) return false
    return Date.now() < end.getTime()
  })

  /** True if user can use Pro features (paid Pro, dev override, or within 3-day trial). */
  const hasProAccess = computed(() => (import.meta.dev && devProOverride.value) || isPaidPro.value || isTrialing.value)

  function setDevProOverride(value: boolean) {
    devProOverride.value = value
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_PRO_STORAGE_KEY, value ? '1' : '0')
    }
  }

  const trialDaysLeft = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return 0
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
  })

  const trialHoursLeft = computed(() => {
    const end = trialEndsAt.value
    if (!end || !isTrialing.value) return 0
    const diff = end.getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (60 * 60 * 1000)))
  })

  return {
    TRIAL_DAYS,
    trialEndsAt,
    isPaidPro,
    isTrialing,
    hasProAccess,
    trialDaysLeft,
    trialHoursLeft,
    /** Dev only: override to act as Pro. Persisted in localStorage. */
    devProOverride,
    setDevProOverride,
  }
}
