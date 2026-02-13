const searchOpen = ref(false)

export function useAppSearch() {
  function open() {
    searchOpen.value = true
  }

  function close() {
    searchOpen.value = false
  }

  return {
    searchOpen,
    open,
    close,
  }
}
