// Single source of truth for responsive breakpoints.
// mobile: < 768px | tablet: 768–1023px | desktop: ≥ 1024px
// SSR-safe: defaults to desktop (most likely context for SSR); corrects on mount.
export function useBreakpoint() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true)

  function update() {
    const w = window.innerWidth
    isMobile.value = w < 768
    isTablet.value = w >= 768 && w < 1024
    isDesktop.value = w >= 1024
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { isMobile, isTablet, isDesktop }
}
