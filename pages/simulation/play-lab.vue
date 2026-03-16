<template>
  <div
    class="flex flex-col h-full min-h-0 bg-background text-foreground overflow-hidden"
    @click="maybeCloseHistoryPanel"
  >
    <div class="flex flex-1 min-h-0 min-w-0 flex-col">
      <div class="shrink-0 px-4 pt-4 lg:px-6 lg:pt-6 space-y-2">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight font-display">Play Lab</h2>
          <p class="text-sm text-muted-foreground mt-1">Stress test a single play against defensive scenarios</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="isPaidPro ? 'bg-primary/15 text-primary' : isTrialing ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ isPaidPro ? 'Pro' : isTrialing ? (trialDaysLeft > 0 ? `Trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : 'Trial') : 'Free' }} plan
            </span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/80 text-muted-foreground"
            >
              {{ hasProAccess ? 'Up to 1M' : '1K' }} iterations
            </span>
          </div>
        </div>
      </div>
      <div class="flex flex-1 min-h-0 flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6">
        <div
          class="flex items-stretch gap-0 shrink-0 transition-[width] duration-200 ease-out"
          :class="configRailed ? 'w-12' : 'w-full lg:w-[30%]'"
        >
          <aside
            class="w-full min-w-0 rounded-xl bg-card overflow-hidden shadow-md flex flex-col"
            @click.stop
          >
            <div v-show="!configRailed" class="p-4 lg:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 min-w-0">
          <div class="flex items-center justify-between gap-2 -mt-0.5">
            <p class="text-xs text-muted-foreground">Pick a play, defense, and run.</p>
            <TooltipProvider v-if="job?.jobId">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 shrink-0 -mr-1"
                    @click.stop="configRailed = true"
                  >
                    <ChevronDown class="h-4 w-4 rotate-90" />
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
              <span v-if="!hasProAccess" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary uppercase tracking-wide" title="Pro: multi-select">1 play</span>
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
                    <p>{{ hasProAccess ? 'Multi-select: choose one or more defensive plays to run against.' : 'Free plan: select one defensive play. Upgrade to Pro for multiple.' }}</p>
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

            <div class="space-y-2">
              <span class="text-xs font-medium text-muted-foreground">Attribute tier</span>
              <div class="grid grid-cols-4 gap-1.5">
                <div
                  v-for="tier in attributeTiersOrdered"
                  :key="tier.id"
                  class="flex flex-col items-center gap-0.5"
                >
                  <span class="text-[9px] font-semibold uppercase tracking-wider" :class="(tier.id === 'poor' || tier.id === 'average') ? 'text-muted-foreground' : 'text-primary'">
                    {{ (tier.id === 'poor' || tier.id === 'average') ? 'Free' : 'Pro' }}
                  </span>
                  <button
                    type="button"
                    class="w-full flex flex-col items-center justify-center gap-0 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors"
                    :class="[
                      attributeTier === tier.id
                        ? 'border-primary/50 bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      (configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))) && 'pointer-events-none opacity-50 cursor-not-allowed'
                    ]"
                    :disabled="configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))"
                    :title="attributeTiers.find(t => t.id === tier.id)?.description"
                    @click="(configLocked || (!hasProAccess && (tier.id === 'as_is' || tier.id === 'elite'))) || (attributeTier = tier.id)"
                  >
                    {{ tier.label }}
                  </button>
                </div>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ attributeTiers.find(t => t.id === attributeTier)?.description }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Run configuration</h2>
              <span v-if="!hasProAccess" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wide">1K max</span>
            </div>
            <div class="space-y-1.5">
              <span class="text-xs font-medium">Iterations</span>
              <div class="flex gap-1.5 items-end flex-wrap">
                <div
                  v-for="n in iterationOptions"
                  :key="n"
                  class="flex flex-col items-center gap-0.5"
                >
                  <span class="text-[9px] font-semibold uppercase tracking-wider" :class="n === 1000 ? 'text-muted-foreground' : 'text-primary'">
                    {{ n === 1000 ? 'Free' : 'Pro' }}
                  </span>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                    :class="[
                      !isIterationAllowed(n) && 'opacity-50 cursor-not-allowed',
                      configLocked && 'pointer-events-none opacity-60',
                      nIterations === n ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : isIterationAllowed(n) ? 'bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground' : 'bg-muted/30 text-muted-foreground'
                    ]"
                    :disabled="configLocked || !isIterationAllowed(n)"
                    @click="isIterationAllowed(n) && (nIterations = n)"
                  >
                    {{ n >= 1e6 ? '1M' : n >= 1e5 ? '100K' : n >= 1e4 ? '10K' : '1K' }}
                  </button>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">{{ iterationTimeHint }}</p>
              <p v-if="!hasProAccess" class="text-xs text-muted-foreground">
                <NuxtLink to="/settings?tab=billing" class="text-primary hover:underline">Upgrade to Pro</NuxtLink> for 10K–1M iterations.
              </p>
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
            <div v-if="rosterErrors.length > 0" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 space-y-1">
              <p class="text-xs font-medium text-amber-800 dark:text-amber-300">Roster issues — assign starters in Squad first:</p>
              <ul class="space-y-0.5">
                <li v-for="e in rosterErrors" :key="e.canvas_player_id" class="text-xs text-amber-700 dark:text-amber-400">
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
        <template v-if="!job?.jobId">
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <svg class="w-20 h-20 text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 class="text-lg font-semibold font-display">Run a simulation to see results</h2>
            <p class="text-sm text-muted-foreground mt-1 max-w-sm">Select a play and configure your scenarios to get started</p>
          </div>
        </template>

        <template v-else-if="job?.status?.state === 'FAILED'">
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p class="text-destructive font-medium">{{ job?.status?.error ?? 'Job failed' }}</p>
            <Button class="mt-4" variant="outline" @click="handleRunAgain">Start over</Button>
          </div>
        </template>

        <template v-else>
          <div class="flex-1 p-4 lg:p-6 space-y-6">
            <!-- Row 1: Status card (left) + Progress card (right) -->
            <section class="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-4">
              <!-- Left: play name, status text, scenario count, streaming info, buttons -->
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex flex-col justify-center gap-3 shadow-md">
                <div>
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

                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-[11px] text-muted-foreground shrink-0">
                    {{ scenariosCompleted }} of {{ scenariosTotal }} scenarios complete
                  </span>
                  <div class="h-1.5 rounded-full bg-muted overflow-hidden flex-1 min-w-[80px] max-w-[200px]">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="progressBarStyle"
                    />
                  </div>
                  <span v-if="!job?.isLoadedResult" class="text-[11px] text-muted-foreground shrink-0">{{ formatElapsed(job?.elapsedSeconds ?? 0) }}</span>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3">
                  <p class="text-xs text-muted-foreground">
                    Streaming live results as scenarios complete. You can cancel at any time.
                  </p>
                  <div class="flex items-center gap-2">
                    <Button
                      v-if="job?.status?.state === 'RUNNING' || job?.status?.state === 'PENDING'"
                      variant="outline"
                      size="sm"
                      @click="handleCancel"
                    >
                      Cancel
                    </Button>
                    <template v-if="job?.status?.state === 'COMPLETED'">
                      <Button variant="outline" size="sm" @click="handleRunAgain">Run Again</Button>
                      <Button variant="secondary" size="sm" @click="exportResults">Export Results</Button>
                    </template>
                  </div>
                </div>

                <div
                  v-if="job?.status?.state === 'COMPLETED' && scenariosTotal > 0"
                  class="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary shadow-sm"
                >
                  Simulation complete — {{ nIterations.toLocaleString() }} iterations across {{ scenariosTotal }} scenarios.
                </div>
                <p
                  v-if="job?.status?.clamped && job?.status?.clamped_iterations != null"
                  class="text-xs text-muted-foreground"
                >
                  Iterations reduced to {{ job?.status?.clamped_iterations?.toLocaleString() }} (server maximum)
                </p>
              </div>

              <!-- Right: circular progress only -->
              <div class="rounded-xl bg-card/80 px-4 py-4 lg:px-6 lg:py-5 flex items-center justify-center shadow-md">
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
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ confidenceLabel }}
                    </p>
                  </div>
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
                <h3 class="text-sm font-medium">Vs Rush</h3>
                <div class="space-y-2">
                  <BreakdownRow
                    v-for="row in rushRows"
                    :key="row.key"
                    :label="row.label"
                    :stat="row.stat"
                  />
                </div>
              </div>

              <div class="rounded-xl bg-card/80 p-5 lg:p-6 space-y-4 shadow-md">
                <h3 class="text-sm font-medium">Vs Press</h3>
                <div class="space-y-2">
                  <BreakdownRow
                    v-for="row in pressRows"
                    :key="row.key"
                    :label="row.label"
                    :stat="row.stat"
                  />
                </div>
              </div>
            </section>

            <!-- PART 3: Yards distribution -->
            <section class="rounded-xl bg-card/80 p-4 space-y-3 shadow-md">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-medium">Yards Gained Distribution</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Based on {{ totalIterations }} completed iterations so far
                  </p>
                </div>
              </div>
              <div class="mt-2 h-32 flex items-center justify-center" v-if="!combinedYardStats">
                <span class="text-xs text-muted-foreground">Waiting for enough data to estimate distribution…</span>
              </div>
              <div v-else class="mt-2">
                <svg viewBox="0 0 320 80" class="w-full h-32">
                  <line x1="24" y1="60" x2="296" y2="60" class="stroke-muted" stroke-width="1" />
                  <rect
                    :x="yardScale(combinedYardStats.p25)"
                    y="40"
                    :width="Math.max(4, yardScale(combinedYardStats.p75) - yardScale(combinedYardStats.p25))"
                    height="20"
                    class="fill-primary/30"
                  />
                  <line
                    :x1="yardScale(combinedYardStats.median)"
                    y1="36"
                    :x2="yardScale(combinedYardStats.median)"
                    y2="64"
                    class="stroke-primary"
                    stroke-width="2"
                  />
                  <circle
                    :cx="yardScale(combinedYardStats.mean)"
                    cy="50"
                    r="3"
                    class="fill-primary"
                  />
                  <line
                    :x1="yardScale(combinedYardStats.p95)"
                    y1="46"
                    :x2="yardScale(combinedYardStats.p95)"
                    y2="64"
                    class="stroke-muted-foreground/60"
                    stroke-width="1.5"
                    stroke-dasharray="2 2"
                  />
                  <text
                    v-for="tick in yardTicks"
                    :key="tick"
                    :x="yardScale(tick)"
                    y="72"
                    class="text-[10px] fill-muted-foreground"
                    text-anchor="middle"
                  >
                    {{ tick }}
                  </text>
                </svg>
              </div>
            </section>

            <!-- PART 4: Worst scenarios panel -->
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
                  Waiting for enough scenarios to identify weak spots…
                </div>
                <div
                  v-for="s in worstScenarios"
                  :key="s.scenario_id"
                  class="rounded-lg bg-background/60 px-3 py-2.5 space-y-1.5 shadow-sm"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-medium truncate">
                      {{ s.label || 'Scenario' }}
                    </p>
                    <span class="text-[11px] text-muted-foreground">
                      {{ Math.round((s.success_rate ?? 0) * 100) }}%
                    </span>
                  </div>
                  <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="barColorClass(s.success_rate ?? 0)"
                      :style="{ width: `${Math.max(5, (s.success_rate ?? 0) * 100)}%`, transition: 'width 0.6s ease' }"
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
          </div>
        </template>
        <template #fallback>
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <svg class="w-20 h-20 text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 class="text-lg font-semibold font-display">Run a simulation to see results</h2>
            <p class="text-sm text-muted-foreground mt-1 max-w-sm">Select a play and configure your scenarios to get started</p>
          </div>
        </template>
        </ClientOnly>
      </main>
    </div>
    </div>
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
import { Search, ChevronDown } from 'lucide-vue-next'
import type { AggregatedStats } from '~/composables/usePlayLabJob'
import type { RosterError } from '~/composables/useSimRoster'
import { DEFAULT_FIELD_SETTINGS } from '~/lib/constants'

interface PlayWithPb extends Play {
  _playbookName?: string
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
const { hasProAccess, isPaidPro, isTrialing, trialDaysLeft } = usePlanAccess()
const { settings: fieldSettings, fetchSettings } = useFieldSettings()

/** Free: Poor, Average, As-Is, Elite. Pro/trial: As-Is, Poor, Average, Elite. */
const attributeTiersOrdered = computed(() => {
  const order = hasProAccess.value ? ['as_is', 'poor', 'average', 'elite'] : ['poor', 'average', 'as_is', 'elite']
  return order.map((id) => attributeTiers.find((t) => t.id === id)).filter(Boolean) as typeof attributeTiers
})

/** Everyone sees all options; Free can only select 1K */
const iterationOptions = [1000, 10000, 100000, 1000000]
const isIterationAllowed = (n: number) => n === 1000 || hasProAccess.value
const maxIterationsForPlan = computed(() => (hasProAccess.value ? 1000000 : 1000))
const { players, fetchPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()
const { resolveRoster } = useSimRoster(teams)
const job = reactive(usePlayLabJob())
const { isOpen: historyPanelOpen, close: closeHistoryPanel } = useSimHistoryPanel()
const jobHistory = useJobHistory()
const worstOpen = ref(false)
const displayedSuccessRate = ref(0)
const configRailed = ref(false)
const rosterErrors = ref<RosterError[]>([])

const configLocked = computed(() => !!job?.jobId)

const playSearchQuery = ref('')
const playDropdownOpen = ref(false)
const selectedPlayId = ref<string>('')
const defenseSearchQuery = ref('')
const defenseDropdownOpen = ref(false)
const selectedDefenseIds = ref<string[]>([])
const attributeTier = ref('as_is')
const nIterations = ref(1000)

function maybeCloseHistoryPanel() {
  if (historyPanelOpen.value) closeHistoryPanel()
}

watch(
  () => route.query.job,
  async (queryJobId, oldJobId) => {
    if (!queryJobId || typeof queryJobId !== 'string') {
      if (oldJobId) {
        job.reset()
        configRailed.value = false
        selectedPlayId.value = ''
        selectedDefenseIds.value = []
        nIterations.value = 1000
      }
      return
    }
    if (job.jobId === queryJobId) return
    const status = await job.getJobStatus(queryJobId)
    if (status?.state === 'COMPLETED' || status?.state === 'FAILED') {
      const ok = await job.loadResult(queryJobId)
      if (ok && job.loadedJobStatus?.job_metadata) {
        const meta = job.loadedJobStatus.job_metadata
        if (meta.offensive_play_id) selectedPlayId.value = meta.offensive_play_id
        if (meta.defensive_play_id) selectedDefenseIds.value = [meta.defensive_play_id]
        if (meta.n_iterations) nIterations.value = Math.min(meta.n_iterations, maxIterationsForPlan.value)
      }
    } else {
      job.attachToJob(queryJobId)
    }
  },
  { immediate: true },
)

watch([nIterations, maxIterationsForPlan], () => {
  if (nIterations.value > maxIterationsForPlan.value) {
    nIterations.value = maxIterationsForPlan.value
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

const canRun = computed(() => {
  if (!selectedPlayId.value || !selectedPlay.value) return false
  if (selectedDefenseIds.value.length === 0) return false
  if (rosterErrors.value.length > 0) return false
  return true
})

const iterationTimeHint = computed(() => {
  const n = nIterations.value
  if (n <= 1000) return '~5 seconds'
  if (n <= 10000) return '~30 seconds'
  if (n <= 100000) return '~5 minutes'
  return '~30 minutes'
})

const partial = computed(() => job.partialResult)

const scenariosCompleted = computed(() => partial.value?.scenarios_completed ?? 0)
const scenariosTotal = computed(() => partial.value?.scenarios_total ?? 0)

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

watch(
  overallSuccessRate,
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

const ringColor = computed(() => {
  const rate = overallSuccessRate.value
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

const rushRows = computed(() => {
  const src = partial.value?.aggregated_by_rush_count ?? {}
  const order: { key: string; label: string }[] = [
    { key: '0', label: 'No Rush' },
    { key: '1', label: '1 Rusher' },
    { key: '2', label: '2 Rushers' },
  ]
  return order.map((o) => ({ ...o, stat: src[o.key] as AggregatedStats | undefined }))
})

const pressRows = computed(() => {
  const src = partial.value?.aggregated_by_press_rate_bucket ?? {}
  const order: { key: string; label: string }[] = [
    { key: 'high', label: 'Heavy Press' },
    { key: 'medium', label: 'Mixed Press' },
    { key: 'low', label: 'Light Press' },
  ]
  return order.map((o) => ({ ...o, stat: src[o.key] as AggregatedStats | undefined }))
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
    const w = e.n_iterations || 0
    if (!w) continue
    total += w
    mean += e.yards_gained_stats.mean * w
    median += e.yards_gained_stats.median * w
    p25 += e.yards_gained_stats.p25 * w
    p75 += e.yards_gained_stats.p75 * w
    p95 += e.yards_gained_stats.p95 * w
  }
  if (!total) return null
  return {
    mean: mean / total,
    median: median / total,
    p25: p25 / total,
    p75: p75 / total,
    p95: p95 / total,
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
  return [...list].sort((a, b) => (a.success_rate ?? 0) - (b.success_rate ?? 0))
})

const OUTCOME_LABELS: Record<string, string> = {
  FLAG_PULLED: 'Flag pulled',
  INCOMPLETE: 'Incomplete pass',
  SACK: 'Sack',
  INTERCEPTION: 'Interception',
  OUT_OF_BOUNDS: 'Out of bounds',
  TIMEOUT: 'Timeout',
}

function mostCommonFailure(scenario: any): string {
  const dist = scenario.outcome_distribution as Record<string, number> | undefined
  if (!dist) return 'Not enough data'
  const failures = Object.entries(dist).filter(([k]) => k !== 'TOUCHDOWN')
  if (failures.length === 0) return 'No failures recorded'
  const [key] = failures.reduce((best, cur) => (cur[1] > best[1] ? cur : best))
  return OUTCOME_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase()
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
    if (path !== '/simulation/play-lab') closeHistoryPanel()
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

  // Pick the first real (non-Free Agent) team for roster resolution
  const teamId = teams.value.find((t) => t.name !== 'Free Agent')?.id ?? teams.value[0]?.id ?? ''

  // Resolve offensive roster
  const offResult = await resolveRoster(play.canvas_data, 'offense', teamId)
  if (!offResult.success) {
    rosterErrors.value = offResult.errors
    return
  }

  // Resolve defensive roster from first selected defensive play
  const firstDefPlay = defensePlays.value.find((p) => p.id === selectedDefenseIds.value[0])
  if (!firstDefPlay) return

  const defResult = await resolveRoster(firstDefPlay.canvas_data, 'defense', teamId)
  if (!defResult.success) {
    rosterErrors.value = defResult.errors
    return
  }

  const effectiveIterations = Math.min(nIterations.value, maxIterationsForPlan.value)
  const ok = await job.startJob(
    {
      offensive_play: play.canvas_data,
      defensive_play: firstDefPlay.canvas_data,
      defensive_players: defResult.players,
      field_settings: fs,
      offensive_players: offResult.players,
      n_iterations: effectiveIterations,
      variation_seed: null,
      auto_generate: true,
    },
    {
      offensive_play_name: play.name,
      offensive_play_id: play.id,
      defensive_play_name: firstDefPlay.name,
      defensive_play_id: firstDefPlay.id,
      n_scenarios: selectedDefenseIds.value.length,
      n_iterations: effectiveIterations,
    }
  )
  if (ok) {
    configRailed.value = true
    job.startPolling()
    if (job.jobId) await navigateTo({ path: '/simulation/play-lab', query: { job: job.jobId } })
  }
}

function handleCancel() {
  job.cancelJob()
}

function handleRunAgain() {
  job.reset()
  configRailed.value = false
  navigateTo({ path: '/simulation/play-lab', query: {} }, { replace: true })
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
  fetchSettings()
  fetchPlayers()
  fetchTeams()
  fetchPlays()
  job.probeEngine()
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
    return () =>
      props.stat ? (
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{props.label}</span>
            <span>{Math.round((props.stat?.success_rate ?? 0) * 100)}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class={['h-full rounded-full transition-all', barColorClass(props.stat?.success_rate ?? 0)]}
              style={{ width: `${Math.max(5, (props.stat?.success_rate ?? 0) * 100)}%`, transition: 'width 0.6s ease' }}
            />
          </div>
          <div class="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span class="inline-flex items-center rounded-full border border-border/80 px-1.5 py-0.5 truncate max-w-[70%]">
              {props.stat?.most_common_failure || 'Not enough failures yet'}
            </span>
            <span class="text-[10px]">
              {props.stat?.n_scenarios ?? 0} scens · {(props.stat?.n_iterations ?? 0).toLocaleString()} iters
            </span>
          </div>
        </div>
      ) : (
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{props.label}</span>
            <span>—</span>
          </div>
          <Skeleton class="h-1.5 w-full rounded-full" />
        </div>
      )
  },
})
</script>
