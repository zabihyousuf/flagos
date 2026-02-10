<template>
  <Card class="w-full max-w-sm">
    <CardHeader class="text-center">
      <img src="/logo.svg" alt="FlagOS" class="w-12 h-12 mx-auto mb-2 rounded-lg" />
      <CardTitle class="text-2xl font-display">Welcome back</CardTitle>
      <CardDescription>Sign in to your account</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="Your password"
            required
            autocomplete="current-password"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>
        <Button type="submit" class="w-full" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </Button>
      </form>
    </CardContent>
    <CardFooter class="justify-center">
      <p class="text-sm text-muted-foreground">
        Don't have an account?
        <NuxtLink to="/auth/signup" class="text-primary hover:underline">Sign up</NuxtLink>
      </p>
    </CardFooter>
  </Card>
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
    errorMsg.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>
