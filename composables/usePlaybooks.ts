import type { Playbook } from '~/lib/types'

export function usePlaybooks() {
  const client = useSupabaseDB()
  const playbooks = ref<Playbook[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPlaybooks() {
    const user = useSupabaseUser()

    if (!user.value) {
      const unwatch = watch(user, (u) => {
        if (u) {
          unwatch()
          fetchPlaybooks()
        }
      })
      return
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('playbooks')
        .select('*, plays(id)')
        .eq('user_id', user.value.id)
        .order('updated_at', { ascending: false })

      if (err) throw err
      playbooks.value = (data ?? []) as Playbook[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createPlaybook(name: string, description: string) {
    const user = useSupabaseUser()
    if (!user.value) return null

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('playbooks')
        .insert({ user_id: user.value.id, name, description })
        .select()
        .single()

      if (err) throw err
      playbooks.value.unshift(data as Playbook)
      return data as Playbook
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePlaybook(id: string, updates: Partial<Playbook>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('playbooks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, plays(id)')
        .single()

      if (err) throw err
      const index = playbooks.value.findIndex((p) => p.id === id)
      if (index !== -1) playbooks.value[index] = data as Playbook
      return data as Playbook
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePlaybook(id: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await client
        .from('playbooks')
        .delete()
        .eq('id', id)

      if (err) throw err
      playbooks.value = playbooks.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    playbooks,
    loading,
    error,
    fetchPlaybooks,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
  }
}
