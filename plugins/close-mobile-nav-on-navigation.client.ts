/**
 * Close the mobile nav drawer after every completed client-side navigation.
 * Relying on a watch inside AppSidebar misses layout switches (e.g. default → canvas):
 * the new layout mounts with the final URL already set, so route.fullPath never "changes"
 * for that instance while useState keeps the drawer open.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { close } = useAppNav()
  router.afterEach(() => {
    close()
  })
})
