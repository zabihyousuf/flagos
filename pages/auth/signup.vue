<template>
  <div class="auth-page">
    <header class="mb-8">
      <h1 class="font-display font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
        Create account
      </h1>
      <p class="mt-2 text-muted-foreground text-sm">
        Get started with FlagLab.
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
      <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        Back to sign in
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Role picker -->
      <div class="role-picker">
        <button
          type="button"
          class="role-card"
          :class="{ active: accountType === 'manager' }"
          @click="accountType = 'manager'; inviteToken = null; inviteTeamName = null"
        >
          <Clipboard class="role-card-icon" />
          <span class="role-card-label">Coach</span>
          <span class="role-card-desc">Create and manage teams, playbooks, and rosters</span>
        </button>
        <button
          type="button"
          class="role-card"
          :class="{ active: accountType === 'player' }"
          @click="accountType = 'player'"
        >
          <User class="role-card-icon" />
          <span class="role-card-label">Player</span>
          <span class="role-card-desc">Join a team, view shared playbooks, and create plays</span>
        </button>
      </div>

      <!-- Player: invite link paste -->
      <div v-if="accountType === 'player'" class="mt-4 space-y-3">
        <!-- Linked invite success banner -->
        <div v-if="inviteToken && inviteTeamName" class="invite-linked-banner">
          <div class="flex items-center gap-2">
            <span class="text-green-600">✓</span>
            <span class="text-sm font-medium text-foreground">Invite linked — joining <strong>{{ inviteTeamName }}</strong></span>
          </div>
          <button type="button" class="text-xs text-muted-foreground hover:text-foreground" @click="clearInvite">Remove</button>
        </div>

        <!-- Paste invite link input -->
        <div v-else class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Have an invite link?</label>
          <div class="relative">
            <Input
              v-model="inviteLinkInput"
              type="text"
              placeholder="Paste your invite link here"
              :disabled="validatingInvite"
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors pr-24"
              @paste="onInvitePaste"
              @keyup.enter="validateInviteLink"
            />
            <button
              v-if="inviteLinkInput.trim()"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              :disabled="validatingInvite"
              @click="validateInviteLink"
            >
              <span v-if="validatingInvite" class="inline-flex items-center gap-1">
                <span class="size-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Checking…
              </span>
              <span v-else>Use link</span>
            </button>
          </div>
          <p v-if="inviteLinkError" class="text-xs text-destructive">{{ inviteLinkError }}</p>
          <p v-else class="text-xs text-muted-foreground">Your coach's invite sets up your team membership automatically.</p>
        </div>
      </div>

      <!-- Signup form -->
      <form @submit.prevent="handleSignup" class="space-y-5 mt-6">
        <div class="space-y-2">
          <Label for="display_name" class="text-foreground font-medium">Display name</Label>
          <Input
            id="display_name"
            v-model="displayName"
            type="text"
            :placeholder="accountType === 'manager' ? 'e.g. Coach Smith' : 'e.g. Alex Johnson'"
            required
            class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
          />
        </div>
        <div class="space-y-2">
          <Label for="email" class="text-foreground font-medium">Email</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            :placeholder="inviteToken ? '' : 'you@example.com'"
            :readonly="!!inviteToken"
            required
            autocomplete="email"
            class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            :class="{ 'opacity-60 cursor-default': !!inviteToken }"
          />
          <p v-if="inviteToken" class="text-xs text-muted-foreground">Email is set by your invite and cannot be changed.</p>
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

        <!-- Coach-only fields -->
        <template v-if="accountType === 'manager'">
          <div class="space-y-2">
            <Label class="text-foreground font-medium">Format</Label>
            <div class="h-11 bg-muted/40 border border-border rounded-md flex items-center px-3 text-sm text-foreground font-medium">
              5v5
            </div>
            <p class="text-xs text-muted-foreground">FlagOS is optimized for 5v5 flag football.</p>
          </div>
          <div class="space-y-2">
            <Label for="team_name" class="text-foreground font-medium">
              Team name <span class="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="team_name"
              v-model="teamName"
              type="text"
              placeholder="e.g. Hawks 12U"
              class="h-11 bg-muted/40 border-border focus:bg-background transition-colors"
            />
            <p class="text-xs text-muted-foreground">We'll create this team for you so you can start adding players right away.</p>
          </div>
        </template>

        <p v-if="errorMsg" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {{ errorMsg }}
        </p>

        <Button type="submit" class="w-full h-11 font-semibold text-base" :disabled="submitting">
          <span v-if="submitting" class="inline-flex items-center gap-2">
            <span class="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Creating account…
          </span>
          <span v-else>Create account</span>
        </Button>
      </form>

      <p class="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?
        <NuxtLink to="/auth/login" class="font-medium text-primary hover:underline ml-1">Sign in</NuxtLink>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Clipboard, User } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()

const accountType = ref<'manager' | 'player'>('manager')
const displayName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const starterCount = ref<string>('5')
const teamName = ref('')
const errorMsg = ref('')
const submitting = ref(false)
const success = ref(false)

// Invite link flow (players)
const inviteLinkInput = ref('')
const inviteToken = ref<string | null>(null)
const inviteTeamName = ref<string | null>(null)
const inviteLinkError = ref<string | null>(null)
const validatingInvite = ref(false)

function extractToken(raw: string): string | null {
  raw = raw.trim()
  // Full URL like https://app.com/join/abc123
  const urlMatch = raw.match(/\/join\/([a-zA-Z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]
  // Bare token
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw
  return null
}

async function validateInviteLink() {
  const token = extractToken(inviteLinkInput.value)
  if (!token) {
    inviteLinkError.value = 'That doesn\'t look like a valid invite link.'
    return
  }
  validatingInvite.value = true
  inviteLinkError.value = null
  try {
    const data = await $fetch<{ email: string; team: { name: string } | null; player: { name: string } | null }>(`/api/invites/${token}/validate`)
    inviteToken.value = token
    inviteTeamName.value = data.team?.name ?? null
    email.value = data.email
    if (data.player?.name && !displayName.value) displayName.value = data.player.name
    inviteLinkInput.value = ''
  } catch (e: any) {
    const msg = e.data?.statusMessage ?? e.message ?? 'Invalid invite'
    if (msg.includes('expired')) inviteLinkError.value = 'This invite link has expired.'
    else if (msg.includes('used')) inviteLinkError.value = 'This invite link has already been used.'
    else inviteLinkError.value = 'Invalid invite link. Ask your coach for a new one.'
  } finally {
    validatingInvite.value = false
  }
}

function onInvitePaste(e: ClipboardEvent) {
  const pasted = e.clipboardData?.getData('text') ?? ''
  if (extractToken(pasted)) {
    inviteLinkInput.value = pasted
    nextTick(() => validateInviteLink())
  }
}

function clearInvite() {
  inviteToken.value = null
  inviteTeamName.value = null
  email.value = ''
  inviteLinkInput.value = ''
  inviteLinkError.value = null
}

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
      account_type: accountType.value,
    }
    if (accountType.value === 'manager') {
      metadata.preferred_starter_count = Math.min(8, Math.max(5, parseInt(starterCount.value, 10) || 5))
      const name = teamName.value?.trim()
      if (name) metadata.preferred_team_name = name
    }

    // If player has a linked invite, redirect to the join page after email confirmation
    const redirectTo = inviteToken.value
      ? `${window.location.origin}/join/${inviteToken.value}`
      : `${window.location.origin}/auth/login`

    const { error } = await client.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: metadata,
        emailRedirectTo: redirectTo,
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

<style scoped>
/* ── Role picker ───────────────────────────────────────────────── */
.role-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-card);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}

.role-card:hover {
  border-color: var(--color-primary);
}

.role-card.active {
  border-color: var(--color-primary);
  background: color-mix(in oklch, var(--color-primary) 6%, transparent);
}

.role-card-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
}

.role-card-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
}

.role-card-desc {
  font-size: 11px;
  color: var(--color-muted-foreground);
  line-height: 1.4;
}

/* ── Invite linked banner ──────────────────────────────────────── */
.invite-linked-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklch, #22c55e 40%, transparent);
  background: color-mix(in oklch, #22c55e 8%, transparent);
}
</style>
