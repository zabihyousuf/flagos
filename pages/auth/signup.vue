<template>
  <div class="auth-page">
    <header class="mb-10">
      <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
        Create account
      </h1>
      <p class="mt-2 text-muted-foreground text-sm sm:text-base">
        Get started with FlagLab. One playbook to rule them all.
      </p>
      <p class="mt-3 text-muted-foreground text-xs max-w-[360px]">
        We ask for your name, role, number of players, and optional team so we can personalize your experience and set up your first team if you’d like.
      </p>
    </header>

    <!-- Success state -->
    <div
      v-if="success"
      class="rounded-2xl border border-border bg-muted/30 p-8 text-center space-y-5"
    >
      <div class="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h2 class="font-display font-semibold text-lg text-foreground">Check your email</h2>
        <p class="mt-2 text-sm text-muted-foreground max-w-[280px] mx-auto">
          We sent a confirmation link to <strong class="text-foreground">{{ email }}</strong>. Click it to activate your account.
        </p>
      </div>
      <NuxtLink
        to="/auth/login"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Back to sign in
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </NuxtLink>
    </div>

    <!-- Signup form -->
    <form v-else @submit.prevent="handleSignup" class="space-y-5">
      <div class="space-y-2">
        <Label for="display_name" class="text-foreground font-medium">Display name</Label>
        <Input
          id="display_name"
          v-model="displayName"
          type="text"
          placeholder="e.g. Coach Smith"
          required
          class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
        />
        <p class="text-xs text-muted-foreground">So we can greet you and use it in your playbook.</p>
      </div>
      <div class="space-y-2">
        <Label for="role" class="text-foreground font-medium">Role</Label>
        <Select v-model="role" required>
          <SelectTrigger id="role" class="h-11 bg-muted/40 border-border focus:bg-background transition-colors">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">Helps us tailor the app (e.g. coach vs player).</p>
      </div>
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
          placeholder="At least 6 characters"
          required
          autocomplete="new-password"
          minlength="6"
          class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
        />
        <p class="text-xs text-muted-foreground">Minimum 6 characters.</p>
      </div>
      <div class="space-y-2">
        <Label for="password_confirm" class="text-foreground font-medium">Confirm password</Label>
        <Input
          id="password_confirm"
          v-model="passwordConfirm"
          type="password"
          placeholder="Re-enter your password"
          required
          autocomplete="new-password"
          minlength="6"
          class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
        />
      </div>

      <div class="space-y-2">
        <Label for="starter_count" class="text-foreground font-medium">Number of players per side</Label>
        <Select v-model="starterCount" required>
          <SelectTrigger id="starter_count" class="h-11 bg-muted/40 border-border focus:bg-background transition-colors">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="n in [5, 6, 7, 8]" :key="n" :value="String(n)">{{ n }}v{{ n }}</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">Used for play designer formation and roster starters (e.g. 5v5, 7v7). You can change this in Settings.</p>
      </div>

      <div class="space-y-2">
        <Label for="team_name" class="text-foreground font-medium">Team name <span class="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="team_name"
          v-model="teamName"
          type="text"
          placeholder="e.g. Hawks 12U"
          class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
        />
        <p class="text-xs text-muted-foreground">If you add one, we’ll create this team for you so you can start adding players right away.</p>
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
          Creating account...
        </span>
        <span v-else>Create account</span>
      </Button>
    </form>

    <p v-if="!success" class="mt-8 text-center text-sm text-muted-foreground">
      Already have an account?
      <NuxtLink to="/auth/login" class="font-medium text-primary hover:underline ml-1">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()

const displayName = ref('')
const role = ref<string>('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const starterCount = ref<string>('5')
const teamName = ref('')
const errorMsg = ref('')
const submitting = ref(false)
const success = ref(false)

async function handleSignup() {
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Passwords do not match.'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    const metadata: Record<string, unknown> = {
      display_name: displayName.value,
      role: role.value,
      preferred_starter_count: Math.min(8, Math.max(5, parseInt(starterCount.value, 10) || 5)),
    }
    const name = teamName.value?.trim()
    if (name) metadata.preferred_team_name = name

    const { error } = await client.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: metadata,
      },
    })
    if (error) throw error
    success.value = true
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>
