<template>
  <Card class="w-full max-w-sm">
    <CardHeader class="text-center">
      <img src="/logo.svg" alt="FlagOS" class="w-12 h-12 mx-auto mb-2 rounded-lg" />
      <CardTitle class="text-2xl font-display">Create account</CardTitle>
      <CardDescription>Get started with FlagOS</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="success" class="text-center space-y-3">
        <p class="text-sm text-foreground">Check your email for a confirmation link to complete signup.</p>
        <NuxtLink to="/auth/login" class="text-sm text-primary hover:underline">Back to login</NuxtLink>
      </div>
      <form v-else @submit.prevent="handleSignup" class="space-y-4">
        <div class="space-y-2">
          <Label for="display_name">Display name</Label>
          <Input
            id="display_name"
            v-model="displayName"
            type="text"
            placeholder="Coach Smith"
            required
          />
        </div>
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
            placeholder="At least 6 characters"
            required
            autocomplete="new-password"
            minlength="6"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>
        <Button type="submit" class="w-full" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create account' }}
        </Button>
      </form>
    </CardContent>
    <CardFooter v-if="!success" class="justify-center">
      <p class="text-sm text-muted-foreground">
        Already have an account?
        <NuxtLink to="/auth/login" class="text-primary hover:underline">Sign in</NuxtLink>
      </p>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()

const displayName = ref('')
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const submitting = ref(false)
const success = ref(false)

async function handleSignup() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const { error } = await client.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { display_name: displayName.value },
      },
    })
    if (error) throw error
    success.value = true
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>
