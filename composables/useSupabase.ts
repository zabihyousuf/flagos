import type { Database } from '~/types/database.types'

export function useSupabaseDB() {
  const client = useSupabaseClient<Database>()
  return client
}
