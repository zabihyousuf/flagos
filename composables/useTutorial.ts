import type { Profile } from '~/lib/types'

export function useTutorial() {
  const { profile, fetchProfile, updateProfile } = useProfile()
  const user = useSupabaseUser()

  const open = useState('tutorial-open', () => ref(false))

  const shouldShowTutorial = computed(() => {
    // Disabled for now - tutorial can still be opened from Settings
    return false
    // if (!user.value || !profile.value) return false
    // return !profile.value.tutorial_completed_at
  })

  async function markTutorialComplete() {
    if (!profile.value) return
    await updateProfile({ tutorial_completed_at: new Date().toISOString() })
    open.value = false
  }

  function showTutorial() {
    open.value = true
  }

  function hideTutorial() {
    open.value = false
  }

  return {
    open,
    shouldShowTutorial,
    showTutorial,
    hideTutorial,
    markTutorialComplete,
  }
}
