<template>
  <div class="join-page">
    <!-- Loading -->
    <div v-if="loading" class="join-loading">
      <span class="join-spinner" />
      <p class="text-muted-foreground text-sm mt-3">Checking your invite…</p>
    </div>

    <!-- Error states -->
    <div v-else-if="inviteError" class="join-error-card">
      <div class="join-error-icon">
        <XCircle class="w-8 h-8 text-destructive" />
      </div>
      <h2 class="join-error-title">{{ inviteError }}</h2>
      <p class="join-error-body">
        Ask your coach for a new invite link.
      </p>
      <NuxtLink to="/auth/login" class="join-link">
        Sign in to FlagLab
      </NuxtLink>
    </div>

    <!-- Invite valid — already logged in -->
    <template v-else-if="invite && user">
      <div class="join-card">
        <div class="join-team-badge">
          <Users class="w-6 h-6 text-primary" />
        </div>
        <h1 class="join-heading">You're invited!</h1>
        <p class="join-sub">
          Join <strong>{{ invite.team?.name }}</strong> on FlagLab.
        </p>
        <p v-if="invite.team?.description" class="join-desc">
          {{ invite.team.description }}
        </p>

        <p v-if="acceptError" class="join-form-error">{{ acceptError }}</p>

        <Button
          class="join-cta"
          :disabled="accepting"
          @click="acceptInvite"
        >
          <span v-if="accepting" class="inline-flex items-center gap-2">
            <span class="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Joining…
          </span>
          <span v-else>Accept Invitation</span>
        </Button>

        <p class="join-already-member">
          Signed in as <strong>{{ user.email }}</strong>.
          <NuxtLink to="/dashboard" class="join-link">Go to dashboard</NuxtLink>
        </p>
      </div>
    </template>

    <!-- Invite valid — not logged in: signup form -->
    <template v-else-if="invite && !user">
      <div class="join-card">
        <div class="join-team-badge">
          <Users class="w-6 h-6 text-primary" />
        </div>
        <h1 class="join-heading">You're invited!</h1>
        <p class="join-sub">
          Create a free account to join <strong>{{ invite.team?.name }}</strong>.
        </p>

        <!-- Success: email sent -->
        <div v-if="signupDone" class="join-email-sent">
          <p class="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{{ invite.email }}</strong>.
            Click it to activate your account — then come back here to accept the invite.
          </p>
          <NuxtLink :to="`/auth/login?invite=${token}`" class="join-link mt-3 block">
            Already confirmed? Sign in
          </NuxtLink>
        </div>

        <form v-else class="join-form" @submit.prevent="handleSignup">
          <div class="join-field">
            <Label for="join-name">Your name</Label>
            <Input
              id="join-name"
              v-model="displayName"
              type="text"
              placeholder="e.g. Alex Johnson"
              required
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            />
          </div>
          <div class="join-field">
            <Label for="join-email">Email</Label>
            <Input
              id="join-email"
              v-model="signupEmail"
              type="email"
              :placeholder="invite.email"
              required
              autocomplete="email"
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            />
            <p v-if="signupEmail && signupEmail !== invite.email" class="join-email-hint">
              This invite was sent to {{ invite.email }}. Using a different email creates a separate account.
            </p>
          </div>
          <div class="join-field">
            <Label for="join-password">Password</Label>
            <Input
              id="join-password"
              v-model="password"
              type="password"
              placeholder="At least 6 characters"
              required
              autocomplete="new-password"
              minlength="6"
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            />
          </div>
          <div class="join-field">
            <Label for="join-password-confirm">Confirm password</Label>
            <Input
              id="join-password-confirm"
              v-model="passwordConfirm"
              type="password"
              placeholder="Re-enter password"
              required
              autocomplete="new-password"
              minlength="6"
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            />
          </div>

          <p v-if="signupError" class="join-form-error">{{ signupError }}</p>

          <Button type="submit" class="join-cta" :disabled="submitting">
            <span v-if="submitting" class="inline-flex items-center gap-2">
              <span class="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating account…
            </span>
            <span v-else>Create account & join team</span>
          </Button>
        </form>

        <p class="join-signin-link">
          Already have an account?
          <NuxtLink :to="`/auth/login?invite=${token}`" class="join-link">Sign in</NuxtLink>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { XCircle, Users } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const token = computed(() => route.params.token as string)
const client = useSupabaseClient()
const user = useSupabaseUser()
const { playerInheritedPlan } = usePlanAccess()

interface InviteInfo {
  email: string
  expires_at: string
  team: { id: string; name: string; description?: string } | null
  player: { id: string; name: string } | null
}

const invite = ref<InviteInfo | null>(null)
const loading = ref(true)
const inviteError = ref<string | null>(null)

// Signup state
const displayName = ref('')
const signupEmail = ref('')
const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const signupError = ref<string | null>(null)
const signupDone = ref(false)

// Accept state
const accepting = ref(false)
const acceptError = ref<string | null>(null)

// Validate invite on mount
onMounted(async () => {
  try {
    const data = await $fetch<InviteInfo>(`/api/invites/${token.value}/validate`)
    invite.value = data
    signupEmail.value = data.email
    if (data.player?.name) displayName.value = data.player.name
  } catch (e: any) {
    const msg = e.data?.statusMessage ?? e.message ?? 'Invalid invite'
    if (msg.includes('expired')) inviteError.value = 'This invite link has expired.'
    else if (msg.includes('used')) inviteError.value = 'This invite link has already been used.'
    else inviteError.value = 'This invite link is invalid or no longer active.'
  } finally {
    loading.value = false
  }

  // If user is already logged in, try auto-accepting
  if (user.value && invite.value) {
    await acceptInvite()
  }
})

async function acceptInvite() {
  accepting.value = true
  acceptError.value = null
  try {
    const res = await $fetch<{ team_id: string; inherited_plan: string }>(`/api/invites/${token.value}/accept`, {
      method: 'POST',
    })
    if (res.inherited_plan === 'pro') {
      playerInheritedPlan.value = 'pro'
    }
    await navigateTo('/dashboard')
  } catch (e: any) {
    acceptError.value = e.data?.statusMessage ?? 'Failed to join team. Try again.'
  } finally {
    accepting.value = false
  }
}

async function handleSignup() {
  if (password.value !== passwordConfirm.value) {
    signupError.value = 'Passwords do not match.'
    return
  }
  submitting.value = true
  signupError.value = null
  try {
    const { error } = await client.auth.signUp({
      email: signupEmail.value,
      password: password.value,
      options: {
        data: {
          display_name: displayName.value,
          account_type: 'player',
        },
        emailRedirectTo: `${window.location.origin}/join/${token.value}`,
      },
    })
    if (error) throw error
    signupDone.value = true
  } catch (e: any) {
    signupError.value = e.message ?? 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.join-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px 16px;
}

.join-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}

.join-spinner {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.join-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.join-error-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 40px 24px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card);
}

.join-error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--color-destructive) 12%, transparent);
}

.join-error-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-foreground);
}

.join-error-body {
  font-size: 14px;
  color: var(--color-muted-foreground);
}

.join-team-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  margin-bottom: 4px;
}

.join-heading {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
}

.join-sub {
  font-size: 15px;
  color: var(--color-muted-foreground);
  max-width: 320px;
}

.join-desc {
  font-size: 13px;
  color: var(--color-muted-foreground);
  max-width: 320px;
}

.join-form {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.join-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.join-email-hint {
  font-size: 12px;
  color: var(--color-muted-foreground);
}

.join-cta {
  width: 100%;
  height: 44px;
  font-weight: 600;
  font-size: 15px;
}

.join-form-error {
  font-size: 13px;
  color: var(--color-destructive);
  background: color-mix(in oklch, var(--color-destructive) 10%, transparent);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: left;
}

.join-email-sent {
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: color-mix(in oklch, var(--color-primary) 6%, transparent);
}

.join-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
}

.join-link:hover {
  text-decoration: underline;
}

.join-already-member {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin-top: 4px;
}

.join-signin-link {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin-top: 4px;
}
</style>
