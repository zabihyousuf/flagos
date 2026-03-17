import type { Profile } from '~/lib/types'

export function useWelcomePlanPrompt() {
  const profile = useState<Profile | null>('profile', () => null)
  const open = useState('welcome-plan-prompt-open', () => ref(false))

  const shouldShowPrompt = computed(() => {
    if (!profile.value) return false
    if (profile.value.welcome_plan_prompt_seen_at) return false
    return true
  })

  function showPrompt() {
    open.value = true
  }

  function closePrompt() {
    open.value = false
  }

  return {
    open,
    shouldShowPrompt,
    showPrompt,
    closePrompt,
  }
}
