export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'flagos-theme'

function getStored(): ThemePreference {
  if (import.meta.client && typeof localStorage !== 'undefined') {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  }
  return 'system'
}

function prefersDark(): boolean {
  if (import.meta.client && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

/** Resolved theme: actual light or dark based on preference and (if system) OS setting */
function resolveDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return prefersDark()
}

export function useTheme() {
  const preference = ref<ThemePreference>(getStored())
  const resolvedDark = ref(resolveDark(preference.value))

  function apply() {
    if (import.meta.server) return
    const dark = resolveDark(preference.value)
    resolvedDark.value = dark
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  function setPreference(value: ThemePreference) {
    preference.value = value
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value)
    }
    apply()
  }

  function syncFromStored() {
    preference.value = getStored()
    apply()
  }

  function syncFromSettings(settingsTheme: ThemePreference | undefined) {
    const next = settingsTheme ?? 'system'
    if (next !== preference.value) {
      preference.value = next
      if (import.meta.client && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next)
      }
      apply()
    }
  }

  let removeListener: (() => void) | null = null
  onMounted(() => {
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      if (preference.value === 'system') apply()
    }
    mq.addEventListener('change', listener)
    removeListener = () => mq.removeEventListener('change', listener)
  })
  onUnmounted(() => {
    removeListener?.()
  })

  return {
    preference: readonly(preference),
    resolvedDark: readonly(resolvedDark),
    setPreference,
    apply,
    syncFromStored,
    syncFromSettings,
  }
}
