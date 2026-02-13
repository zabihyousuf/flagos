/**
 * Global composable to manage the Quick Play dialog state.
 * Registers ⌘N / Ctrl+N keyboard shortcut.
 * Any component can call `openQuickPlay()` to trigger it.
 */
const isQuickPlayOpen = ref(false)

export function useQuickPlay() {
  const router = useRouter()

  function open() {
    router.push('/plays/new')
  }

  function close() {
    isQuickPlayOpen.value = false
  }

  return {
    isOpen: isQuickPlayOpen,
    open,
    close,
  }
}
