export function useSupabaseDB() {
  const client = useSupabaseClient()
  return client
}
