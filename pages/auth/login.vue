<template>
  <div class="auth-page">
    <header class="mb-10">
      <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
        Welcome back
      </h1>
      <p class="mt-2 text-muted-foreground text-sm sm:text-base">
        Sign in to your account to continue.
      </p>
    </header>

    <form @submit.prevent="handleLogin" class="space-y-5">
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
      <div class="space-y-2">
        <Label for="password" class="text-foreground font-medium">Password</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
          autocomplete="current-password"
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
          Signing in...
        </span>
        <span v-else>Sign in</span>
      </Button>
    </form>

    <p class="mt-8 text-center text-sm text-muted-foreground">
      Don’t have an account?
      <NuxtLink to="/auth/signup" class="font-medium text-primary hover:underline ml-1">
        Sign up
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const submitting = ref(false)

async function handleLogin() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const { error } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
    await navigateTo('/')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>
