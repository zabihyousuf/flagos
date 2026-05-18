export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const isAuthRoute = to.path.startsWith('/auth')
  const isPublicRoute =
    to.path.startsWith('/shared/') ||
    to.path.startsWith('/join/') ||
    to.path === '/'

  if (!user.value && !isAuthRoute && !isPublicRoute) {
    return navigateTo('/auth/login')
  }

  if (user.value && isAuthRoute) {
    // Preserve invite redirect — login/signup with ?invite=token should land back on the join page
    const invite = to.query.invite as string | undefined
    if (invite) return navigateTo(`/join/${invite}`)
    return navigateTo('/dashboard')
  }

  if (user.value && to.path === '/') {
    return navigateTo('/dashboard')
  }
})
