export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const isAuthRoute = to.path.startsWith('/auth')
  const isPublicRoute = to.path.startsWith('/shared/')

  if (!user.value && !isAuthRoute && !isPublicRoute) {
    return navigateTo('/auth/login')
  }

  if (user.value && isAuthRoute) {
    return navigateTo('/')
  }
})
