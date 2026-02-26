<template>
  <div class="auth-page">
    <header class="mb-10">
      <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
        Forgot password?
      </h1>
      <p class="mt-2 text-muted-foreground text-sm sm:text-base">
        Enter your email and we’ll send you a link to reset your password.
      </p>
    </header>

    <form v-if="!sent" @submit.prevent="handleSubmit" class="space-y-5">
      <div class="space-y-2">
        <Label for="email" class="text-foreground font-medium">Email</Label>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
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
          Sending...
        </span>
        <span v-else>Send reset link</span>
      </Button>
    </form>

    <div v-else class="space-y-5">
      <p class="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
        If an account exists for <strong class="text-foreground">{{ email }}</strong>, we’ve sent a password reset link. Check your inbox and spam folder.
      </p>
      <Button
        variant="outline"
        class="w-full h-11"
        @click="sent = false; errorMsg = ''"
      >
        Send to a different email
      </Button>
    </div>

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

const email = ref('')
const errorMsg = ref('')
const submitting = ref(false)
const sent = ref(false)

async function handleSubmit() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : ''
    const { error } = await client.auth.resetPasswordForEmail(email.value, {
      redirectTo,
    })
    if (error) throw error
    sent.value = true
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>
