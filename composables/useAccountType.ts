import type { Profile } from '~/lib/types'

export function useAccountType() {
  const profile = useState<Profile | null>('profile', () => null)
  const { isManager, isPlayer } = useActiveContext()

  const isAppAdmin = computed(() => profile.value?.is_app_admin === true)

  return { isManager, isPlayer, isAppAdmin }
}
