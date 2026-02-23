<template>
  <div class="auth-page">
    <header class="mb-10">
      <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
        {{ title }}
      </h1>
      <p class="mt-2 text-muted-foreground text-sm sm:text-base">
        {{ message }}
      </p>
    </header>
    <div class="pt-4">
      <NuxtLink
        to="/auth/login"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Go to sign in
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()
const route = useRoute()

const title = ref('Confirming...')
const message = ref('Please wait while we verify your email.')

onMounted(async () => {
  const tokenHash = route.query.token_hash as string
  const type = route.query.type as string

  if (!tokenHash || !type) {
    title.value = 'Invalid link'
    message.value = 'This confirmation link is invalid or has expired.'
    return
  }

  try {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })
    if (error) throw error
    title.value = 'Email confirmed!'
    message.value = 'Your account has been verified. Redirecting...'
    setTimeout(() => navigateTo('/dashboard'), 1500)
  } catch (e: any) {
    title.value = 'Confirmation failed'
    message.value = e.message ?? 'Something went wrong.'
  }
})
</script>
