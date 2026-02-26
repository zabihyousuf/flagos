<template>
  <div class="auth-layout min-h-screen flex flex-col">
    <div class="flex flex-1 min-h-0 flex-col lg:flex-row">
      <!-- Left: Brand + visual -->
      <div class="auth-brand flex-1 flex flex-col p-8 lg:p-12 text-white relative overflow-hidden">
        <div class="auth-brand-pattern" aria-hidden="true" />
        <div class="relative z-10 shrink-0">
          <NuxtLink to="/" class="inline-flex items-center gap-3 group">
            <span class="font-copernicus font-bold text-xl tracking-tight">FlagLab</span>
          </NuxtLink>
        </div>
        <div class="relative z-10 flex-1 flex items-center justify-center text-center lg:text-left">
          <div>
            <p class="font-display font-semibold text-3xl lg:text-4xl xl:text-5xl leading-tight max-w-md">
              Your one platform for all things flag football!
            </p>
            <p class="mt-4 text-white/80 text-sm lg:text-base max-w-sm mx-auto lg:mx-0">
              Draw offensive plays and defensive coverages. Build playbooks, manage your roster, and share plays with your team all in one place.
            </p>
          </div>
        </div>
        <div class="relative z-10 shrink-0 hidden lg:block">
          <div class="flex gap-6 text-xs text-white/60 uppercase tracking-widest">
            <span>Plays</span>
            <span>Teams</span>
            <span>Playbooks</span>
          </div>
        </div>
      </div>

      <!-- Right: Form area (scrollable; centered for login, top-aligned for longer forms like signup) -->
      <div
        class="auth-form flex-1 min-h-0 overflow-y-auto flex justify-center"
        :class="isCompactAuth ? 'items-center' : 'items-start'"
      >
        <div class="w-full max-w-[400px] p-6 sm:p-8 lg:p-12 py-8 sm:py-10 lg:py-12 shrink-0">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isCompactAuth = computed(() =>
  ['/auth/login', '/auth/forgot-password', '/auth/reset-password'].includes(route.path)
)
</script>

<style scoped>
.auth-layout {
  --auth-brand-start: oklch(0.22 0.04 240);
  --auth-brand-end: oklch(0.18 0.06 200);
}

@media (min-width: 1024px) {
  .auth-layout {
    height: 100vh;
    overflow: hidden;
  }
}

.auth-brand {
  background: linear-gradient(165deg, var(--auth-brand-start) 0%, var(--auth-brand-end) 100%);
  min-height: 40vh;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .auth-brand {
    min-height: 100vh;
    height: 100vh;
    max-width: 50%;
    position: sticky;
    top: 0;
  }
}

.auth-brand-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}

.auth-form {
  box-shadow: -8px 0 24px rgba(0,0,0,0.06);
  background: var(--color-background);
}

@media (min-width: 1024px) {
  .auth-form {
    box-shadow: -12px 0 32px rgba(0,0,0,0.08);
  }
}
</style>
