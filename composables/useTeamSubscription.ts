import type { TeamSubscription } from '~/lib/types'

const ownSubscription = ref<TeamSubscription | null>(null)

export function useTeamSubscription() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)

  async function fetchOwnSubscription() {
    if (!user.value) return
    loading.value = true
    try {
      const { data } = await client
        .from('team_subscriptions')
        .select('*')
        .eq('user_id', user.value.id)
        .maybeSingle()
      ownSubscription.value = data as TeamSubscription | null
    } finally {
      loading.value = false
    }
  }

  const isPro = computed(
    () => ownSubscription.value?.plan === 'pro' && ownSubscription.value?.status === 'active',
  )

  const isSubscriptionTrialing = computed(() => ownSubscription.value?.status === 'trialing')

  return {
    ownSubscription: readonly(ownSubscription),
    loading: readonly(loading),
    isPro,
    isSubscriptionTrialing,
    fetchOwnSubscription,
  }
}
