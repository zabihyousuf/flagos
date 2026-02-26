<template>
  <div class="auth-page">
    <template v-if="!ready">
      <header class="mb-10">
        <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
          {{ title }}
        </h1>
        <p class="mt-2 text-muted-foreground text-sm sm:text-base">
          {{ message }}
        </p>
      </header>
      <div v-if="errorMsg" class="mt-4">
        <NuxtLink
          to="/auth/forgot-password"
          class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Request a new reset link
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <header class="mb-10">
        <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
          Set new password
        </h1>
        <p class="mt-2 text-muted-foreground text-sm sm:text-base">
          Enter and confirm your new password below.
        </p>
      </header>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div class="space-y-2">
          <Label for="password" class="text-foreground font-medium">New password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            minlength="6"
            class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
          />
        </div>
        <div class="space-y-2">
          <Label for="confirmPassword" class="text-foreground font-medium">Confirm password</Label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            minlength="6"
            class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
          />
        </div>

        <p v-if="errorMsg" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {{ errorMsg }}
        </p>

        <Button
          type="submit"
          class="w-full h-11 font-semibold text-base"
          :disabled="submitting"
        >
          <span v-if="submitting" class="inline-flex items-center gap-2">
            <span class="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Updating...
          </span>
          <span v-else>Update password</span>
        </Button>
      </form>
    </template>

    <p class="mt-8 text-center text-sm text-muted-foreground">
      <NuxtLink to="/auth/login" class="font-medium text-primary hover:underline">
        Back to sign in
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()
const route = useRoute()

const title = ref('Loading...')
const message = ref('Verifying your reset link.')
const errorMsg = ref('')
const ready = ref(false)
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)

onMounted(async () => {
  const tokenHash = route.query.token_hash as string
  const type = route.query.type as string

  // Supabase can redirect with token_hash + type in query (e.g. from email link)
  if (tokenHash && type) {
    try {
      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'recovery',
      })
      if (error) throw error
      ready.value = true
      return
    } catch (e: any) {
      title.value = 'Invalid or expired link'
      message.value = 'This password reset link is invalid or has expired.'
      errorMsg.value = e.message ?? 'Please request a new link.'
      return
    }
  }

  // Alternatively Supabase may put tokens in the URL hash; client will fire PASSWORD_RECOVERY
  const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      title.value = ''
      message.value = ''
      ready.value = true
    }
  })

  // If we have no token and no recovery event after a short wait, show error
  await new Promise(resolve => setTimeout(resolve, 2000))
  if (!ready.value) {
    title.value = 'Reset link required'
    message.value = 'Open the link from your password reset email to set a new password.'
  }

  onUnmounted(() => subscription.unsubscribe())
})

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters.'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    const { error } = await client.auth.updateUser({ password: password.value })
    if (error) throw error
    await navigateTo('/dashboard')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>
