<template>
  <div
    class="flex flex-col h-full min-h-0 bg-background text-foreground overflow-hidden"
    @click="maybeCloseHistoryPanel"
  >
    <!-- Upgrade gate: only when Free (no trial) and not viewing a past job -->
    <div
      v-if="showUpgradeGate"
      class="flex flex-1 flex-col items-center justify-center p-8 text-center"
    >
      <h2 class="text-2xl font-semibold tracking-tight font-display mb-2">Upgrade to Pro</h2>
      <p class="text-muted-foreground max-w-md mb-6">
        Run new simulations with Play Lab on Pro or free trial. Upgrade to run simulations, compare defensive plays, and view replays.
      </p>
      <NuxtLink to="/settings?tab=billing">
        <Button>Upgrade to Pro</Button>
      </NuxtLink>
    </div>
    <template v-else>
    <div class="flex flex-1 min-h-0 min-w-0 flex-col">
      <div class="shrink-0 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-semibold tracking-tight font-display">Play Lab</h2>
              <component
                :is="isFree ? 'button' : 'span'"
                type="button"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors"
                :class="[
                  isPaidPro
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                    : isTrialing
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 cursor-pointer',
                ]"
                @click="isFree && openUpgradeModal()"
              >
                {{ planBadgeLabel }}
              </component>
            </div>
            <p class="text-muted-foreground text-sm mt-1">Simulate plays against defenses and analyze results.</p>
            <div v-if="!isPaidPro" class="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/80 text-muted-foreground"
              >
                500 scenarios · 100 iterations
              </span>
            </div>
          </div>
          <div v-if="awaitingReplays" class="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Waiting for replays…
          </div>
          <Button
            v-if="showReplaysButton"
            variant="secondary"
            size="sm"
            class="shrink-0 h-8 gap-1.5 bg-amber-500/90 hover:bg-amber-500 text-amber-950 border border-amber-600/40 shadow-sm ring-1 ring-amber-300/30"
            @click="replaysModalOpen = true"
          >
            <Film class="w-4 h-4" />
            Replays
            <span class="tabular-nums inline-flex items-center rounded-full bg-amber-950/10 px-2 py-0.5 text-[11px] font-semibold">
              {{ recordingsCount }}
            </span>
          </Button>
        </div>
      </div>
      <div class="flex flex-1 min-h-0 flex-col lg:flex-row gap-4 lg:gap-6 pt-4 lg:pt-5 pb-5 lg:pb-6">
        <div
          class="flex items-stretch gap-0 shrink-0 transition-[width] duration-200 ease-out"
          :class="configRailed ? 'w-12' : 'w-full lg:w-[30%]'"
        >
          <aside
            class="w-full min-w-0 rounded-xl bg-card shadow-md flex flex-col min-h-0"
            @click.stop
          >
            <div v-show="!configRailed" class="p-4 lg:p-6 pb-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 min-w-0 rounded-xl">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Simulation Form</h2>
              <NuxtLink v-if="!isPaidPro" to="/settings?tab=billing">
                <Button variant="outline" size="sm" class="h-6 px-2 text-[10px] font-semibold uppercase tracking-wide">Upgrade</Button>
              </NuxtLink>
            </div>
            <TooltipProvider v-if="job?.jobId">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 shrink-0"
                    @click.stop="configRailed = true"
                  >
                    <PanelLeftClose class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Collapse form</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div class="space-y-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Offensive play</h2>
            <DropdownMenu v-model:open="playDropdownOpen">
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="w-full justify-between font-normal h-9"
                  :disabled="offensivePlays.length === 0 || configLocked"
                >
                  <span class="truncate">
                    {{ selectedPlay ? selectedPlay.name : 'Select an offensive play' }}
                  </span>
                  <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[16rem] p-0" align="start">
                <div class="flex items-center border-b px-2">
                  <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    v-model="playSearchQuery"
                    placeholder="Search plays..."
                    class="border-0 shadow-none focus-visible:ring-0 h-9"
                    @pointerdown.stop
                  />
                </div>
                <div class="max-h-[240px] overflow-y-auto p-1">
                  <button
                    v-for="play in filteredOffensivePlays"
                    :key="play.id"
                    type="button"
                    class="w-full flex flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    @click="selectedPlayId = play.id; playDropdownOpen = false"
                  >
                    <span class="font-medium">{{ play.name }}</span>
                    <span class="text-xs text-muted-foreground">{{ (play as PlayWithPb)._playbookName }} · {{ play.formation || 'Formation' }}</span>
                  </button>
                  <p v-if="filteredOffensivePlays.length === 0" class="px-2 py-4 text-sm text-muted-foreground">No plays match</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div v-if="selectedPlay" class="rounded-lg bg-muted/30 overflow-hidden h-[80px] shadow-sm">
              <PlayPreview :play="selectedPlay" :height="80" />
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Defensive play</h2>
              <span v-if="!hasProAccess" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary uppercase tracking-wide" title="Free trial: 1 play. Pro: multi-select">1 play</span>
            </div>
            <DropdownMenu v-model:open="defenseDropdownOpen">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <DropdownMenuTrigger as-child>
                      <Button
                        variant="outline"
                        class="w-full justify-between font-normal h-9"
                        :disabled="configLocked"
                      >
                        <span class="truncate">
                          {{ hasProAccess
                            ? (selectedDefenseIds.length > 0 ? `${selectedDefenseIds.length} play(s) selected` : 'Select defensive plays')
                            : (selectedDefenseIds[0] ? (defensePlays.find(p => p.id === selectedDefenseIds[0])?.name ?? 'One selected') : 'Select one defensive play')
                          }}
                        </span>
                        <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" class="max-w-xs">
                    <p>{{ hasProAccess ? 'Multi-select: choose one or more defensive plays to run against.' : 'Free trial: select one defensive play. Upgrade to Pro for multiple.' }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent class="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[16rem] p-0" align="start">
                <div class="flex items-center border-b px-2">
                  <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    v-model="defenseSearchQuery"
                    placeholder="Search defensive plays..."
                    class="border-0 shadow-none focus-visible:ring-0 h-9"
                    @pointerdown.stop
                  />
                </div>
                <div class="max-h-[240px] overflow-y-auto p-1">
                  <label
                    v-for="play in filteredDefensePlays"
                    :key="play.id"
                    class="flex items-center gap-2 py-2 px-2 rounded cursor-pointer hover:bg-accent/50"
                  >
                    <Checkbox
                      v-if="hasProAccess"
                      :model-value="selectedDefenseIds.includes(play.id)"
                      @update:model-value="toggleDefense(play.id)"
                    />
                    <input
                      v-else
                      type="radio"
                      name="defense-single-free"
                      :checked="selectedDefenseIds[0] === play.id"
                      class="rounded-full border-input"
                      @change="toggleDefense(play.id)"
                    />
                    <span class="text-sm truncate flex-1">{{ play.name }}</span>
                    <span class="text-xs text-muted-foreground shrink-0">{{ (play as PlayWithPb)._playbookName }}</span>
                  </label>
                  <p v-if="filteredDefensePlays.length === 0" class="px-2 py-4 text-sm text-muted-foreground">
                    {{ defensePlays.length === 0 ? 'No defensive plays. Create one in a playbook first.' : 'No plays match' }}
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div v-if="hasNoDefenseStarters" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
              <p class="text-xs font-medium text-amber-800 dark:text-amber-300">No defensive starters — using base players. <NuxtLink to="/squad" class="underline">Squad</NuxtLink></p>
            </div>

            <div v-if="defenseBasePlayerWarnings.length > 0 && !hasNoDefenseStarters" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
              <p class="text-xs font-medium text-amber-800 dark:text-amber-300">Some slots use base players. <NuxtLink to="/squad" class="underline">Squad</NuxtLink></p>
            </div>

            <div class="space-y-2">
              <span class="text-xs font-medium text-muted-foreground">Attribute tier</span>
              <div class="grid grid-cols-4 gap-1.5">
                <div
                  v-for="tier in attributeTiersOrdered"
                  :key="tier.id"
                  class="flex flex-col items-center gap-0.5"
                >
                  <span class="text-[9px] font-semibold uppercase tracking-wider" :class="(tier.id === 'poor' || tier.id === 'average' || isPaidPro) ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'">
                    {{ isPaidPro ? tier.hint : ((tier.id === 'poor' || tier.id === 'average') ? 'Free trial' : 'Pro') }}
                  </span>
                  <button
                    type="button"
                    class="w-full flex flex-col items-center justify-center gap-0 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors"
                    :class="[
                      attributeTier === tier.id
                        ? 'border-amber-400/60 bg-amber-100 text-amber-800 ring-1 ring-amber-400/50 dark:border-amber-500/70 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/50'
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      (configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))) && 'pointer-events-none opacity-50 cursor-not-allowed'
                    ]"
                    :disabled="configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))"
                    @click="(configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))) || (attributeTier = tier.id)"
                  >
                    {{ tier.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Run configuration</h2>
              <span v-if="!isPaidPro" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wide">500 scenarios · 100 iterations</span>
            </div>
            <div class="space-y-1.5">
              <span class="text-xs font-medium">Scenarios per defense</span>
              <p class="text-[10px] text-muted-foreground leading-snug">Unique game situations (down, distance, field position, coverage) generated per defensive play.{{ nDefensePlays > 1 ? ' Max 1K when multiple defenses selected.' : '' }}</p>
              <div class="flex gap-1.5 items-end flex-wrap">
                <div
                  v-for="n in scenarioOptions"
                  :key="'sc-'+n"
                  class="flex flex-col items-center gap-0.5"
                >
                  <span
                    v-if="!isPaidPro"
                    class="text-[9px] font-semibold uppercase tracking-wider"
                    :class="isScenarioAllowed(n) ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'"
                  >
                    {{ isScenarioAllowed(n) ? 'Free Trial' : 'Pro' }}
                  </span>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                    :class="[
                      !isScenarioAllowed(n) && 'opacity-50 cursor-not-allowed',
                      configLocked && 'pointer-events-none opacity-60',
                      (nDefensePlays > 1 && n > 1000) && 'opacity-50 cursor-not-allowed',
                      nScenarios === n ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400/50 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/50' : isScenarioAllowed(n) ? 'bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground' : 'bg-muted/30 text-muted-foreground'
                    ]"
                    :disabled="configLocked || !isScenarioAllowed(n) || (nDefensePlays > 1 && n > 1000)"
                    @click="isScenarioAllowed(n) && !(nDefensePlays > 1 && n > 1000) && (nScenarios = n, hasSelectedScenarios = true)"
                  >
                    {{ n >= 1000 ? (n / 1000) + 'K' : n }}
                  </button>
                </div>
              </div>
            </div>
            <div class="space-y-1.5">
              <span class="text-xs font-medium">Iterations per scenario</span>
              <p class="text-[10px] text-muted-foreground leading-snug">How many times each scenario is simulated. 30% use smart QB reads, 70% test each receiver individually.</p>
              <div class="flex gap-1.5 items-end flex-wrap">
                <div
                  v-for="n in iterationOptions"
                  :key="n"
                  class="flex flex-col items-center gap-0.5"
                >
                  <span
                    v-if="!isPaidPro"
                    class="text-[9px] font-semibold uppercase tracking-wider"
                    :class="isIterationAllowed(n) ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'"
                  >
                    {{ isIterationAllowed(n) ? 'Free Trial' : 'Pro' }}
                  </span>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                    :class="[
                      !isIterationAllowed(n) && 'opacity-50 cursor-not-allowed',
                      configLocked && 'pointer-events-none opacity-60',
                      nIterations === n ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400/50 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/50' : isIterationAllowed(n) ? 'bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground' : 'bg-muted/30 text-muted-foreground'
                    ]"
                    :disabled="configLocked || !isIterationAllowed(n)"
                    @click="isIterationAllowed(n) && (nIterations = n, hasSelectedIterations.value = true)"
                  >
                    {{ n >= 1e5 ? '100K' : n >= 1e4 ? '10K' : n >= 1e3 ? '1K' : n >= 100 ? '100' : n.toLocaleString() }}
                  </button>
                </div>
              </div>
              <p v-if="!isPaidPro" class="text-xs text-muted-foreground">
                <NuxtLink to="/settings?tab=billing" class="text-primary hover:underline">Upgrade to Pro</NuxtLink> for up to 5K scenarios and 100K iterations.
              </p>
            </div>
            <div
              v-if="hasSelectedScenarios && hasSelectedIterations"
              class="rounded-lg p-2.5 bg-muted/20 shadow-sm space-y-1"
            >
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-muted-foreground">Total simulations</p>
                <p class="text-xs font-semibold">{{ totalSimulations.toLocaleString() }}</p>
              </div>
              <p class="text-[10px] text-muted-foreground">{{ nDefensePlays }} defense{{ nDefensePlays > 1 ? 's' : '' }} &times; {{ nScenarios.toLocaleString() }} scenarios &times; {{ nIterations.toLocaleString() }} iterations &bull; {{ iterationTimeHint }}</p>
            </div>
            <div class="rounded-lg p-2.5 bg-muted/20 shadow-sm">
              <p class="text-xs font-medium text-muted-foreground mb-1">Field settings</p>
              <p class="text-sm">{{ fieldSettings?.field_length ?? 50 }} yd length, {{ fieldSettings?.field_width ?? 25 }} yd width, {{ fieldSettings?.endzone_size ?? 7 }} yd endzones</p>
              <NuxtLink to="/settings" target="_blank" class="text-xs text-primary hover:underline mt-1 inline-block">Edit in Settings</NuxtLink>
            </div>
          </div>

          <div class="space-y-2">
            <ClientOnly>
              <div v-if="job?.engineDown" class="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                The simulation engine is unavailable. Please try again in a moment.
              </div>
            </ClientOnly>
            <div v-if="rosterErrors.length > 0" class="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 space-y-1">
              <p class="text-xs font-medium text-destructive">Offensive roster issues — <NuxtLink to="/squad" class="underline">assign starters in Squad</NuxtLink> first:</p>
              <ul class="space-y-0.5">
                <li v-for="e in rosterErrors" :key="e.canvas_player_id" class="text-xs text-destructive/80">
                  {{ e.position }}: {{ e.message }}
                </li>
              </ul>
            </div>
            <Button
              class="w-full"
              size="lg"
              :disabled="!canRun || job?.status?.state === 'PENDING' || job?.rateLimited || configLocked"
              @click="runSimulation"
            >
              {{ job?.status?.state === 'PENDING' ? 'Starting...' : 'Run Simulation' }}
            </Button>
            <ClientOnly>
              <p v-if="job?.rateLimited && (job?.retryAfterSeconds ?? 0) > 0" class="text-sm text-amber-600 dark:text-amber-500">
                You've submitted too many simulations. Try again in {{ job?.retryAfterSeconds ?? 0 }} seconds.
              </p>
              <p v-else-if="job?.runError" class="text-sm text-destructive">{{ job?.runError }}</p>
            </ClientOnly>
          </div>
        </div>
        <div
          v-if="configRailed"
          class="flex flex-col items-center justify-start gap-2 h-full min-h-[200px] pt-4 pb-4 px-1"
        >
          <Button
            variant="ghost"
            size="icon"
            class="shrink-0"
            title="Expand config"
            @click.stop="configRailed = false"
          >
            <ChevronDown class="h-5 w-5 rotate-[270deg]" />
          </Button>
          <span
            class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap inline-block"
            style="writing-mode: vertical-lr; text-orientation: mixed; transform: rotate(180deg);"
          >
            Simulation form
          </span>
        </div>
          </aside>
        </div>

      <main class="flex-1 min-w-0 flex flex-col bg-background overflow-y-auto min-h-0">
        <EngineStatus />
        <ClientOnly>
        <!-- Loading skeleton when opening a past simulation (only after mount to avoid hydration mismatch) -->
        <template v-if="isClient && props.jobId && jobPageLoading">
          <div class="flex-1 pb-14 space-y-6">
            <section class="flex flex-col sm:flex-row gap-4 items-stretch min-w-0">
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex flex-col gap-3 shadow-md min-w-0 flex-1 space-y-3">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-3 w-48" />
                <div class="flex items-center gap-3 flex-wrap">
                  <Skeleton class="h-3 w-24" />
                  <Skeleton class="h-1.5 flex-1 max-w-[200px] rounded-full" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <Skeleton class="h-14 rounded-lg" />
                  <Skeleton class="h-14 rounded-lg" />
                  <Skeleton class="h-14 rounded-lg" />
                  <Skeleton class="h-14 rounded-lg" />
                </div>
              </div>
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex items-center justify-center shadow-md shrink-0">
                <Skeleton class="h-40 w-40 rounded-full" />
              </div>
            </section>
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              <Skeleton class="rounded-xl h-[200px]" />
              <Skeleton class="rounded-xl h-[200px]" />
              <Skeleton class="rounded-xl h-[160px]" />
              <Skeleton class="rounded-xl h-[200px]" />
            </section>
            <Skeleton class="rounded-xl h-14 w-full" />
          </div>
        </template>

        <template v-else-if="!job?.jobId">
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <svg class="w-20 h-20 text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 class="text-lg font-semibold font-display">Run a simulation to see results</h2>
            <p class="text-sm text-muted-foreground mt-1">Select a play, choose defense, and run.</p>
          </div>
        </template>

        <template v-else-if="job?.status?.state === 'FAILED'">
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p class="text-destructive font-medium">{{ job?.status?.error ?? 'Job failed' }}</p>
            <Button class="mt-4" variant="outline" @click="handleRunAgain">Start over</Button>
          </div>
        </template>

        <template v-else>
          <div class="flex-1 pb-14 space-y-6">
            <!-- Row 1: Status card (left) + Progress circle (right), side by side via flex -->
            <section class="flex flex-col sm:flex-row gap-4 items-stretch min-w-0">
              <!-- Left: play name + description row with action buttons on same row, then progress bar and info -->
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex flex-col gap-3 shadow-md min-w-0 flex-1">
                <!-- Top row: title + description (left), action buttons (right) -->
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                      {{ selectedPlay?.name ?? 'Play' }}
                    </p>
                    <p v-if="!job?.isLoadedResult" class="text-sm text-muted-foreground">
                      {{ job?.status?.progress_label ?? 'Starting simulation…' }}
                    </p>
                    <div v-else class="flex flex-wrap items-center gap-2">
                      <span class="text-sm text-muted-foreground">Completed {{ formatRelativeTime(job?.loadedJobStatus?.completed_at) }}</span>
                      <span class="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived result</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <Button
                      v-if="job?.status?.state === 'RUNNING' || job?.status?.state === 'PENDING'"
                      variant="outline"
                      size="sm"
                      @click="handleCancel"
                    >
                      Cancel
                    </Button>
                    <template v-if="job?.status?.state === 'COMPLETED'">
                      <Button variant="secondary" size="sm" @click="exportResults">Export Results</Button>
                    </template>
                  </div>
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-[11px] text-muted-foreground shrink-0">
                    {{ totalSimsCompleted.toLocaleString() }} of {{ totalSimsTarget.toLocaleString() }} sims complete
                    <span class="opacity-60">({{ scenariosCompleted.toLocaleString() }}/{{ scenariosTotal.toLocaleString() }} scenarios)</span>
                  </span>
                  <div class="h-1.5 rounded-full bg-muted overflow-hidden flex-1 min-w-[80px] max-w-[200px]">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="progressBarStyle"
                    />
                  </div>
                  <span v-if="!job?.isLoadedResult" class="text-[11px] text-muted-foreground shrink-0">{{ formatElapsed(job?.elapsedSeconds ?? 0) }}</span>
                </div>

                <!-- Key stats summary -->
                <div v-if="scenariosCompleted > 0" class="grid grid-cols-2 gap-2 text-center">
                  <div class="rounded-lg bg-muted/40 px-2 py-2">
                    <p class="text-lg font-bold tabular-nums">{{ Math.round(overallCompletionRate) }}%</p>
                    <p class="text-[10px] text-muted-foreground">Completion</p>
                  </div>
                  <div class="rounded-lg bg-muted/40 px-2 py-2">
                    <p class="text-lg font-bold tabular-nums">{{ combinedYardStats ? combinedYardStats.mean.toFixed(1) : '—' }}</p>
                    <p class="text-[10px] text-muted-foreground">Avg Yards</p>
                  </div>
                  <div class="rounded-lg bg-muted/40 px-2 py-2">
                    <p class="text-lg font-bold tabular-nums text-emerald-500">{{ overallTdRate }}%</p>
                    <p class="text-[10px] text-muted-foreground">TD Rate</p>
                  </div>
                  <div class="rounded-lg bg-muted/40 px-2 py-2">
                    <p class="text-lg font-bold tabular-nums text-destructive">{{ overallIntRate }}%</p>
                    <p class="text-[10px] text-muted-foreground">INT Rate</p>
                  </div>
                </div>

                <div
                  v-if="job?.status?.state === 'COMPLETED' && scenariosTotal > 0"
                  class="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary shadow-sm"
                >
                  Complete — {{ totalSimsTarget.toLocaleString() }} sims across {{ scenariosTotal.toLocaleString() }} scenarios
                </div>
                <p
                  v-if="job?.status?.clamped && job?.status?.clamped_iterations != null"
                  class="text-xs text-muted-foreground"
                >
                  Total runs reduced to {{ job?.status?.clamped_iterations?.toLocaleString() }} (server maximum)
                </p>
              </div>

              <!-- Right: circular progress (always next to the card on sm+) -->
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex items-center justify-center shadow-md shrink-0">
                <div class="relative h-40 w-40 shrink-0">
                  <svg viewBox="0 0 120 120" class="h-full w-full">
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" :stop-color="ringColor" />
                        <stop offset="100%" :stop-color="ringColor" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      class="stroke-muted"
                      stroke-width="8"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      :stroke="'url(#confidenceGradient)'"
                      stroke-width="8"
                      fill="none"
                      stroke-linecap="round"
                      :style="confidenceRingStyle"
                    />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p class="text-3xl font-bold tabular-nums">{{ Math.round(displayedSuccessRate) }}%</p>
                    <p class="text-[10px] text-muted-foreground mt-0.5">Completion Rate</p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ confidenceLabel }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Blur AI tactical breakdown -->
            <section
              v-if="job?.status?.state === 'COMPLETED' || job?.loadedJobStatus?.state === 'COMPLETED'"
              class="rounded-xl bg-gradient-to-br from-indigo-500/[0.06] via-card/80 to-violet-500/[0.06] border border-indigo-500/10 shadow-md overflow-hidden"
            >
              <div class="px-5 py-4 lg:px-6">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10">
                      <Sparkles class="w-4 h-4 text-indigo-500" :class="{ 'animate-pulse': insightsStreaming }" />
                    </div>
                    <div>
                      <h3 class="text-sm font-semibold">
                        Blur AI
                        <span v-if="insightsStreaming && insightsData.length === 0" class="text-xs font-normal text-muted-foreground ml-1.5">Analyzing...</span>
                      </h3>
                      <p class="text-[11px] text-muted-foreground mt-0.5">Tactical breakdown from your simulation</p>
                    </div>
                  </div>
                  <button
                    v-if="insightsData.length > 0 && !insightsStreaming"
                    type="button"
                    class="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    @click="fetchInsights(true)"
                  >
                    Regenerate
                  </button>
                </div>

                <!-- Initial loading skeleton (before any items arrive) -->
                <div v-if="insightsLoading && insightsData.length === 0" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div v-for="i in 5" :key="i" class="rounded-xl px-4 py-3.5 space-y-2 bg-muted/20 border border-border/20">
                    <div class="flex items-center gap-2">
                      <Skeleton class="h-5 w-5 rounded" />
                      <Skeleton class="h-3.5 w-24" />
                    </div>
                    <Skeleton class="h-3 w-full max-w-[220px]" />
                  </div>
                </div>

                <!-- Error state -->
                <p v-else-if="insightsError && insightsData.length === 0" class="mt-3 text-xs text-destructive">
                  {{ insightsError }}
                  <button type="button" class="underline ml-1" @click="fetchInsights">Retry</button>
                </p>

                <!-- Streamed / completed insights list -->
                <div v-if="insightsData.length > 0" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="(insight, idx) in insightsData"
                    :key="idx"
                    class="rounded-xl px-4 py-3.5 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    :class="{
                      'bg-emerald-500/[0.07] border border-emerald-500/10': insight.sentiment === 'positive',
                      'bg-rose-500/[0.07] border border-rose-500/10': insight.sentiment === 'negative',
                      'bg-muted/40 border border-border/40': insight.sentiment === 'neutral',
                    }"
                    :style="{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-lg leading-none">{{ insight.icon }}</span>
                      <p class="text-xs font-semibold leading-tight">{{ insight.title }}</p>
                    </div>
                    <p class="text-[11px] leading-relaxed text-muted-foreground">{{ insight.detail }}</p>
                  </div>
                  <!-- Skeleton placeholder for remaining streaming items -->
                  <template v-if="insightsStreaming && insightsData.length < 6">
                    <div
                      v-for="i in Math.min(6 - insightsData.length, 3)"
                      :key="'skel-' + i"
                      class="rounded-xl px-4 py-3.5 space-y-2 bg-muted/20 border border-border/20 animate-pulse"
                    >
                      <div class="flex items-center gap-2">
                        <Skeleton class="h-5 w-5 rounded" />
                        <Skeleton class="h-3.5 w-24" />
                      </div>
                      <Skeleton class="h-3 w-full max-w-[220px]" />
                    </div>
                  </template>
                </div>
              </div>
            </section>

            <!-- PART 2: Breakdown panels (more space for data) -->
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              <div class="rounded-xl bg-card/80 p-5 lg:p-6 space-y-4 shadow-md">
                <h3 class="text-sm font-medium">By Down</h3>
                <div class="space-y-2">
                  <BreakdownRow
                    v-for="row in downRows"
                    :key="row.key"
                    :label="row.label"
                    :stat="row.stat"
                  />
                </div>
              </div>

              <div class="rounded-xl bg-card/80 p-5 lg:p-6 space-y-4 shadow-md">
                <h3 class="text-sm font-medium">By Field Zone</h3>
                <div class="space-y-2">
                  <BreakdownRow
                    v-for="row in fieldZoneRows"
                    :key="row.key"
                    :label="row.label"
                    :stat="row.stat"
                  />
                </div>
              </div>

              <div class="rounded-xl bg-card/80 p-4 space-y-3 shadow-md">
                <h3 class="text-sm font-medium">Vs Defense</h3>
                <div v-if="defenseRows.length === 0" class="text-xs text-muted-foreground">No results yet</div>
                <div v-else class="space-y-2">
                  <BreakdownRow
                    v-for="row in defenseRows"
                    :key="row.key"
                    :label="row.label"
                    :stat="row.stat"
                  />
                </div>
              </div>

              <div class="rounded-xl bg-card/80 p-5 lg:p-6 space-y-4 shadow-md">
                <h3 class="text-sm font-medium">By Receiver</h3>
                <div v-if="receiverRows.length === 0" class="text-xs text-muted-foreground">No receiver data yet</div>
                <div v-else class="space-y-3">
                  <div v-for="row in receiverRows" :key="row.receiver_id" class="space-y-1">
                    <div class="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span class="font-medium text-foreground">{{ row.label }}</span>
                      <span class="font-medium">{{ Math.round(row.completion_rate * 100) }}% comp</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="barColorClass(row.completion_rate)"
                        :style="{ width: `${Math.max(5, row.completion_rate * 100)}%`, transition: 'width 0.6s ease' }"
                      />
                    </div>
                    <div class="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-muted-foreground flex-wrap">
                      <div class="flex items-center gap-1.5">
                        <span v-if="row.touchdowns > 0" class="text-emerald-500">{{ row.touchdowns }} TD</span>
                        <span v-if="row.interceptions > 0" class="text-destructive">{{ row.interceptions }} INT</span>
                        <span>{{ row.yards_gained_mean.toFixed(1) }} avg yds</span>
                      </div>
                      <span>{{ row.targets.toLocaleString() }} targets</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- PART 4: Worst situations panel -->
            <section class="rounded-xl bg-card/80 shadow-md">
              <button
                type="button"
                class="w-full flex items-center justify-between px-5 py-4 lg:px-6 lg:py-4 text-sm font-medium"
                @click="worstOpen = !worstOpen"
              >
                <span>Where This Play Struggles</span>
                <ChevronDown
                  class="w-4 h-4 text-muted-foreground transition-transform"
                  :class="worstOpen ? 'rotate-180' : ''"
                />
              </button>
              <div v-if="worstOpen" class="px-5 pb-5 lg:px-6 lg:pb-6 space-y-3">
                <div
                  v-if="!worstScenarios.length"
                  class="text-xs text-muted-foreground py-2"
                >
                  Waiting for enough data to identify weak spots…
                </div>
                <div
                  v-for="s in worstScenarios"
                  :key="s.scenario_id"
                  class="rounded-lg bg-background/60 px-3 py-2.5 space-y-1.5 shadow-sm"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-medium truncate">
                      {{ formatScenarioDisplay(s.label ?? '', s.defense_play_label) || 'Situation' }}
                    </p>
                    <span class="text-[11px] text-muted-foreground">
                      {{ Math.round((s.completion_rate ?? s.success_rate ?? 0) * 100) }}% comp
                    </span>
                  </div>
                  <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="barColorClass(s.completion_rate ?? s.success_rate ?? 0)"
                      :style="{ width: `${Math.max(5, (s.completion_rate ?? s.success_rate ?? 0) * 100)}%`, transition: 'width 0.6s ease' }"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span class="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5">
                      {{ mostCommonFailure(s) }}
                    </span>
                    <span class="text-[10px]">
                      {{ (s.n_runs ?? 0).toLocaleString() }} sims
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Replays modal: left sidebar grouped by scenario, center = player -->
            <Dialog v-model:open="replaysModalOpen">
              <DialogContent class="w-[98vw] max-w-[calc(100%-2rem)] sm:max-w-[1800px] h-[92vh] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col" :show-close-button="true">
                <DialogHeader class="shrink-0 px-4 pt-4 pb-3 border-b border-border/60">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <DialogTitle class="text-base font-medium">
                        Replays
                        <span class="text-xs font-normal text-muted-foreground ml-1">
                          ({{ filteredReplays.length }})
                        </span>
                      </DialogTitle>
                      <p class="text-[11px] text-muted-foreground mt-0.5">
                        Filter and sort saved replays for this simulation run.
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                <div class="flex flex-1 min-h-0">
                  <!-- Left: filter + replay list -->
                  <aside class="w-64 shrink-0 border-r border-border/60 flex flex-col bg-muted/20">
                    <!-- Filters -->
                    <div class="shrink-0 p-3 space-y-3 border-b border-border/40">
                      <div class="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          class="text-[11px] font-semibold uppercase tracking-wider transition-colors rounded px-1 -mx-1"
                          :class="replayFiltersEnabled ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'"
                          @click="replayFiltersEnabled = !replayFiltersEnabled; if (!replayFiltersEnabled) { replayFilterType = ''; replayFilterOutcome = ''; replayFilterReceiver = '' }"
                        >
                          Filters {{ replayFiltersEnabled ? 'on' : 'off' }}
                        </button>
                        <div class="flex items-center gap-1.5">
                          <!-- Sort toggle -->
                          <button
                            type="button"
                            class="text-[10px] px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            @click="replaySortBy = replaySortBy === 'yards' ? 'outcome' : 'yards'"
                          >
                            Sort: {{ replaySortBy === 'yards' ? 'Yards' : 'Outcome' }}
                          </button>
                          <button
                            v-if="replayFiltersEnabled && (replayFilterType || replayFilterOutcome || replayFilterReceiver)"
                            type="button"
                            class="text-[10px] px-2 py-0.5 rounded-full bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            @click="replayFilterType = ''; replayFilterOutcome = ''; replayFilterReceiver = ''"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div
                        class="space-y-2 transition-opacity"
                        :class="replayFiltersEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'"
                      >
                        <!-- Highlight type filter pills -->
                        <div>
                          <p class="text-[10px] font-medium text-muted-foreground mb-1">
                            Highlight
                          </p>
                          <div class="flex flex-wrap gap-1">
                            <button
                              v-for="ht in availableHighlightTypes"
                              :key="ht.key"
                              type="button"
                              class="text-[10px] px-1.5 py-0.5 rounded-full transition-colors"
                              :class="replayFilterType === ht.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
                              :disabled="!replayFiltersEnabled"
                              @click="replayFilterType = replayFilterType === ht.key ? '' : ht.key"
                            >
                              {{ ht.label }} <span class="opacity-70">({{ ht.count }})</span>
                            </button>
                          </div>
                        </div>
                        <!-- Outcome filter pills -->
                        <div>
                          <p class="text-[10px] font-medium text-muted-foreground mb-1">
                            Outcome
                          </p>
                          <div class="flex flex-wrap gap-1">
                            <button
                              v-for="oc in availableOutcomes"
                              :key="oc.key"
                              type="button"
                              class="text-[10px] px-1.5 py-0.5 rounded-full transition-colors"
                              :class="replayFilterOutcome === oc.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
                              :disabled="!replayFiltersEnabled"
                              @click="replayFilterOutcome = replayFilterOutcome === oc.key ? '' : oc.key"
                            >
                              {{ oc.label }} <span class="opacity-70">({{ oc.count }})</span>
                            </button>
                          </div>
                        </div>
                        <!-- Receiver filter pills -->
                        <div>
                          <p class="text-[10px] font-medium text-muted-foreground mb-1">
                            Receiver
                          </p>
                          <div class="flex flex-wrap gap-1">
                            <button
                              v-for="rec in availableReceivers"
                              :key="rec.key"
                              type="button"
                              class="text-[10px] px-1.5 py-0.5 rounded-full transition-colors truncate max-w-[120px]"
                              :class="replayFilterReceiver === rec.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
                              :disabled="!replayFiltersEnabled"
                              :title="rec.label"
                              @click="replayFilterReceiver = replayFilterReceiver === rec.key ? '' : rec.key"
                            >
                              {{ rec.label }} <span class="opacity-70">({{ rec.count }})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- Replay list -->
                    <nav class="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
                      <template v-if="replaysLoading">
                        <div class="space-y-0.5">
                          <Skeleton class="h-3 w-24 rounded px-2" />
                          <div v-for="i in 6" :key="i" class="flex items-center gap-2 rounded-md px-2 py-1.5">
                            <Skeleton class="h-1.5 w-1.5 shrink-0 rounded-full" />
                            <div class="min-w-0 flex-1 space-y-1">
                              <Skeleton class="h-3 w-full max-w-[140px]" />
                              <Skeleton class="h-2.5 w-16" />
                            </div>
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <div v-if="filteredReplaysGrouped.length === 0" class="px-2 py-6 text-xs text-muted-foreground">
                          {{ replayFilterType || replayFilterOutcome || replayFilterReceiver ? 'No replays match filters.' : 'No replays saved for this run yet.' }}
                        </div>
                        <div v-for="group in filteredReplaysGrouped" :key="group.key" class="space-y-0.5">
                          <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            {{ group.label }} <span class="font-normal">({{ group.items.length }})</span>
                          </p>
                          <button
                            v-for="item in group.items"
                            :key="item.id"
                            type="button"
                            class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                            :class="{ 'bg-accent/80 text-accent-foreground': selectedReplayInModal?.id === item.id }"
                            @click="selectedReplayInModal = item"
                          >
                            <span
                              class="shrink-0 w-1.5 h-1.5 rounded-full"
                              :class="{
                                'bg-emerald-500': item.outcome === 'touchdown',
                                'bg-destructive': item.outcome === 'interception' || item.outcome === 'safety',
                                'bg-amber-500': item.outcome === 'flag pulled' || item.outcome === 'sack',
                                'bg-muted-foreground/40': !['touchdown', 'interception', 'safety', 'flag pulled', 'sack'].includes(item.outcome ?? ''),
                              }"
                            />
                            <div class="min-w-0 flex-1">
                              <p class="text-xs font-medium truncate">{{ formatScenarioDisplay(item.scenario_label, item.defense_play_label) || item.scenario_group }}</p>
                              <p class="text-[10px] text-muted-foreground flex gap-1.5">
                                <span v-if="item.outcome" class="capitalize">{{ item.outcome }}</span>
                                <span v-if="item.yardsGained != null" class="tabular-nums">{{ item.yardsGained }} yd</span>
                              </p>
                            </div>
                          </button>
                        </div>
                      </template>
                    </nav>
                  </aside>
                  <!-- Center: replay player -->
                  <div class="flex-1 min-w-0 flex flex-col">
                    <template v-if="selectedReplayInModal?.recording_json && (selectedReplayInModal.recording_json as any).player_traces">
                      <SimReplayPlayer
                        :recording="selectedReplayInModal.recording_json as any"
                        :ticks="selectedReplayInModal.ticks ?? 0"
                        :carrier-id="selectedReplayInModal.carrier_id"
                        :thrower-id="selectedReplayInModal.thrower_id"
                        :receiver-id="selectedReplayInModal.receiver_id"
                        :auto-play="fieldSettings?.replay_auto_play !== false"
                        :loop="fieldSettings?.replay_loop === true"
                        :player-labels="replayPlayerLabels"
                        :show-player-names="fieldSettings?.show_player_names_on_canvas !== false"
                        :player-label-type="(fieldSettings?.default_player_label_on_canvas ?? 'position') as 'number' | 'position' | 'both' | 'none'"
                      />
                      <div class="shrink-0 px-4 py-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span
                            v-if="selectedReplayInModal.outcome"
                            class="capitalize font-medium px-1.5 py-0.5 rounded-md"
                            :class="{
                              'bg-emerald-500/15 text-emerald-600': selectedReplayInModal.outcome === 'touchdown',
                              'bg-destructive/15 text-destructive': selectedReplayInModal.outcome === 'interception' || selectedReplayInModal.outcome === 'safety',
                              'bg-amber-500/15 text-amber-600': selectedReplayInModal.outcome === 'flag pulled' || selectedReplayInModal.outcome === 'sack',
                            }"
                          >
                            {{ selectedReplayInModal.outcome }}
                          </span>
                          <span v-if="selectedReplayInModal.yardsGained != null" class="tabular-nums">{{ selectedReplayInModal.yardsGained }} yards</span>
                          <span class="text-muted-foreground/70">{{ formatScenarioDisplay(selectedReplayInModal.scenario_label, selectedReplayInModal.defense_play_label) }}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <button
                            type="button"
                            class="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                            :class="fieldSettings?.replay_auto_play !== false ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
                            title="Start playback when you select a replay"
                            @click="updateSettings({ replay_auto_play: fieldSettings?.replay_auto_play === false })"
                          >
                            Auto-play
                          </button>
                          <button
                            type="button"
                            class="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                            :class="fieldSettings?.replay_loop === true ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'"
                            title="Loop replay until paused"
                            @click="updateSettings({ replay_loop: !fieldSettings?.replay_loop })"
                          >
                            Loop
                          </button>
                        </div>
                      </div>
                    </template>
                    <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                      <template v-if="replayRecordingLoading">
                        <svg class="w-8 h-8 animate-spin opacity-50" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        <p class="text-sm font-medium">Loading replay…</p>
                      </template>
                      <template v-else>
                        <Film class="w-14 h-14 opacity-50" />
                        <p v-if="!selectedReplayInModal" class="text-sm font-medium">Select a replay</p>
                        <p v-else-if="!selectedReplayInModal.recording_json" class="text-sm font-medium">No recording data found</p>
                        <p v-else class="text-sm font-medium">Recording missing player traces</p>
                        <p class="text-xs max-w-xs text-center">Choose a scenario from the list to play the recording.</p>
                      </template>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </template>
        <template #fallback>
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <svg class="w-20 h-20 text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 class="text-lg font-semibold font-display">Run a simulation to see results</h2>
            <p class="text-sm text-muted-foreground mt-1">Select a play, choose defense, and run.</p>
          </div>
        </template>
        </ClientOnly>
      </main>
    </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="tsx">
import type { Play, FieldSettings } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { Checkbox } from '~/components/ui/checkbox'
import { Skeleton } from '~/components/ui/skeleton'
import PlayPreview from '~/components/play/PlayPreview.vue'
import SimReplayPlayer from '~/components/play-lab/SimReplayPlayer.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Search, ChevronDown, Play as PlayIcon, Film, PanelLeftClose, Sparkles } from 'lucide-vue-next'
import type { AggregatedStats } from '~/composables/usePlayLabJob'
import type { RosterError } from '~/composables/useSimRoster'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'

const props = defineProps<{
  jobId?: string | null
}>()

interface PlayWithPb extends Play {
  _playbookName?: string
}

/** Replay / highlight recording from a completed run. Maps to sim_recordings (job_id, scenario_label, defense_play_label, highlight_type, outcome, yards_gained, recording_json). */
export interface PlayLabReplay {
  id: string
  job_id?: string
  scenario_group: string
  scenario_label: string
  defense_play_label?: string
  scenario_key?: string
  label: string
  outcome?: string
  yardsGained?: number
  thumbnailUrl?: string | null
  url: string | null
  /** Full recording data for the replay player */
  ticks?: number
  carrier_id?: string | null
  thrower_id?: string | null
  receiver_id?: string | null
  recording_json?: Record<string, unknown> | null
}

/** Format for UI: "Scenario · [where we are] · [defense play]" instead of raw "1st & 10 — Own Territory — 0 Rushers — Soft Coverage". */
function formatScenarioDisplay(scenarioLabel: string, defensePlayLabel?: string): string {
  const parts = (scenarioLabel || '').split(' — ')
  const where = parts.slice(0, 2).filter(Boolean).join(', ').trim() || 'Scenario'
  const defense = (defensePlayLabel ?? '').trim()
  if (defense) return `Scenario · ${where} · ${defense}`
  return `Scenario · ${where}`
}

/** Row shape from sim_recordings (Supabase). */
interface SimRecordingRow {
  id: string
  job_id: string
  scenario_id: string
  scenario_label: string
  defense_play_label?: string | null
  highlight_type: string
  outcome: string
  yards_gained: number
  ticks: number
  carrier_id: string | null
  thrower_id: string | null
  receiver_id: string | null
  recording_json: Record<string, unknown> | null
}

const attributeTiers: { id: string; label: string; description: string; hint: string }[] = [
  { id: 'as_is', label: 'As-Is', description: 'Use your roster attributes exactly as saved.', hint: 'Roster' },
  { id: 'poor', label: 'Poor', description: 'All attributes reduced to poor tier (3).', hint: '3' },
  { id: 'average', label: 'Average', description: 'All attributes set to league average (5).', hint: '5' },
  { id: 'elite', label: 'Elite', description: 'All attributes boosted to elite tier (8).', hint: '8' },
]

const route = useRoute()
const client = useSupabaseDB()
const user = useSupabaseUser()
const { profile } = useProfile()
const { hasProAccess, hasSimulationAccess, isPaidPro, isTrialing, trialDaysLeft } = usePlanAccess()
const upgradeModalOpen = useState<boolean>('upgrade-modal-open', () => false)
function openUpgradeModal() {
  upgradeModalOpen.value = true
}
const { settings: fieldSettings, fetchSettings, updateSettings } = useFieldSettings()

/** Free = no trial, no pro (view past sims only). Upgrade gate only when Free and not viewing a job. */
const isFree = computed(() => !hasSimulationAccess.value)
const isViewingPastJob = computed(() => !!props.jobId)
const showUpgradeGate = computed(() => isFree.value && !isViewingPastJob.value)

/** Plan badge next to title: Pro, Free trial (+ days left), or Free. */
const planBadgeLabel = computed(() => {
  if (isPaidPro.value) return 'Pro'
  if (isTrialing.value) return trialDaysLeft.value > 0 ? `Free trial · ${trialDaysLeft.value} day${trialDaysLeft.value === 1 ? '' : 's'} left` : 'Free trial'
  return 'Free'
})

/** Free: Poor, Average, As-Is, Elite. Pro/trial: As-Is, Poor, Average, Elite. */
const attributeTiersOrdered = computed(() => {
  const order = hasProAccess.value ? ['as_is', 'poor', 'average', 'elite'] : ['poor', 'average', 'as_is', 'elite']
  return order.map((id) => attributeTiers.find((t) => t.id === id)).filter(Boolean) as typeof attributeTiers
})

const iterationOptions = [10, 100, 1000, 10000, 100000]
const isIterationAllowed = (n: number) => {
  if (isPaidPro.value) return true
  if (isTrialing.value) return n === 100
  return n === 100
}
const maxIterationsForPlan = computed(() => (isPaidPro.value ? 100000 : 100))
const scenarioOptions = [100, 500, 1000, 2000, 5000]
const isScenarioAllowed = (n: number) => {
  if (isPaidPro.value) return true
  if (isTrialing.value) return n === 500
  return n === 500
}
const maxScenariosForPlan = computed(() => (isPaidPro.value ? 5000 : 500))
const { players, fetchPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()
const { resolveRoster, resolveRosterWithFallback, countStarters } = useSimRoster(teams)
const job = reactive(usePlayLabJob())
const { isOpen: historyPanelOpen, close: closeHistoryPanel } = useSimHistoryPanel()
const jobHistory = useJobHistory()
const worstOpen = ref(false)
const displayedSuccessRate = ref(0)

interface InsightItem { icon: string; title: string; detail: string; sentiment: 'positive' | 'negative' | 'neutral' }
const insightsData = ref<InsightItem[]>([])
const insightsLoading = ref(false)
const insightsStreaming = ref(false)
const insightsError = ref<string | null>(null)
let insightsAbort: AbortController | null = null

async function fetchInsights(regenerate = false) {
  if (!job.jobId || !partial.value) return

  insightsAbort?.abort()
  const ac = new AbortController()
  insightsAbort = ac

  insightsLoading.value = true
  insightsStreaming.value = true
  insightsError.value = null
  insightsData.value = []

  try {
    const playName = selectedPlay.value?.name ?? job.loadedJobStatus?.job_metadata?.offensive_play_name ?? 'Unknown'
    const defenseName = defensePlays.value.find((p) => p.id === selectedDefenseIds.value[0])?.name
      ?? job.loadedJobStatus?.job_metadata?.defensive_play_name ?? 'Unknown'

    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.jobId,
        result_data: partial.value,
        play_name: playName,
        defense_name: defenseName,
        receiver_names: receiverNameMap.value,
        regenerate,
      }),
      signal: ac.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || `HTTP ${res.status}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload)
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.icon && parsed.title) {
            insightsData.value = [...insightsData.value, parsed as InsightItem]
            insightsLoading.value = false
          }
        } catch { /* skip malformed */ }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return
    insightsError.value = err?.message ?? 'Failed to generate insights'
  } finally {
    insightsLoading.value = false
    insightsStreaming.value = false
    if (insightsAbort === ac) insightsAbort = null
  }
}

async function loadCachedInsights() {
  if (!job.jobId) return
  const supabase = useSupabaseDB()
  const { data } = await supabase.from('sim_insights').select('insights').eq('job_id', job.jobId).single()
  if (data?.insights) insightsData.value = data.insights as InsightItem[]
}
/** Replays modal (sidebar + player). */
const replaysModalOpen = ref(false)
const selectedReplayInModal = ref<PlayLabReplay | null>(null)
const replayRecordingLoading = ref(false)
const replayFilterType = ref('')
const replayFilterOutcome = ref('')
const replayFilterReceiver = ref('')
const replaySortBy = ref<'yards' | 'outcome'>('yards')
/** Master toggle: when false, filter chips are disabled and list shows all replays. */
const replayFiltersEnabled = ref(true)

/** Raw rows from sim_recordings (fetched when job has id). List fetch never includes recording_json. */
const replaysFromDb = ref<SimRecordingRow[]>([])
/** Cache of loaded recording_json by replay id so we never re-fetch the same replay. */
const recordingJsonCache = ref<Map<string, Record<string, unknown>>>(new Map())
const replaysLoading = ref(false)
const recordingsCount = computed(() => replaysFromDb.value.length)
const isJobCompleted = computed(() =>
  job?.status?.state === 'COMPLETED' || job?.loadedJobStatus?.state === 'COMPLETED'
)
const showReplaysButton = computed(() => isJobCompleted.value && recordingsCount.value > 0)

const awaitingReplays = ref(false)
let replayPollTimer: ReturnType<typeof setTimeout> | null = null

/** Fetch sim_recordings list for current job (metadata only — no recording_json).
 *  Full recording_json is lazy-loaded when the user selects a specific replay. */
async function fetchReplaysForJob(jobId: string, { poll = false }: { poll?: boolean } = {}) {
  replaysLoading.value = true
  if (poll) awaitingReplays.value = true
  try {
    const supabase = useSupabaseDB()
    const { data, error } = await supabase
      .from('sim_recordings')
      .select('id, job_id, scenario_id, scenario_label, defense_play_label, highlight_type, outcome, yards_gained, ticks, carrier_id, thrower_id, receiver_id')
      .eq('job_id', jobId)
      .order('highlight_type')
      .order('yards_gained', { ascending: false })
    if (error) throw error
    const rows = (data ?? []).map((r: any) => ({
      id: r.id,
      job_id: r.job_id,
      scenario_id: r.scenario_id,
      scenario_label: r.scenario_label ?? '',
      defense_play_label: r.defense_play_label ?? null,
      highlight_type: r.highlight_type ?? '',
      outcome: r.outcome ?? '',
      yards_gained: r.yards_gained ?? 0,
      ticks: r.ticks ?? 0,
      carrier_id: r.carrier_id ?? null,
      thrower_id: r.thrower_id ?? null,
      receiver_id: r.receiver_id ?? null,
      recording_json: null,
    }))
    replaysFromDb.value = rows

    if (poll && rows.length === 0 && jobId === job.jobId) {
      replayPollTimer = setTimeout(() => fetchReplaysForJob(jobId, { poll: true }), 3000)
      return
    }
    awaitingReplays.value = false
  } catch (_) {
    replaysFromDb.value = []
    awaitingReplays.value = false
  } finally {
    replaysLoading.value = false
  }
}

/** Lazy-load full recording_json for a single replay when selected. Uses cache so we never re-fetch. */
async function fetchRecordingJson(recordingId: string): Promise<Record<string, unknown> | null> {
  const cached = recordingJsonCache.value.get(recordingId)
  if (cached) return cached
  const supabase = useSupabaseDB()
  const { data, error } = await supabase
    .from('sim_recordings')
    .select('recording_json')
    .eq('id', recordingId)
    .single()
  if (error || !data) return null
  const raw = (data as any).recording_json
  const json = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? null)
  if (json) {
    recordingJsonCache.value = new Map(recordingJsonCache.value).set(recordingId, json)
  }
  return json
}

function stopReplayPolling() {
  if (replayPollTimer) { clearTimeout(replayPollTimer); replayPollTimer = null }
  awaitingReplays.value = false
}

/** Group DB rows by highlight_type and map to PlayLabReplay. Uses recordingJsonCache so previously loaded replays show without re-fetch. */
function groupRecordingsByScenario(rows: SimRecordingRow[], cache: Map<string, Record<string, unknown>>): { key: string; label: string; items: PlayLabReplay[] }[] {
  const byType = new Map<string, PlayLabReplay[]>()
  const highlightLabels: Record<string, string> = {
    touchdown: 'Touchdown',
    long_pass: 'Long Pass',
    longest_throw: 'Longest Throw',
    most_yac: 'Most YAC',
    interception: 'Interception',
    flag_pulled: 'Flag Pulled',
    sack: 'Sack',
    safety: 'Safety',
    out_of_bounds: 'Out of Bounds',
    fastest_td: 'Fastest TD',
    most_yards: 'Most Yards',
    biggest_yac: 'Biggest YAC',
  }
  for (const r of rows) {
    const groupLabel = (highlightLabels[r.highlight_type] ?? (r.highlight_type ?? '').replace(/_/g, ' ')) || 'Other'
    const scenarioDisplay = formatScenarioDisplay(r.scenario_label, r.defense_play_label ?? undefined)
    const item: PlayLabReplay = {
      id: r.id,
      job_id: r.job_id,
      scenario_group: groupLabel,
      scenario_label: r.scenario_label,
      defense_play_label: r.defense_play_label ?? undefined,
      scenario_key: r.scenario_id,
      label: scenarioDisplay || `${groupLabel} — ${Math.round(r.yards_gained ?? 0)} yd`,
      outcome: (r.outcome?.toLowerCase() ?? '').replace(/_/g, ' '),
      yardsGained: r.yards_gained != null ? Math.round(r.yards_gained) : undefined,
      url: null,
      ticks: r.ticks,
      carrier_id: r.carrier_id,
      thrower_id: r.thrower_id,
      receiver_id: r.receiver_id,
      recording_json: cache.get(r.id) ?? r.recording_json ?? null,
    }
    if (!byType.has(r.highlight_type)) byType.set(r.highlight_type, [])
    byType.get(r.highlight_type)!.push(item)
  }
  return Array.from(byType.entries()).map(([key, items]) => ({
    key,
    label: highlightLabels[key] ?? (key ?? '').replace(/_/g, ' '),
    items,
  }))
}

const replaysGroupedByScenario = computed(() => {
  if (!job.jobId) return []
  if (replaysFromDb.value.length > 0) return groupRecordingsByScenario(replaysFromDb.value, recordingJsonCache.value)
  return []
})

const replaysGroupedByScenarioFlat = computed(() => replaysGroupedByScenario.value.flatMap((g) => g.items))

const highlightLabels: Record<string, string> = {
  touchdown: 'TD', long_pass: 'Long Pass', longest_throw: 'Long Throw',
  most_yac: 'Most YAC', interception: 'INT', flag_pulled: 'Flag Pull',
  sack: 'Sack', safety: 'Safety', out_of_bounds: 'OOB',
  fastest_td: 'Fast TD', most_yards: 'Most Yds', biggest_yac: 'Big YAC',
}

/** Replays filtered by outcome + receiver only (for highlight pill counts). */
const itemsForHighlightPills = computed(() => {
  let items = replaysGroupedByScenarioFlat.value
  if (!replayFiltersEnabled.value) return items
  if (replayFilterOutcome.value) {
    items = items.filter((r) => r.outcome === replayFilterOutcome.value)
  }
  if (replayFilterReceiver.value) {
    const rid = replayFilterReceiver.value === '__none__' ? null : replayFilterReceiver.value
    items = items.filter((r) => (r.receiver_id ?? null) === rid)
  }
  return items
})

/** Replays filtered by highlight + receiver only (for outcome pill counts). */
const itemsForOutcomePills = computed(() => {
  let items = replaysGroupedByScenarioFlat.value
  if (!replayFiltersEnabled.value) return items
  if (replayFilterType.value) {
    items = items.filter((r) => r.highlight_type === replayFilterType.value)
  }
  if (replayFilterReceiver.value) {
    const rid = replayFilterReceiver.value === '__none__' ? null : replayFilterReceiver.value
    items = items.filter((r) => (r.receiver_id ?? null) === rid)
  }
  return items
})

/** Replays filtered by highlight + outcome only (for receiver pill counts). */
const itemsForReceiverPills = computed(() => {
  let items = replaysGroupedByScenarioFlat.value
  if (!replayFiltersEnabled.value) return items
  if (replayFilterType.value) {
    items = items.filter((r) => r.highlight_type === replayFilterType.value)
  }
  if (replayFilterOutcome.value) {
    items = items.filter((r) => r.outcome === replayFilterOutcome.value)
  }
  return items
})

/** Available highlight types with counts (cascaded by outcome + receiver). */
const availableHighlightTypes = computed(() => {
  const counts = new Map<string, number>()
  for (const r of itemsForHighlightPills.value) {
    counts.set(r.highlight_type, (counts.get(r.highlight_type) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([key, count]) => ({
    key,
    label: highlightLabels[key] ?? (key ?? '').replace(/_/g, ' '),
    count,
  }))
})

/** Available outcomes with counts (cascaded by highlight + receiver). */
const availableOutcomes = computed(() => {
  const counts = new Map<string, number>()
  for (const r of itemsForOutcomePills.value) {
    const oc = (r.outcome?.toLowerCase() ?? '').replace(/_/g, ' ') || 'unknown'
    counts.set(oc, (counts.get(oc) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([key, count]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count,
  }))
})

/** Filtered and sorted replays (all three filters applied). */
const filteredReplays = computed(() => {
  let items = replaysGroupedByScenarioFlat.value
  if (replayFiltersEnabled.value) {
    if (replayFilterType.value) {
      items = items.filter((r) => r.highlight_type === replayFilterType.value)
    }
    if (replayFilterOutcome.value) {
      items = items.filter((r) => r.outcome === replayFilterOutcome.value)
    }
    if (replayFilterReceiver.value) {
      const rid = replayFilterReceiver.value === '__none__' ? null : replayFilterReceiver.value
      items = items.filter((r) => (r.receiver_id ?? null) === rid)
    }
  }
  const sorted = [...items]
  if (replaySortBy.value === 'yards') {
    sorted.sort((a, b) => (b.yardsGained ?? 0) - (a.yardsGained ?? 0))
  } else {
    sorted.sort((a, b) => (a.outcome ?? '').localeCompare(b.outcome ?? ''))
  }
  return sorted
})

/** Filtered replays re-grouped by highlight type. */
const filteredReplaysGrouped = computed(() => {
  const byGroup = new Map<string, PlayLabReplay[]>()
  for (const item of filteredReplays.value) {
    if (!byGroup.has(item.scenario_group)) byGroup.set(item.scenario_group, [])
    byGroup.get(item.scenario_group)!.push(item)
  }
  return Array.from(byGroup.entries()).map(([key, items]) => ({
    key,
    label: key,
    items,
  }))
})

watch(replaysModalOpen, (open) => {
  if (open) {
    if (job.jobId && isJobCompleted.value) fetchReplaysForJob(job.jobId)
    selectedReplayInModal.value = replaysGroupedByScenarioFlat.value[0] ?? null
  } else {
    selectedReplayInModal.value = null
  }
})

watch(() => job.jobId, (jobId) => {
  stopReplayPolling()
  insightsAbort?.abort()
  replaysFromDb.value = []
  recordingJsonCache.value = new Map()
  insightsData.value = []
  insightsError.value = null
  insightsStreaming.value = false
  if (!jobId) {
    jobReceiverNameMap.value = {}
    jobOrderedReceiverIds.value = []
  }
  if (jobId && isJobCompleted.value) {
    fetchReplaysForJob(jobId)
    loadCachedInsights()
  }
})

watch(
  () => job.status?.state,
  (state, oldState) => {
    if (state === 'COMPLETED' && job.jobId) {
      fetchReplaysForJob(job.jobId, { poll: true })
      if (oldState && oldState !== 'COMPLETED') {
        fetchInsights()
      } else {
        loadCachedInsights()
      }
    }
  }
)

/** When grouped replays update (e.g. after fetch), select first if modal is open and current selection is missing.
 *  Pre-load the first replay's recording so auto-play can start as soon as it's selected. */
watch(replaysGroupedByScenarioFlat, (flat) => {
  if (!replaysModalOpen.value || flat.length === 0) return
  const currentId = selectedReplayInModal.value?.id
  if (!currentId || !flat.some((r) => r.id === currentId)) {
    selectedReplayInModal.value = flat[0] ?? null
  }
  // Pre-load first replay so it's ready for auto-play (fetch is cached; watch will use cache if already loading)
  const first = flat[0]
  if (first && !recordingJsonCache.value.has(first.id)) {
    fetchRecordingJson(first.id).then((json) => {
      if (json && first.recording_json == null) {
        first.recording_json = json
        const row = replaysFromDb.value.find((r) => r.id === first.id)
        if (row) row.recording_json = json
      }
    })
  }
}, { deep: true })

/** Lazy-load recording_json when a replay is selected (and not already cached). */
watch(selectedReplayInModal, async (replay) => {
  if (!replay || replay.recording_json) return
  replayRecordingLoading.value = true
  try {
    const json = await fetchRecordingJson(replay.id)
    if (json && selectedReplayInModal.value?.id === replay.id) {
      replay.recording_json = json
      const row = replaysFromDb.value.find((r) => r.id === replay.id)
      if (row) row.recording_json = json
    }
  } finally {
    replayRecordingLoading.value = false
  }
})
const configRailed = ref(false)
const rosterErrors = ref<RosterError[]>([])
const defenseBasePlayerWarnings = ref<RosterError[]>([])

const primaryTeamId = computed(() =>
  teams.value.find((t) => t.name !== 'Free Agent')?.id ?? teams.value[0]?.id ?? ''
)

const defenseStarterCount = computed(() => {
  if (!primaryTeamId.value) return 0
  return countStarters(primaryTeamId.value, 'defense')
})

const hasNoDefenseStarters = computed(() => defenseStarterCount.value === 0)

const configLocked = computed(() => !!job?.jobId)

const playSearchQuery = ref('')
const playDropdownOpen = ref(false)
const selectedPlayId = ref<string>('')
const defenseSearchQuery = ref('')
const defenseDropdownOpen = ref(false)
const selectedDefenseIds = ref<string[]>([])
const attributeTier = ref('as_is')
const nIterations = ref(10)
const nScenarios = ref(100)
const hasSelectedIterations = ref(false)
const hasSelectedScenarios = ref(false)

function maybeCloseHistoryPanel() {
  if (historyPanelOpen.value) closeHistoryPanel()
}

const playsReady = ref(false)
let playsReadyPromise: Promise<void> | null = null

function ensurePlaysLoaded(): Promise<void> {
  if (playsReady.value) return Promise.resolve()
  if (!playsReadyPromise) {
    playsReadyPromise = fetchPlays().then(() => { playsReady.value = true })
  }
  return playsReadyPromise
}

function applyJobMetadataAndPlay(meta: { offensive_play_id?: string; defensive_play_id?: string; n_iterations?: number; n_scenarios?: number } | undefined) {
  if (!meta) return
  if (meta.offensive_play_id) selectedPlayId.value = meta.offensive_play_id
  const play = offensivePlays.value.find((p) => p.id === meta.offensive_play_id) ?? null
  if (play) {
    jobReceiverNameMap.value = buildReceiverNameMap(play)
    jobOrderedReceiverIds.value = buildOrderedReceiverIds(play)
  }
  if (meta.defensive_play_id) selectedDefenseIds.value = [meta.defensive_play_id]
  if (meta.n_iterations) {
    nIterations.value = Math.min(meta.n_iterations, maxIterationsForPlan.value)
    hasSelectedIterations.value = true
  }
  if (meta.n_scenarios) {
    nScenarios.value = Math.min(meta.n_scenarios, maxScenariosForPlan.value)
    hasSelectedScenarios.value = true
  }
}

async function loadJobById(id: string) {
  if (job.jobId === id) {
    if (job.loadedJobStatus?.job_metadata) applyJobMetadataAndPlay(job.loadedJobStatus.job_metadata)
    return
  }
  await ensurePlaysLoaded()
  const status = await job.getJobStatus(id)
  if (status?.state === 'COMPLETED' || status?.state === 'FAILED') {
    const ok = await job.loadResult(id)
    if (ok && job.loadedJobStatus?.job_metadata) applyJobMetadataAndPlay(job.loadedJobStatus.job_metadata)
  } else if (status?.job_metadata) {
    applyJobMetadataAndPlay(status.job_metadata)
    job.attachToJob(id)
  } else if (status) {
    job.attachToJob(id)
  }
}

const jobPageLoading = ref(false)
const isClient = ref(false)

watch(
  () => props.jobId,
  async (id, oldId) => {
    if (!id) {
      if (oldId) {
        job.reset()
        configRailed.value = false
        selectedPlayId.value = ''
        selectedDefenseIds.value = []
        nIterations.value = 10
        nScenarios.value = 100
        hasSelectedIterations.value = false
        hasSelectedScenarios.value = false
        recordingJsonCache.value = new Map()
        jobReceiverNameMap.value = {}
        jobOrderedReceiverIds.value = []
        insightsAbort?.abort()
        insightsData.value = []
        insightsError.value = null
        insightsStreaming.value = false
      }
      jobPageLoading.value = false
      return
    }
    if (id !== oldId) {
      recordingJsonCache.value = new Map()
      insightsAbort?.abort()
      insightsData.value = []
      insightsError.value = null
      insightsStreaming.value = false
    }
    configRailed.value = true
    jobPageLoading.value = true
    try {
      await loadJobById(id)
    } finally {
      jobPageLoading.value = false
    }
  },
  { immediate: true },
)

watch([nIterations, maxIterationsForPlan], () => {
  if (nIterations.value > maxIterationsForPlan.value) {
    nIterations.value = maxIterationsForPlan.value
  }
}, { immediate: true })

watch([nScenarios, maxScenariosForPlan], () => {
  if (nScenarios.value > maxScenariosForPlan.value) {
    nScenarios.value = maxScenariosForPlan.value
  }
}, { immediate: true })

watch(hasProAccess, (access) => {
  if (!access && (attributeTier.value === 'as_is' || attributeTier.value === 'elite')) attributeTier.value = 'average'
  if (!access && selectedDefenseIds.value.length > 1) selectedDefenseIds.value = selectedDefenseIds.value.slice(0, 1)
}, { immediate: true })

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const now = new Date()
    const s = Math.round((now.getTime() - d.getTime()) / 1000)
    if (s < 60) return 'Just now'
    if (s < 3600) return `${Math.floor(s / 60)} min ago`
    if (s < 86400) return `${Math.floor(s / 3600)} hours ago`
    if (s < 604800) return `${Math.floor(s / 86400)} days ago`
    return d.toLocaleDateString()
  } catch {
    return '—'
  }
}

const allOffensivePlays = ref<PlayWithPb[]>([])
const allDefensePlays = ref<PlayWithPb[]>([])

const offensivePlays = computed(() => allOffensivePlays.value)
const defensePlays = computed(() => allDefensePlays.value)

const filteredOffensivePlays = computed(() => {
  const q = playSearchQuery.value.trim().toLowerCase()
  if (!q) return offensivePlays.value
  return offensivePlays.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p._playbookName?.toLowerCase().includes(q)) ||
      (p.formation?.toLowerCase().includes(q))
  )
})

const filteredDefensePlays = computed(() => {
  const q = defenseSearchQuery.value.trim().toLowerCase()
  if (!q) return defensePlays.value
  return defensePlays.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p._playbookName?.toLowerCase().includes(q)) ||
      (p.formation?.toLowerCase().includes(q))
  )
})

const selectedPlay = computed(() => offensivePlays.value.find((p) => p.id === selectedPlayId.value) ?? null)

/** Pinned receiver name map for the current job so names show immediately (no refresh) when result arrives or when opening a past job. */
const jobReceiverNameMap = ref<Record<string, string>>({})
/** Pinned ordered receiver ids for the current job (for index-based labels). */
const jobOrderedReceiverIds = ref<string[]>([])

function buildReceiverNameMap(play: { canvas_data?: { players?: Array<{ id: string; name?: string; number?: number; designation?: string; position?: string }> } } | null): Record<string, string> {
  if (!play?.canvas_data?.players) return {}
  const map: Record<string, string> = {}
  for (const cp of play.canvas_data.players) {
    const label = cp.name
      ? `${cp.name}${cp.number ? ' #' + cp.number : ''}`
      : cp.designation
        ? `${cp.designation}${cp.number ? ' #' + cp.number : ''}`
        : `${cp.position || 'Player'}${cp.number ? ' #' + cp.number : ''}`
    map[cp.id] = label
  }
  return map
}

function buildOrderedReceiverIds(play: { canvas_data?: { players?: Array<{ id: string; position?: string }> } } | null): string[] {
  if (!play?.canvas_data?.players) return []
  return play.canvas_data.players.filter((p) => p.position !== 'QB').map((p) => p.id)
}

/** Map canvas_player_id → display name. Uses pinned job map when we have one so names show without refresh. */
const receiverNameMap = computed<Record<string, string>>(() => {
  if (job.jobId && Object.keys(jobReceiverNameMap.value).length > 0) return jobReceiverNameMap.value
  return buildReceiverNameMap(selectedPlay.value)
})

/** Ordered receiver canvas ids for index-based label fallback. Uses pinned job list when we have one. */
const orderedReceiverIdsFromPlay = computed<string[]>(() => {
  if (job.jobId && jobOrderedReceiverIds.value.length > 0) return jobOrderedReceiverIds.value
  return buildOrderedReceiverIds(selectedPlay.value)
})

/** Player id → { name, number, position } for replay player labels (from play designer canvas). */
const replayPlayerLabels = computed<Record<string, { name?: string; number?: number; position: string }>>(() => {
  const play = selectedPlay.value
  if (!play?.canvas_data?.players) return {}
  const map: Record<string, { name?: string; number?: number; position: string }> = {}
  for (const cp of play.canvas_data.players) {
    map[cp.id] = {
      name: cp.name ?? undefined,
      number: cp.number != null ? cp.number : undefined,
      position: cp.position || '?',
    }
  }
  return map
})

/** Available receivers with counts (cascaded by highlight + outcome). */
const availableReceivers = computed(() => {
  const counts = new Map<string, number>()
  const nameMap = receiverNameMap.value
  for (const r of itemsForReceiverPills.value) {
    const rid = r.receiver_id ?? '__none__'
    counts.set(rid, (counts.get(rid) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([key, count]) => ({
    key,
    label: key === '__none__' ? '—' : (nameMap[key] || key.slice(0, 12)),
    count,
  })).sort((a, b) => b.count - a.count)
})

// When cascading filters remove the current selection from another dimension, clear that selection (must be after availableReceivers)
watch(availableHighlightTypes, (types) => {
  if (replayFilterType.value && !types.some((t) => t.key === replayFilterType.value)) {
    replayFilterType.value = ''
  }
}, { deep: true })
watch(availableOutcomes, (outcomes) => {
  if (replayFilterOutcome.value && !outcomes.some((o) => o.key === replayFilterOutcome.value)) {
    replayFilterOutcome.value = ''
  }
}, { deep: true })
watch(availableReceivers, (receivers) => {
  if (replayFilterReceiver.value && !receivers.some((r) => r.key === replayFilterReceiver.value)) {
    replayFilterReceiver.value = ''
  }
}, { deep: true })

const canRun = computed(() => {
  if (!selectedPlayId.value || !selectedPlay.value) return false
  if (selectedDefenseIds.value.length === 0) return false
  if (rosterErrors.value.length > 0) return false
  return true
})

const nDefensePlays = computed(() => Math.max(1, selectedDefenseIds.value.length))
// Auto-clamp scenarios to 1K max when multiple defenses selected
watch(nDefensePlays, (count) => {
  if (count > 1 && nScenarios.value > 1000) nScenarios.value = 1000
})
const totalSimulations = computed(() => nDefensePlays.value * nScenarios.value * nIterations.value)
const iterationTimeHint = computed(() => {
  const total = totalSimulations.value
  if (total <= 200_000) return '~1 minute'
  if (total <= 2_000_000) return '~5 minutes'
  if (total <= 20_000_000) return '~30 minutes'
  return '~1 hour'
})

const partial = computed(() => job.partialResult)

const scenariosCompleted = computed(() => partial.value?.scenarios_completed ?? 0)
const scenariosTotal = computed(() => partial.value?.scenarios_total ?? 0)
const totalSimsCompleted = computed(() => scenariosCompleted.value * nIterations.value)
const totalSimsTarget = computed(() => scenariosTotal.value * nIterations.value)

const progressFraction = computed(() => {
  const total = scenariosTotal.value || 0
  if (!total) return 0
  return Math.min(1, Math.max(0, scenariosCompleted.value / total))
})

const overallSuccessRate = computed(() => {
  if (partial.value) return (partial.value.overall_success_rate ?? 0) * 100
  const fromResult = (job.result as any)?.overall_success_rate
  if (typeof fromResult === 'number') return fromResult * 100
  return 0
})

const overallCompletionRate = computed(() => {
  if (partial.value) return (partial.value.overall_completion_rate ?? 0) * 100
  const fromResult = (job.result as any)?.overall_completion_rate
  if (typeof fromResult === 'number') return fromResult * 100
  return 0
})

watch(
  overallCompletionRate,
  (next) => {
    if (typeof requestAnimationFrame === 'undefined') {
      displayedSuccessRate.value = next
      return
    }
    const start = displayedSuccessRate.value
    const duration = 800
    const startTime = performance.now()
    function step(now: number) {
      const t = Math.min(1, (now - startTime) / duration)
      displayedSuccessRate.value = start + (next - start) * t
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  },
  { immediate: true },
)

const overallTdRate = computed(() => {
  const buckets = partial.value?.aggregated_by_down ?? {}
  const entries = Object.values(buckets) as AggregatedStats[]
  if (!entries.length) return 0
  let total = 0, tdWeighted = 0
  for (const e of entries) {
    const w = e.n_iterations || 0
    if (!w) continue
    total += w
    tdWeighted += (e.outcome_distribution?.TOUCHDOWN ?? 0) * w
  }
  return total ? Math.round((tdWeighted / total) * 100) : 0
})

const overallIntRate = computed(() => {
  const buckets = partial.value?.aggregated_by_down ?? {}
  const entries = Object.values(buckets) as AggregatedStats[]
  if (!entries.length) return 0
  let total = 0, intWeighted = 0
  for (const e of entries) {
    const w = e.n_iterations || 0
    if (!w) continue
    total += w
    intWeighted += (e.outcome_distribution?.INTERCEPTION ?? 0) * w
  }
  return total ? Math.round((intWeighted / total) * 100) : 0
})

const ringColor = computed(() => {
  const rate = overallCompletionRate.value
  if (rate < 40) return 'hsl(var(--destructive))'
  if (rate < 65) return 'hsl(38 92% 50%)'
  return 'hsl(142 76% 36%)'
})

const confidenceLabel = computed(() => {
  const level = job.confidenceLevel
  if (level === 'early') return 'Early signal'
  if (level === 'forming') return 'Taking shape'
  if (level === 'confident') return 'High confidence'
  if (level === 'finalized') return 'Finalized'
  return 'Calibrating...'
})

const confidenceRingStyle = computed(() => {
  const circumference = 2 * Math.PI * 48
  const progress = progressFraction.value
  const offset = circumference * (1 - progress)
  return {
    strokeDasharray: `${circumference}px`,
    strokeDashoffset: `${offset}px`,
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%',
    transition: 'stroke-dashoffset 0.8s ease',
  }
})

const progressBarStyle = computed(() => ({
  width: `${progressFraction.value * 100}%`,
  backgroundColor: ringColor.value,
  transition: 'width 0.6s ease, background-color 0.6s ease',
}))

function barColorClass(rate: number) {
  if (rate < 0.4) return 'bg-destructive'
  if (rate < 0.65) return 'bg-amber-500'
  return 'bg-emerald-500'
}

const downRows = computed(() => {
  const src = partial.value?.aggregated_by_down ?? {}
  const order: { key: string; label: string }[] = [
    { key: '4', label: '4th Down' },
    { key: '3', label: '3rd Down' },
    { key: '2', label: '2nd Down' },
    { key: '1', label: '1st Down' },
  ]
  return order.map((o) => ({ ...o, stat: src[o.key] as AggregatedStats | undefined }))
})

const fieldZoneRows = computed(() => {
  const src = partial.value?.aggregated_by_field_zone ?? {}
  const order: { key: string; label: string }[] = [
    { key: 'goal_line', label: 'Goal Line' },
    { key: 'red_zone', label: 'Red Zone' },
    { key: 'scoring_territory', label: 'Scoring Territory' },
    { key: 'own_territory', label: 'Own Territory' },
  ]
  return order.map((o) => ({ ...o, stat: src[o.key] as AggregatedStats | undefined }))
})

const defenseRows = computed(() => {
  const scenarios = partial.value?.per_scenario ?? []
  // Group scenarios by defense_play_label (set by backend for each source defense)
  const grouped: Record<string, { runs: number; successes: number; completions: number; yards: number[]; outcomes: Record<string, number> }> = {}
  for (const s of scenarios as any[]) {
    const key = s.defense_play_label || s.label || 'Defense'
    if (!grouped[key]) grouped[key] = { runs: 0, successes: 0, completions: 0, yards: [], outcomes: {} }
    const g = grouped[key]
    const n = s.n_runs ?? 0
    g.runs += n
    g.successes += (s.success_rate ?? 0) * n
    g.completions += (s.completion_rate ?? 0) * n
    const mean = s.yards_gained_stats?.mean ?? 0
    for (let i = 0; i < n; i++) g.yards.push(mean)
    for (const [outcome, rate] of Object.entries(s.outcome_distribution ?? {})) {
      g.outcomes[outcome] = (g.outcomes[outcome] ?? 0) + (rate as number) * n
    }
  }
  return Object.entries(grouped).map(([label, g]) => ({
    key: label,
    label,
    stat: {
      n_scenarios: Object.keys(grouped).length,
      n_iterations: g.runs,
      success_rate: g.runs > 0 ? g.successes / g.runs : 0,
      completion_rate: g.runs > 0 ? g.completions / g.runs : 0,
      yards_gained_stats: {
        mean: g.runs > 0 ? g.yards.reduce((a, b) => a + b, 0) / g.yards.length : 0,
        median: 0, std: 0, p25: 0, p75: 0, p95: 0,
      },
      outcome_distribution: g.runs > 0 ? Object.fromEntries(Object.entries(g.outcomes).map(([k, v]) => [k, v / g.runs])) : {},
      most_common_failure: '',
    } as AggregatedStats,
  }))
})

const receiverRows = computed(() => {
  const stats = partial.value?.per_receiver ?? []
  const nameMap = receiverNameMap.value
  const orderedIds = orderedReceiverIdsFromPlay.value
  return stats.map((rs, idx) => {
    const byId = nameMap[rs.receiver_id]
    const byIndex = orderedIds[idx] != null ? nameMap[orderedIds[idx]] : undefined
    return {
      ...rs,
      label: byId || byIndex || `Receiver ${idx + 1}`,
    }
  })
})

const combinedYardStats = computed(() => {
  const buckets = partial.value?.aggregated_by_down ?? {}
  const entries = Object.values(buckets) as AggregatedStats[]
  if (!entries.length) return null
  let total = 0
  let mean = 0
  let median = 0
  let p25 = 0
  let p75 = 0
  let p95 = 0
  for (const e of entries) {
    const stats = e?.yards_gained_stats
    if (!stats || typeof stats.mean !== 'number') continue
    const w = e.n_iterations || 0
    if (!w) continue
    total += w
    mean += (stats.mean ?? 0) * w
    median += (stats.median ?? 0) * w
    p25 += (stats.p25 ?? 0) * w
    p75 += (stats.p75 ?? 0) * w
    p95 += (stats.p95 ?? 0) * w
  }
  if (!total) return null
  return {
    mean: mean / total,
    median: median / total,
    p25: p25 / total,
    p75: p75 / total,
    p95: Math.max(p95 / total, 1),
  }
})

const totalIterations = computed(() => {
  if (!partial.value) return 0
  const buckets = partial.value.aggregated_by_down ?? {}
  return Object.values(buckets).reduce((sum, b: any) => sum + (b?.n_iterations ?? 0), 0)
})

const yardTicks = computed(() => {
  if (!combinedYardStats.value) return [0, 5, 10, 15, 20]
  const max = Math.max(combinedYardStats.value.p95, 1)
  const step = Math.max(5, Math.round(max / 4))
  return [0, step, step * 2, step * 3, step * 4]
})

function yardScale(v: number) {
  if (!combinedYardStats.value) return 24
  const max = Math.max(combinedYardStats.value.p95, 1)
  const minX = 24
  const maxX = 296
  const clamped = Math.min(Math.max(v, 0), max)
  return minX + ((maxX - minX) * clamped) / max
}

const worstScenarios = computed(() => {
  const list = partial.value?.worst_10_scenarios ?? []
  return [...list].sort((a, b) => {
    const rateA = a.completion_rate ?? a.success_rate ?? 0
    const rateB = b.completion_rate ?? b.success_rate ?? 0
    if (rateA !== rateB) return rateA - rateB
    const labelA = formatScenarioDisplay(a.label ?? '', a.defense_play_label) || ''
    const labelB = formatScenarioDisplay(b.label ?? '', b.defense_play_label) || ''
    return labelA.localeCompare(labelB)
  })
})

const OUTCOME_LABELS: Record<string, string> = {
  FLAG_PULLED: 'Flag pulled',
  INCOMPLETE: 'Incomplete pass',
  SACK: 'Sack',
  INTERCEPTION: 'Interception',
  OUT_OF_BOUNDS: 'Out of bounds',
  PASS_CLOCK_EXPIRED: 'Pass clock expired',
  SAFETY: 'Safety',
  TIMEOUT: 'Timeout',
}

function mostCommonFailure(scenario: any): string {
  const dist = scenario.outcome_distribution as Record<string, number> | undefined
  if (!dist) return 'Not enough data'
  const failures = Object.entries(dist).filter(([k]) => k !== 'TOUCHDOWN')
  if (failures.length === 0) return 'No failures recorded'
  const [key] = failures.reduce((best, cur) => (cur[1] > best[1] ? cur : best))
  return OUTCOME_LABELS[key] ?? (key != null ? String(key).replace(/_/g, ' ').toLowerCase() : 'unknown')
}

watch(
  () => job.status?.state,
  (state) => {
    if (state === 'COMPLETED') {
      if (overallSuccessRate.value < 50) {
        worstOpen.value = true
      }
      jobHistory.fetchJobs()
    }
  },
)

watch(
  () => route.path,
  (path) => {
    if (!path.startsWith('/blurai/playlab')) closeHistoryPanel()
  },
)

function toggleDefense(id: string) {
  if (!hasProAccess.value) {
    if (selectedDefenseIds.value[0] === id) selectedDefenseIds.value = []
    else selectedDefenseIds.value = [id]
    return
  }
  const idx = selectedDefenseIds.value.indexOf(id)
  if (idx === -1) selectedDefenseIds.value = [...selectedDefenseIds.value, id]
  else selectedDefenseIds.value = selectedDefenseIds.value.filter((x) => x !== id)
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

async function fetchPlays() {
  if (!user.value) return
  const { data: off } = await client
    .from('plays')
    .select('*, playbooks!inner(name)')
    .eq('user_id', user.value.id)
    .eq('play_type', 'offense')
    .order('name')
  if (off) {
    allOffensivePlays.value = off.map((p: any) => ({ ...p, _playbookName: p.playbooks?.name }))
  }
  const { data: def } = await client
    .from('plays')
    .select('*, playbooks!inner(name)')
    .eq('user_id', user.value.id)
    .eq('play_type', 'defense')
    .order('name')
  if (def) {
    allDefensePlays.value = def.map((p: any) => ({ ...p, _playbookName: p.playbooks?.name }))
  }
}

async function runSimulation() {
  const play = selectedPlay.value
  const fs = (fieldSettings.value ?? DEFAULT_FIELD_SETTINGS) as FieldSettings
  if (!play || !user.value) return

  rosterErrors.value = []
  defenseBasePlayerWarnings.value = []

  const teamId = primaryTeamId.value

  // Resolve offensive roster (still required — can't run without offensive starters)
  const offResult = await resolveRoster(play.canvas_data, 'offense', teamId)
  if (!offResult.success) {
    rosterErrors.value = offResult.errors
    return
  }

  // Resolve defensive rosters for ALL selected defensive plays
  const selectedDefPlays = selectedDefenseIds.value
    .map((id) => defensePlays.value.find((p) => p.id === id))
    .filter(Boolean) as typeof defensePlays.value
  if (selectedDefPlays.length === 0) return

  const defScenarios: { scenario_id: string; defensive_play: typeof play.canvas_data; defensive_players: any[]; label: string }[] = []
  const allWarnings: string[] = []
  for (const defPlay of selectedDefPlays) {
    const defResult = await resolveRosterWithFallback(defPlay.canvas_data, 'defense', teamId)
    allWarnings.push(...defResult.warnings)
    defScenarios.push({
      scenario_id: defPlay.id,
      defensive_play: defPlay.canvas_data,
      defensive_players: defResult.players,
      label: defPlay.name,
    })
  }
  defenseBasePlayerWarnings.value = allWarnings

  const effectiveIterations = Math.min(nIterations.value, maxIterationsForPlan.value)
  const effectiveScenarios = Math.min(nScenarios.value, nDefensePlays.value > 1 ? 1000 : maxScenariosForPlan.value)
  const defPlayNames = selectedDefPlays.map((p) => p.name).join(', ')
  const ok = await job.startJob(
    {
      offensive_play: play.canvas_data,
      defensive_play: null,
      defensive_players: [],
      defensive_scenarios: defScenarios,
      field_settings: fs,
      offensive_players: offResult.players,
      n_iterations: effectiveIterations,
      n_scenarios: effectiveScenarios,
      variation_seed: null,
      auto_generate: true,
    },
    {
      offensive_play_name: play.name,
      offensive_play_id: play.id,
      defensive_play_name: defPlayNames,
      defensive_play_id: selectedDefPlays[0].id,
      n_scenarios: effectiveScenarios * selectedDefPlays.length,
      n_iterations: effectiveIterations,
      auto_generate: true,
    }
  )
  if (ok) {
    jobReceiverNameMap.value = buildReceiverNameMap(play)
    jobOrderedReceiverIds.value = buildOrderedReceiverIds(play)
    configRailed.value = true
    job.startPolling()
    if (job.jobId) await navigateTo(`/blurai/playlab/${job.jobId}`)
  }
}

async function handleCancel() {
  await job.cancelJob()
  configRailed.value = false
  navigateTo('/blurai/playlab')
}

function handleRunAgain() {
  job.reset()
  configRailed.value = false
  navigateTo('/blurai/playlab')
}

function exportResults() {
  const data = job.result
  if (!data) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `play-lab-${job.jobId ?? 'results'}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(() => {
  isClient.value = true
  fetchSettings()
  fetchPlayers()
  fetchTeams()
  ensurePlaysLoaded()
  job.probeEngine()
})

onBeforeUnmount(() => {
  stopReplayPolling()
  insightsAbort?.abort()
})

watch(
  () => job.status?.state,
  (state) => {
    if (state === 'COMPLETED' || state === 'FAILED' || state === 'CANCELLED') job.stopPolling()
  }
)

const BreakdownRow = defineComponent({
  name: 'BreakdownRow',
  props: {
    label: { type: String, required: true },
    stat: { type: Object as () => AggregatedStats | undefined, required: false },
  },
  setup(props) {
    return () => {
      if (!props.stat) {
        return (
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{props.label}</span>
              <span>—</span>
            </div>
            <Skeleton class="h-1.5 w-full rounded-full" />
          </div>
        )
      }
      const compRate = props.stat?.completion_rate ?? 0
      const dist = props.stat?.outcome_distribution as Record<string, number> | undefined
      const tdPct = dist ? Math.round((dist.TOUCHDOWN ?? 0) * 100) : 0
      const intPct = dist ? Math.round((dist.INTERCEPTION ?? 0) * 100) : 0
      const incPct = dist ? Math.round((dist.INCOMPLETE ?? 0) * 100) : 0
      return (
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{props.label}</span>
            <span class="font-medium">{Math.round(compRate * 100)}% comp</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class={['h-full rounded-full transition-all', barColorClass(compRate)]}
              style={{ width: `${Math.max(5, compRate * 100)}%`, transition: 'width 0.6s ease' }}
            />
          </div>
          <div class="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-muted-foreground flex-wrap">
            <div class="flex items-center gap-1.5">
              {tdPct > 0 && <span class="text-emerald-500">{tdPct}% TD</span>}
              {intPct > 0 && <span class="text-destructive">{intPct}% INT</span>}
              {incPct > 0 && <span>{incPct}% INC</span>}
            </div>
            <span>
              {(props.stat?.n_iterations ?? 0).toLocaleString()} runs
            </span>
          </div>
        </div>
      )
    }
  },
})
</script>
