export function useBreadcrumbs() {
  const breadcrumbTitle = useState<string | null>('breadcrumb-title', () => null)

  function setTitle(title: string | null) {
    breadcrumbTitle.value = title
  }

  const route = useRoute()
  watch(
    () => route.fullPath,
    () => {
      breadcrumbTitle.value = null
    },
  )

  return { breadcrumbTitle: readonly(breadcrumbTitle), setTitle }
}
