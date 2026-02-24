<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col !p-0 gap-0" :show-close-button="false">
      <!-- Step indicator -->
      <div class="flex-none flex items-center justify-between px-6 py-4 border-b border-border">
        <div class="flex items-center gap-2">
          <button
            v-for="(step, i) in steps"
            :key="step.id"
            class="tutorial-dot"
            :class="{ 'tutorial-dot--active': i === currentStep, 'tutorial-dot--done': i < currentStep }"
            :aria-label="`Step ${i + 1}: ${step.title}`"
            @click="currentStep = i"
          />
        </div>
        <button
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          @click="handleSkip"
        >
          Skip tutorial
        </button>
      </div>

      <!-- Content area (scrollable) -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <Transition name="tutorial-slide" mode="out-in">
          <div :key="steps[currentStep].id" class="tutorial-step">
            <h2 class="text-xl font-semibold font-display mb-2">{{ steps[currentStep].title }}</h2>
            <p class="text-muted-foreground text-sm mb-6 leading-relaxed">{{ steps[currentStep].description }}</p>

            <!-- Animated illustration per step -->
            <div class="tutorial-illustration mb-6">
              <!-- Step 0: Welcome -->
              <div v-if="currentStep === 0" class="tutorial-welcome flex flex-col items-center justify-center py-8">
                <div class="tutorial-logo-box mb-4">
                  <span class="font-copernicus text-2xl font-bold text-foreground">FlagOS</span>
                  <span class="px-2 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary ml-2">Beta</span>
                </div>
                <div class="flex gap-4 animate-pulse-slow">
                  <div class="tutorial-icon-card tutorial-icon-card--orange">
                    <Swords class="w-6 h-6" />
                  </div>
                  <div class="tutorial-icon-card tutorial-icon-card--green">
                    <Shield class="w-6 h-6" />
                  </div>
                  <div class="tutorial-icon-card tutorial-icon-card--blue">
                    <Users class="w-6 h-6" />
                  </div>
                </div>
              </div>

              <!-- Step 1: Dashboard -->
              <div v-else-if="currentStep === 1" class="tutorial-dashboard">
                <div class="tutorial-dashboard-stats flex gap-2 mb-3">
                  <div v-for="i in 4" :key="i" class="tutorial-stat-card animate-in fade-in" :style="{ animationDelay: `${(i - 1) * 100}ms` }" />
                </div>
                <div class="tutorial-dashboard-list space-y-2">
                  <div v-for="i in 3" :key="i" class="tutorial-list-item animate-in fade-in" :style="{ animationDelay: `${300 + (i - 1) * 80}ms` }" />
                </div>
              </div>

              <!-- Step 2: Play Designer -->
              <div v-else-if="currentStep === 2" class="tutorial-play-designer">
                <div class="tutorial-field-mini">
                  <div class="tutorial-field-bg" />
                  <div class="tutorial-field-los" />
                  <div class="tutorial-field-players">
                    <div v-for="(p, i) in fieldPlayers" :key="i" class="tutorial-player-dot" :style="{ left: p.x + '%', top: p.y + '%', background: p.color }" />
                  </div>
                  <div class="tutorial-route-demo" />
                </div>
              </div>

              <!-- Step 3: Squad -->
              <div v-else-if="currentStep === 3" class="tutorial-squad">
                <div class="tutorial-table">
                  <div class="tutorial-table-header">
                    <span>Name</span>
                    <span>#</span>
                    <span>OFF</span>
                    <span>DEF</span>
                  </div>
                  <div v-for="i in 4" :key="i" class="tutorial-table-row animate-in fade-in" :style="{ animationDelay: `${(i - 1) * 100}ms` }" />
                </div>
              </div>

              <!-- Step 4: Settings -->
              <div v-else-if="currentStep === 4" class="tutorial-settings">
                <div class="tutorial-settings-cards space-y-2">
                  <div v-for="i in 3" :key="i" class="tutorial-settings-row animate-in fade-in" :style="{ animationDelay: `${(i - 1) * 120}ms` }" />
                </div>
              </div>
            </div>

            <!-- Bullet list for current step -->
            <ul v-if="steps[currentStep].bullets?.length" class="space-y-2 text-sm text-muted-foreground mb-6">
              <li v-for="(bullet, i) in steps[currentStep].bullets" :key="i" class="flex items-start gap-2">
                <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{{ bullet }}</span>
              </li>
            </ul>
          </div>
        </Transition>
      </div>

      <!-- Footer -->
      <div class="flex-none flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
        <Button
          v-if="currentStep > 0"
          variant="ghost"
          size="sm"
          @click="currentStep--"
        >
          Back
        </Button>
        <div v-else />
        <div class="flex gap-2">
          <Button
            v-if="currentStep < steps.length - 1"
            @click="currentStep++"
          >
            Next
          </Button>
          <Button
            v-else
            @click="handleComplete"
          >
            Get started
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Swords, Shield, Users, Check } from 'lucide-vue-next'

const { open, markTutorialComplete, hideTutorial } = useTutorial()

const currentStep = ref(0)

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to FlagOS',
    description: 'FlagOS is your flag football command center. Design plays, manage your roster, and build your playbook — all in one place.',
    bullets: [
      'Visual play designer with drag-and-drop routes',
      'Team and player management with smart Auto Start',
      'Customize field dimensions and default settings',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your home base. See stats at a glance: play count, players, and team overview. Recent plays are one click away.',
    bullets: [
      'Quick stats for plays, players, and teams',
      'Recent plays for fast access',
      'Primary team overview with starter counts',
    ],
  },
  {
    id: 'play-designer',
    title: 'Playbooks & Play Designer',
    description: 'Organize plays in playbooks. Create offensive and defensive plays with the visual designer — draw routes, assign players, and overlay ghost defense.',
    bullets: [
      'Draw routes (straight, curve, option) with the toolbar',
      'Drag players to position them on the field',
      'Use ghost defense to see your offense vs. a defensive play',
      'Suggest Play uses AI to generate routes from a description',
    ],
  },
  {
    id: 'squad',
    title: 'Squad (Locker Room)',
    description: 'Add players, manage teams, and assign positions. Use Auto Start to pick your best lineup based on player attributes.',
    bullets: [
      'Add players with full attribute control',
      'Assign offense and defense positions per player',
      'Auto Start picks optimal starters from your roster',
      'Bulk import from CSV for fast roster setup',
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Tailor FlagOS to your league. Set field dimensions, default starters, theme, and more.',
    bullets: [
      'Field: length, width, endzone, line of scrimmage',
      'General: default starters, play view, theme',
      'Team: set your primary team for play creation',
    ],
  },
]

const fieldPlayers = [
  { x: 48, y: 72, color: '#f97316' },
  { x: 48, y: 52, color: '#f59e0b' },
  { x: 25, y: 52, color: '#22c55e' },
  { x: 70, y: 52, color: '#22c55e' },
  { x: 60, y: 52, color: '#22c55e' },
]

function handleOpenChange(value: boolean) {
  if (!value) hideTutorial()
}

function handleSkip() {
  markTutorialComplete()
}

function handleComplete() {
  markTutorialComplete()
}
</script>

<style scoped>
.tutorial-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground) / 0.3);
  transition: all 0.2s ease;
}
.tutorial-dot:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
.tutorial-dot--active {
  width: 24px;
  border-radius: 4px;
  background: hsl(var(--primary));
}
.tutorial-dot--done {
  background: hsl(var(--primary) / 0.6);
}

.tutorial-slide-enter-active,
.tutorial-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tutorial-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.tutorial-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.tutorial-icon-card {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.tutorial-icon-card--orange {
  background: linear-gradient(135deg, #f97316, #ea580c);
}
.tutorial-icon-card--green {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}
.tutorial-icon-card--blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}

.tutorial-dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.tutorial-stat-card {
  height: 56px;
  border-radius: 10px;
  background: hsl(var(--muted) / 0.8);
}
.tutorial-list-item {
  height: 44px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.6);
}

.tutorial-play-designer {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
.tutorial-field-mini {
  position: relative;
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
}
.tutorial-field-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #c62828 0%, #2d7a45 15%, #2d7a45 85%, #c62828 100%);
}
.tutorial-field-los {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: #f97316;
  opacity: 0.9;
}
.tutorial-field-players {
  position: absolute;
  inset: 0;
}
.tutorial-player-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
  transform: translate(-50%, -50%);
  animation: player-pulse 1.5s ease-in-out infinite;
}
.tutorial-player-dot:nth-child(1) { animation-delay: 0s; }
.tutorial-player-dot:nth-child(2) { animation-delay: 0.2s; }
.tutorial-player-dot:nth-child(3) { animation-delay: 0.4s; }
.tutorial-player-dot:nth-child(4) { animation-delay: 0.6s; }
.tutorial-player-dot:nth-child(5) { animation-delay: 0.8s; }
@keyframes player-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.15); }
}
.tutorial-route-demo {
  position: absolute;
  left: 25%;
  top: 52%;
  width: 50%;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 1px;
  transform-origin: left;
  animation: route-draw 2s ease-in-out infinite;
}
@keyframes route-draw {
  0% { transform: scaleX(0); opacity: 0.5; }
  50% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 1; }
}

.tutorial-table {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}
.tutorial-table-header {
  display: grid;
  grid-template-columns: 1fr 40px 60px 60px;
  gap: 12px;
  padding: 8px 12px;
  background: hsl(var(--muted));
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}
.tutorial-table-row {
  height: 36px;
  display: grid;
  grid-template-columns: 1fr 40px 60px 60px;
  gap: 12px;
  padding: 0 12px;
  align-items: center;
  background: hsl(var(--muted) / 0.3);
  border-top: 1px solid hsl(var(--border) / 0.5);
}
.tutorial-table-row::before {
  content: '';
  width: 60%;
  height: 10px;
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

.tutorial-settings-row {
  height: 44px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.5);
}
</style>
