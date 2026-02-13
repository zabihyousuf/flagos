<template>
  <div class="auth-layout min-h-screen flex flex-col lg:flex-row">
    <!-- Left: Brand + visual -->
    <div class="auth-brand flex-1 flex flex-col p-8 lg:p-12 text-white relative overflow-hidden">
      <div class="auth-brand-pattern" aria-hidden="true" />
      <div class="relative z-10 shrink-0">
        <NuxtLink to="/" class="inline-flex items-center gap-3 group">
          <img src="/logo.svg" alt="" class="w-10 h-10 rounded-lg opacity-95 group-hover:opacity-100 transition-opacity" />
          <span class="font-copernicus font-bold text-xl tracking-tight">FlagOS</span>
        </NuxtLink>
      </div>
      <div class="relative z-10 flex-1 flex items-center justify-center text-center lg:text-left">
        <div>
          <p class="font-display font-semibold text-3xl lg:text-4xl xl:text-5xl leading-tight max-w-md">
            Draw plays. Build your playbook. Win the flag.
          </p>
          <p class="mt-4 text-white/80 text-sm lg:text-base max-w-sm mx-auto lg:mx-0">
            Design formations, routes, and coverages in one place. Your team’s playbook, simplified.
          </p>
        </div>
      </div>
      <div class="relative z-10 shrink-0 hidden lg:block">
        <div class="flex gap-6 text-xs text-white/60 uppercase tracking-widest">
          <span>Formations</span>
          <span>Routes</span>
          <span>Playbooks</span>
        </div>
      </div>
    </div>

    <!-- Right: Form area -->
    <div class="auth-form flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
      <div class="w-full max-w-[400px]">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  --auth-brand-start: oklch(0.22 0.04 240);
  --auth-brand-end: oklch(0.18 0.06 200);
}

.auth-brand {
  background: linear-gradient(165deg, var(--auth-brand-start) 0%, var(--auth-brand-end) 100%);
  min-height: 40vh;
}

@media (min-width: 1024px) {
  .auth-brand {
    min-height: 100vh;
    max-width: 50%;
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
}

@media (min-width: 1024px) {
  .auth-form {
    box-shadow: -12px 0 32px rgba(0,0,0,0.08);
  }
}
</style>
