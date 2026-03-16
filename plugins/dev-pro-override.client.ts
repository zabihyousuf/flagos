export default defineNuxtPlugin(() => {
  const state = useState<boolean>('dev-pro-override', () => false)
  try {
    state.value = localStorage.getItem('flagos-dev-pro-override') === '1'
  } catch {
    // ignore
  }
})
