export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const isAuthRoute = to.path.startsWith('/auth')

  if (!user.value && !isAuthRoute) {
    return navigateTo('/auth/login')
  }

  if (user.value && isAuthRoute) {
    return navigateTo('/')
  }
})
