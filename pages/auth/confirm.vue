<template>
  <Card class="w-full max-w-sm">
    <CardHeader class="text-center">
      <CardTitle class="text-xl font-display">{{ title }}</CardTitle>
      <CardDescription>{{ message }}</CardDescription>
    </CardHeader>
    <CardFooter class="justify-center">
      <NuxtLink to="/auth/login" class="text-sm text-primary hover:underline">Go to login</NuxtLink>
    </CardFooter>
  </Card>
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
    setTimeout(() => navigateTo('/'), 1500)
  } catch (e: any) {
    title.value = 'Confirmation failed'
    message.value = e.message
  }
})
</script>
