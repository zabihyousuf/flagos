// Mobile navigation drawer state.
// Shared across layouts and components via useState so open/close works
// from both the hamburger button (in layouts) and the sidebar close button.
export function useAppNav() {
  const isOpen = useState('flagos-mobile-nav', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, open, close, toggle }
}
