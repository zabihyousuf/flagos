<template>
  <div class="flex flex-col h-full min-h-0">
    <div
      v-if="!hasSimulationAccess"
      class="flex flex-1 flex-col items-center justify-center p-8 text-center"
    >
      <h2 class="text-2xl font-semibold tracking-tight font-display mb-2">Upgrade to Pro</h2>
      <p class="text-muted-foreground max-w-md mb-6">
        Engine Picks is available on Pro. Upgrade to get daily auto-drafted plays tailored to your roster.
      </p>
      <NuxtLink to="/settings?tab=billing">
        <Button>Upgrade to Pro</Button>
      </NuxtLink>
    </div>
    <template v-else>
    <div class="px-4 pt-4 lg:px-6 lg:pt-6">
      <h2 class="text-2xl font-semibold tracking-tight font-display">Engine Picks</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Each day, the engine will auto-draft three plays tailored to your current starters. This view is a preview of what that experience will look like.
      </p>
    </div>

    <div class="flex-1 min-h-0 px-4 pb-6 lg:px-6 lg:pb-8">
      <div class="mt-4 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground max-w-xl">
        Coming soon — this feature is disabled for now. Once live, these plays will refresh daily based on your latest roster and recent performance.
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3 max-w-6xl">
        <article
          v-for="slot in sampleSlots"
          :key="slot.id"
          class="rounded-xl border border-border bg-card/80 p-4 flex flex-col gap-3"
        >
          <header class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Engine pick {{ slot.id }}
              </p>
              <h3 class="text-sm font-semibold leading-snug">
                {{ slot.title }}
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                Optimized for {{ slot.context }}
              </p>
            </div>
            <span class="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              +{{ slot.lift }}% est. lift
            </span>
          </header>

          <div class="rounded-lg border border-border/60 bg-background/40 h-28 flex items-center justify-center text-[11px] text-muted-foreground">
            <span class="px-3 text-center">
              Compact play preview will render here — mirrored from your canvas, with engine annotations.
            </span>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              <span>On-schedule success: <span class="text-foreground font-medium">{{ slot.successRate }}%</span></span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
              <span>Avg yards: <span class="text-foreground font-medium">{{ slot.yards }} yds</span></span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              <span>Best vs: <span class="text-foreground font-medium">{{ slot.bestVs }}</span></span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
              <span>Weak vs: <span class="text-foreground font-medium">{{ slot.weakVs }}</span></span>
            </div>
          </dl>

          <p class="text-[11px] leading-snug text-muted-foreground border-l border-border/60 pl-2 mt-1">
            {{ slot.blurb }}
          </p>
        </article>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { hasSimulationAccess } = usePlanAccess()
const sampleSlots = [
  {
    id: 1,
    title: 'Trips flood vs soft zone',
    context: 'early downs, middle of the field',
    lift: 18,
    successRate: 71,
    yards: 11.4,
    bestVs: '2-high match',
    weakVs: 'press-man with rusher',
    blurb: 'Engine leans on layered routes to stress underneath defenders while keeping the primary read on your highest-rated separator.',
  },
  {
    id: 2,
    title: 'Bunch boundary rub',
    context: '3rd & short, boundary hash',
    lift: 23,
    successRate: 78,
    yards: 6.3,
    bestVs: 'off-man leverage',
    weakVs: 'aggressive press with safety help',
    blurb: 'Designed to create a free release for your most reliable hands in traffic, with a built-in hot answer vs pressure.',
  },
  {
    id: 3,
    title: 'Mirror smash with choice',
    context: 'red zone, wide hash',
    lift: 16,
    successRate: 64,
    yards: 9.1,
    bestVs: 'single-high zone',
    weakVs: 'bracketed slot defender',
    blurb: 'Pairs your QB’s best timing concepts with option routes that adapt to leverage without adding new installs to your playbook.',
  },
]
</script>

