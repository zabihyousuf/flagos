<template>
  <div class="settings-layout flex flex-col xl:flex-row min-h-0 h-full overflow-hidden">
    <!-- Vertical Tab Navigation (fixed; does not scroll) -->
    <nav class="settings-nav w-44 shrink-0 xl:w-[180px] xl:min-w-[180px]">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="settings-nav-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="settings-nav-icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Content Area (left-align all tabs except Field; no scroll on Field tab) -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0">
    <div class="settings-content flex-1" :class="{ 'settings-content--left': activeTab !== 'field', 'settings-content--field': activeTab === 'field' }">
      <!-- Loading (only on initial fetch when we don't have settings yet) -->
      <div v-if="loading && activeTab === 'field' && !settings" class="settings-placeholder">
        <div class="flex flex-col items-center gap-2">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="text-muted-foreground">Loading settings...</span>
        </div>
      </div>

      <!-- General Tab -->
      <template v-if="settings && activeTab === 'general'">
        <div class="settings-panel general-panel">
          <div class="config-header">
            <h2 class="text-lg font-semibold tracking-tight font-display">General</h2>
            <p class="text-muted-foreground text-sm">Defaults for the play designer and app behavior.</p>
          </div>

          <div class="general-rows">
            <!-- Theme: Light / Dark / System -->
            <div class="general-row">
              <Label class="general-label">Appearance</Label>
              <div class="general-control">
                <div class="flex items-center bg-muted rounded-md p-0.5 w-fit gap-0.5">
                  <button
                    type="button"
                    class="px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center gap-1.5"
                    :class="(effectiveTheme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')"
                    @click="setTheme('light')"
                  >
                    <Sun class="w-3.5 h-3.5 shrink-0" />
                    Light
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center gap-1.5"
                    :class="(effectiveTheme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')"
                    @click="setTheme('dark')"
                  >
                    <Moon class="w-3.5 h-3.5 shrink-0" />
                    Dark
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors flex items-center gap-1.5"
                    :class="(effectiveTheme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')"
                    @click="setTheme('system')"
                  >
                    <Monitor class="w-3.5 h-3.5 shrink-0" />
                    System
                  </button>
                </div>
                <p class="text-xs text-muted-foreground mt-1.5">System follows your device light/dark setting.</p>
              </div>
            </div>

            <!-- Default play view -->
            <div class="general-row">
              <Label class="general-label">Default play view</Label>
              <div class="general-control">
                <div class="flex items-center bg-muted rounded-md p-0.5 w-fit">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[12px] font-medium rounded transition-colors flex items-center"
                    :class="(settings.default_play_view ?? 'fit') === 'fit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                    @click="updateSettings({ default_play_view: 'fit' })"
                  >
                    <Maximize2 class="w-3 h-3 shrink-0 mr-1" />
                    Fit
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[12px] font-medium rounded transition-colors flex items-center"
                    :class="(settings.default_play_view ?? 'fit') === 'full' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                    @click="updateSettings({ default_play_view: 'full' })"
                  >
                    <Fullscreen class="w-3 h-3 shrink-0 mr-1" />
                    Full
                  </button>
                </div>
              </div>
            </div>

            <!-- Default starting play type -->
            <div class="general-row">
              <Label class="general-label">Default starting play type</Label>
              <div class="general-control">
                <div class="flex items-center bg-muted rounded-full p-0.5 w-fit">
                  <button
                    type="button"
                    class="px-2 py-0.5 text-[12px] font-medium rounded-full transition-colors flex items-center gap-1"
                    :class="(settings.default_play_type ?? 'offense') === 'offense'
                      ? 'bg-primary/15 text-primary shadow-sm border border-primary/30'
                      : 'text-primary/70 hover:bg-primary/10 hover:text-primary'"
                    @click="setDefaultPlayType('offense')"
                  >
                    <Swords class="w-3 h-3 shrink-0" />
                    Offensive
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 text-[12px] font-medium rounded-full transition-colors flex items-center gap-1"
                    :class="(settings.default_play_type ?? 'offense') === 'defense'
                      ? 'bg-destructive/15 text-destructive shadow-sm border border-destructive/30'
                      : 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive'"
                    @click="setDefaultPlayType('defense')"
                  >
                    <ShieldIcon class="w-3 h-3 shrink-0" />
                    Defensive
                  </button>
                </div>
              </div>
            </div>

            <!-- Ghost defense: radio None | Show with default play (disabled when default type is defense) -->
            <div class="general-row" :class="{ 'general-row--disabled': (settings.default_play_type ?? 'offense') === 'defense' }">
              <Label class="general-label">Offensive plays with ghost defense</Label>
              <div class="general-control">
                <div class="general-radio-group" role="radiogroup" :aria-disabled="(settings.default_play_type ?? 'offense') === 'defense'">
                  <label class="general-radio-option" :class="{ 'opacity-50 pointer-events-none': (settings.default_play_type ?? 'offense') === 'defense' }">
                    <input
                      type="radio"
                      name="ghost-default"
                      :checked="(settings.default_play_type ?? 'offense') === 'defense' ? true : !showGhostDefense"
                      :disabled="(settings.default_play_type ?? 'offense') === 'defense'"
                      class="general-radio-input"
                      @change="setGhostDefense(false)"
                    />
                    <span class="general-radio-dot" />
                    <span class="general-radio-label">None</span>
                  </label>
                  <label class="general-radio-option" :class="{ 'opacity-50 pointer-events-none': (settings.default_play_type ?? 'offense') === 'defense' }">
                    <input
                      type="radio"
                      name="ghost-default"
                      :checked="(settings.default_play_type ?? 'offense') !== 'defense' && showGhostDefense"
                      :disabled="(settings.default_play_type ?? 'offense') === 'defense'"
                      class="general-radio-input"
                      @change="setGhostDefense(true)"
                    />
                    <span class="general-radio-dot" />
                    <span class="general-radio-label">Show with default play</span>
                  </label>
                </div>
                <p v-if="(settings.default_play_type ?? 'offense') === 'defense'" class="text-xs text-muted-foreground mt-1.5">Only applies when default play type is Offensive.</p>
                <template v-else-if="showGhostDefense">
                  <p class="text-xs text-muted-foreground mt-2 mb-1.5">Choose the default play below.</p>
                  <Select
                    :model-value="settings.default_ghost_defense_play_id ?? '__none__'"
                    @update:model-value="(v: string) => updateSettings({ default_ghost_defense_play_id: v === '__none__' ? null : v })"
                  >
                    <SelectTrigger class="w-full max-w-[240px]">
                      <SelectValue placeholder="Select a defensive play" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem v-for="p in defensePlaysForDefault" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="defensePlaysForDefault.length === 0 && !defensePlaysLoading" class="text-xs text-muted-foreground mt-1">No defensive plays yet. Create one first.</p>
                </template>
              </div>
            </div>

            <!-- Show player names on field: radio Show | Hide -->
            <div class="general-row">
              <Label class="general-label">Player names on field</Label>
              <div class="general-control">
                <div class="general-radio-group" role="radiogroup">
                  <label class="general-radio-option">
                    <input
                      type="radio"
                      name="player-names"
                      :checked="settings.show_player_names_on_canvas !== false"
                      class="general-radio-input"
                      @change="updateSettings({ show_player_names_on_canvas: true })"
                    />
                    <span class="general-radio-dot" />
                    <span class="general-radio-label">Show</span>
                  </label>
                  <label class="general-radio-option">
                    <input
                      type="radio"
                      name="player-names"
                      :checked="settings.show_player_names_on_canvas === false"
                      class="general-radio-input"
                      @change="updateSettings({ show_player_names_on_canvas: false })"
                    />
                    <span class="general-radio-dot" />
                    <span class="general-radio-label">Hide</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Default player label inside marker (for new players / when not set per play) -->
            <div class="general-row">
              <Label class="general-label">Default label in player marker</Label>
              <div class="general-control">
                <div class="flex items-center bg-muted rounded-md p-0.5 w-fit gap-0.5 flex-wrap">
                  <button
                    v-for="opt in (['number', 'position', 'both', 'none'] as const)"
                    :key="opt"
                    type="button"
                    class="px-2.5 py-1 text-[12px] font-medium rounded transition-colors capitalize"
                    :class="(settings.default_player_label_on_canvas ?? 'position') === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                    @click="updateSettings({ default_player_label_on_canvas: opt })"
                  >
                    {{ opt === 'number' ? 'Number' : opt === 'position' ? 'Position' : opt === 'both' ? 'Both' : 'None' }}
                  </button>
                </div>
                <p class="text-xs text-muted-foreground mt-1.5">What to show inside the circle by default (number, position, both, or none). You can override per player in Player Details.</p>
              </div>
            </div>

          </div>
        </div>
      </template>

      <!-- Field Tab -->
      <template v-if="settings && activeTab === 'field'">
        <div class="settings-split flex flex-col xl:flex-row flex-1 min-h-0">
          <!-- Field Preview (left on xl; fills available space so field is as large as possible) -->
          <div class="settings-preview flex-1 min-w-0 min-h-[200px] xl:min-h-0">
            <FieldPreview
              :field-length="settings.field_length"
              :field-width="settings.field_width"
              :endzone-size="settings.endzone_size"
              :line-of-scrimmage="settings.line_of_scrimmage"
              :first-down="settings.first_down ?? Math.floor(settings.field_length / 2)"
              :show-players="true"
              :compact-padding="true"
              @update:line-of-scrimmage="(v: number) => debouncedUpdate({ line_of_scrimmage: v })"
              @update:first-down="(v: number) => debouncedUpdate({ first_down: v })"
              @drag-end="onFieldDragEnd"
            />
          </div>

          <!-- Config Panel (right on xl, below preview when stacked) – rounded card, compact -->
          <div class="field-config-card w-full xl:w-[280px] xl:min-w-[280px] shrink-0">
            <div class="field-config-header">
              <h2 class="text-base font-semibold tracking-tight font-display">Field Dimensions</h2>
              <p class="text-muted-foreground text-xs">Configure the field size in yards.</p>
            </div>

            <p class="field-config-hint text-muted-foreground text-[11px] mt-1 mb-2 px-2.5 py-2 rounded-md bg-muted/50 border border-border/50">
              Drag the <strong>LOS</strong> (cyan) and <strong>1st down</strong> (yellow) lines on the preview to change yard lines. Saved automatically.
            </p>

            <div class="field-config-fields">
              <div class="field-config-field">
                <Label class="field-config-label">Field Length</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.field_length"
                    @update:model-value="(v: string | number) => debouncedUpdate(clampFieldUpdate({ field_length: Number(v) }))"
                    :min="50"
                    :max="100"
                    class="config-input h-8 text-sm"
                  />
                  <span class="config-unit text-xs">yd</span>
                </div>
              </div>

              <div class="field-config-field">
                <Label class="field-config-label">Field Width</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.field_width"
                    @update:model-value="(v: string | number) => debouncedUpdate(clampFieldUpdate({ field_width: Number(v) }))"
                    :min="25"
                    :max="50"
                    class="config-input h-8 text-sm"
                  />
                  <span class="config-unit text-xs">yd</span>
                </div>
              </div>

              <div class="field-config-field">
                <Label class="field-config-label">Endzone Size</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.endzone_size"
                    @update:model-value="(v: string | number) => debouncedUpdate(clampFieldUpdate({ endzone_size: Number(v) }))"
                    :min="5"
                    :max="10"
                    class="config-input h-8 text-sm"
                  />
                  <span class="config-unit text-xs">yd</span>
                </div>
              </div>

              <div class="field-config-field">
                <Label class="field-config-label">Line of Scrimmage</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.line_of_scrimmage"
                    @update:model-value="(v: string | number) => debouncedUpdate(clampFieldUpdate({ line_of_scrimmage: Number(v) }))"
                    :min="1"
                    :max="Math.max(1, (settings.field_length ?? 70) - 1)"
                    class="config-input h-8 text-sm"
                  />
                  <span class="config-unit text-xs">yd line</span>
                </div>
              </div>

              <div class="field-config-field">
                <Label class="field-config-label">First Down Line</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.first_down ?? Math.floor(settings.field_length / 2)"
                    @update:model-value="(v: string | number) => debouncedUpdate(clampFieldUpdate({ first_down: Number(v) }))"
                    :min="settings.line_of_scrimmage ?? 1"
                    :max="Math.max(1, (settings.field_length ?? 70) - 1)"
                    class="config-input h-8 text-sm"
                  />
                  <span class="config-unit text-xs">yd line</span>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="field-config-stats">
              <div class="config-stat">
                <span class="config-stat-label">Total with endzones</span>
                <span class="config-stat-value">{{ settings.field_length + settings.endzone_size * 2 }}yd</span>
              </div>
              <div class="config-stat">
                <span class="config-stat-label">Midfield</span>
                <span class="config-stat-value">{{ Math.floor(settings.field_length / 2) }}yd</span>
              </div>
              <div class="config-stat">
                <span class="config-stat-label">1st down to gain</span>
                <span class="config-stat-value">Midfield</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Team Tab -->
      <template v-if="activeTab === 'team'">
        <div class="settings-panel">
          <div class="config-header">
            <h2 class="text-lg font-semibold tracking-tight font-display">Primary Team</h2>
            <p class="text-muted-foreground text-sm">Select your primary team for roster management and play creation.</p>
          </div>

          <div class="config-fields">
            <div class="config-field">
              <Label class="config-label">Team</Label>
              <Select 
                :model-value="profile?.default_team_id ?? '__none__'" 
                @update:model-value="handleTeamChange"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  <SelectItem v-for="team in teams" :key="team.id" :value="team.id">
                    {{ team.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Primary Team Info -->
            <div v-if="selectedTeam" class="team-info-card">
              <div class="flex items-center gap-3 mb-3">
                <div class="team-badge">
                  <ShieldIcon class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-sm font-semibold">{{ selectedTeam.name }}</p>
                  <p v-if="selectedTeam.description" class="text-xs text-muted-foreground">{{ selectedTeam.description }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="team-mini-stat">
                  <p class="text-lg font-bold">{{ teamPlayerCount }}</p>
                  <p class="text-[11px] text-muted-foreground">Players</p>
                </div>
                <div class="team-mini-stat">
                  <p class="text-lg font-bold">{{ offStarterCount }}</p>
                  <p class="text-[11px] text-muted-foreground">Off Starters</p>
                </div>
                <div class="team-mini-stat">
                  <p class="text-lg font-bold">{{ defStarterCount }}</p>
                  <p class="text-[11px] text-muted-foreground">Def Starters</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Pricing & Billing Tab -->
      <template v-if="activeTab === 'billing'">
        <div class="settings-panel billing-panel">
          <div class="config-header">
            <h2 class="text-lg font-semibold tracking-tight font-display">Pricing & Billing</h2>
            <p class="text-muted-foreground text-sm">Your current plan and available upgrades.</p>
          </div>

          <!-- Current plan -->
          <div class="billing-current mb-8">
            <span class="text-sm text-muted-foreground">Current plan</span>
            <div class="flex items-center gap-2 mt-1">
              <span class="font-semibold text-foreground">Free</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Active</span>
            </div>
          </div>

          <!-- Tier cards -->
          <div class="billing-grid">
            <!-- Free -->
            <div class="billing-card billing-card--current">
              <div class="billing-card-header">
                <h3 class="font-display font-semibold text-foreground">Free</h3>
                <p class="text-2xl font-bold text-foreground mt-1">$0<span class="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
              <ul class="billing-perks">
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Unlimited plays</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Unlimited playbooks</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Create and manage teams</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>AI assistant coach & all AI features</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Blur.ai</span>
                </li>
                <li class="billing-perk billing-perk--no">
                  <X class="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span class="text-muted-foreground">Test plays & run simulations</span>
                </li>
              </ul>
              <div class="billing-card-footer">
                <Button variant="outline" class="w-full" disabled>Current plan</Button>
              </div>
            </div>

            <!-- Pro -->
            <div class="billing-card billing-card--pro">
              <div class="billing-card-header">
                <div class="flex items-center gap-1.5">
                  <Sparkles class="w-4 h-4 text-primary" />
                  <h3 class="font-display font-semibold text-foreground">Pro</h3>
                </div>
                <p class="text-2xl font-bold text-foreground mt-1">Coming soon</p>
              </div>
              <ul class="billing-perks">
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Everything in Free</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Test plays & run simulations</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Play test with animated routes</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Scenario & game simulations</span>
                </li>
                <li class="billing-perk billing-perk--yes">
                  <Check class="w-4 h-4 shrink-0 text-primary" />
                  <span>Print playbooks in different formats</span>
                </li>
              </ul>
              <div class="billing-card-footer">
                <Button class="w-full" disabled>Upgrade to Pro — coming soon</Button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Account Tab -->
      <template v-if="activeTab === 'account'">
        <div class="settings-panel">
          <div class="config-header">
            <h2 class="text-lg font-semibold tracking-tight font-display">Account</h2>
            <p class="text-muted-foreground text-sm">Manage your profile and account settings.</p>
          </div>

          <Button
            variant="outline"
            class="w-full justify-start gap-2 mb-6 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            @click="activeTab = 'billing'"
          >
            <Sparkles class="w-4 h-4 shrink-0" />
            <span>Upgrade to Pro — test plays, run simulations & more</span>
          </Button>

          <div class="config-fields">
            <div class="config-field">
              <Label class="config-label">Display Name</Label>
              <Input
                :model-value="profile?.display_name ?? ''"
                @update:model-value="(v: string | number) => debouncedProfileUpdate({ display_name: String(v) })"
                placeholder="Your display name"
              />
            </div>

            <div class="config-field">
              <Label class="config-label">Email</Label>
              <Input
                :model-value="user?.email ?? ''"
                disabled
                class="opacity-60"
              />
              <p class="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-border">
            <Button variant="outline" class="text-destructive hover:bg-destructive/10" @click="handleLogout">
              <LogOut class="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </template>
    </div>
    <p class="shrink-0 py-3 px-4 xl:px-6 text-xs text-muted-foreground border-t border-border">v0.1.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldSettings, Profile } from '~/lib/types'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { ThemePreference } from '~/composables/useTheme'
import { Ruler, Shield as ShieldIcon, User, LogOut, Settings2, Swords, Maximize2, Fullscreen, CreditCard, Check, X, Sparkles, Sun, Moon, Monitor } from 'lucide-vue-next'

const tabs = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'field', label: 'Field', icon: Ruler },
  { id: 'team', label: 'Team', icon: ShieldIcon },
  { id: 'billing', label: 'Pricing & Billing', icon: CreditCard },
  { id: 'account', label: 'Account', icon: User },
]

const activeTab = ref('general')

const user = useSupabaseUser()
const { settings, loading, fetchSettings, updateSettings } = useFieldSettings()
const { profile, fetchProfile, updateProfile } = useProfile()
const theme = useTheme()

const effectiveTheme = computed<ThemePreference>(() => settings.value?.theme ?? theme.preference.value ?? 'system')

function setTheme(value: ThemePreference) {
  theme.setPreference(value)
  updateSettings({ theme: value })
}
const { teams, fetchTeams } = useTeams()
const supaClient = useSupabaseClient()

const defensePlaysForDefault = ref<{ id: string; name: string }[]>([])
const defensePlaysLoading = ref(false)
const ghostDefenseOptimistic = ref<boolean | null>(null)

const showGhostDefense = computed(() => {
  if (ghostDefenseOptimistic.value !== null) return ghostDefenseOptimistic.value
  return !!settings.value?.show_ghost_defense_by_default
})

function setGhostDefense(on: boolean) {
  ghostDefenseOptimistic.value = on
  updateSettings({
    show_ghost_defense_by_default: on,
    ...(on ? {} : { default_ghost_defense_play_id: null }),
  }).finally(() => {
    ghostDefenseOptimistic.value = null
  })
}

function setDefaultPlayType(type: 'offense' | 'defense') {
  if (type === 'defense') {
    updateSettings({
      default_play_type: 'defense',
      show_ghost_defense_by_default: false,
      default_ghost_defense_play_id: null,
    })
    ghostDefenseOptimistic.value = false
  } else {
    updateSettings({ default_play_type: 'offense' })
  }
}

watch(
  () => settings.value?.show_ghost_defense_by_default,
  () => { ghostDefenseOptimistic.value = null }
)

watch(
  () => settings.value?.theme,
  (themeFromSettings) => {
    // Only sync when settings have loaded (theme is defined). Otherwise we'd overwrite
    // localStorage with 'system' and cause a brief dark flash when returning to settings.
    if (themeFromSettings !== undefined) {
      theme.syncFromSettings(themeFromSettings)
    }
  },
  { immediate: true }
)

watch(
  () => [user.value?.id, activeTab.value] as const,
  async ([uid, tab]) => {
    if (!uid || tab !== 'general') return
    defensePlaysLoading.value = true
    try {
      const { data } = await supaClient
        .from('plays')
        .select('id, name')
        .eq('user_id', uid)
        .eq('play_type', 'defense')
        .order('updated_at', { ascending: false })
      defensePlaysForDefault.value = (data ?? []) as { id: string; name: string }[]
    } finally {
      defensePlaysLoading.value = false
    }
  },
  { immediate: true }
)

// Clamp dimension inputs to valid ranges before sending (50–100 length, 25–50 width, 5–10 endzone, LOS/first down in bounds)
function clampFieldUpdate(updates: Partial<FieldSettings>): Partial<FieldSettings> {
  const s = settings.value
  if (!s) return updates
  const merged = { ...s, ...updates }
  const out: Partial<FieldSettings> = {}
  if (updates.field_length != null) out.field_length = Math.max(50, Math.min(100, Number(updates.field_length)))
  if (updates.field_width != null) out.field_width = Math.max(25, Math.min(50, Number(updates.field_width)))
  if (updates.endzone_size != null) out.endzone_size = Math.max(5, Math.min(10, Number(updates.endzone_size)))
  const fieldLength = out.field_length ?? merged.field_length ?? 70
  const losMax = Math.max(1, fieldLength - 1)
  if (updates.line_of_scrimmage != null) out.line_of_scrimmage = Math.max(1, Math.min(losMax, Number(updates.line_of_scrimmage)))
  if (updates.first_down != null) {
    const los = out.line_of_scrimmage ?? merged.line_of_scrimmage ?? 25
    out.first_down = Math.max(los, Math.min(losMax, Number(updates.first_down)))
  }
  return Object.keys(out).length ? out : updates
}

// Debounced field settings update
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedUpdate(updates: Partial<FieldSettings>) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    updateSettings(updates)
  }, 500)
}

/** When user finishes dragging LOS or first down, save immediately so the line doesn't snap back. */
function onFieldDragEnd(payload: { line_of_scrimmage?: number; first_down?: number }) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (Object.keys(payload).length) updateSettings(payload)
}

// Debounced profile update
let profileDebounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedProfileUpdate(updates: Partial<Profile>) {
  if (profileDebounceTimer) clearTimeout(profileDebounceTimer)
  profileDebounceTimer = setTimeout(() => {
    updateProfile(updates)
  }, 500)
}

// Team selection
const selectedTeam = computed(() => {
  if (!profile.value?.default_team_id) return null
  return teams.value.find((t) => t.id === profile.value!.default_team_id) ?? null
})

const teamPlayerCount = computed(() => {
  return selectedTeam.value?.team_players?.length ?? 0
})

const offStarterCount = computed(() => {
  return selectedTeam.value?.team_players?.filter((p: any) => p.offense_starter).length ?? 0
})

const defStarterCount = computed(() => {
  return selectedTeam.value?.team_players?.filter((p: any) => p.defense_starter).length ?? 0
})

async function handleTeamChange(teamId: any) {
  const id = teamId === '__none__' ? null : teamId
  await updateProfile({ default_team_id: id } as Partial<Profile>)
}

async function handleLogout() {
  await supaClient.auth.signOut()
  await navigateTo('/auth/login')
}

onMounted(() => {
  fetchSettings()
  fetchProfile()
  fetchTeams()
})
</script>

<style scoped>
.settings-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.settings-nav {
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-muted-foreground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
}

.settings-nav-btn:hover {
  background: var(--color-accent);
  color: var(--color-accent-foreground);
}

.settings-nav-btn.active {
  background: var(--color-accent);
  color: var(--color-foreground);
  font-weight: 600;
}

.settings-nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.settings-content--field {
  overflow: hidden;
  align-items: flex-start;
  padding-top: 20px;
}

.settings-content--field .settings-split {
  margin-top: 16px;
  flex: 1;
  min-height: 0;
  max-height: calc(100vh - 120px);
}

.settings-content--left {
  align-items: flex-start;
}

.settings-content--left > * {
  width: 100%;
}

.settings-content--left .settings-panel {
  margin-left: 0;
  margin-right: auto;
}

.settings-split {
  display: flex;
  width: 100%;
}

.settings-preview {
  padding: 8px 12px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}

.settings-config {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  flex-shrink: 0;
}

.field-config-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: -24px 16px 16px 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  flex-shrink: 0;
  min-height: min-content;
}

.field-config-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 0;
}

.field-config-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-config-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-config-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-foreground);
}

.field-config-stats {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in oklch, var(--color-accent) 50%, transparent);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-config-stats .config-stat-label,
.field-config-stats .config-stat-value {
  font-size: 11px;
}

.settings-panel {
  padding: 32px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

/* General tab: setting label left, control right */
.general-panel {
  max-width: 560px;
}

.general-rows {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.general-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  align-items: start;
}

@media (max-width: 540px) {
  .general-row {
    grid-template-columns: 1fr;
  }
}

.general-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-foreground);
  padding-top: 2px;
}

.general-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.general-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.general-radio-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-foreground);
}

.general-radio-input {
  position: absolute;
  opacity: 0;
  width: 20px;
  height: 20px;
  margin: 0;
  cursor: pointer;
}

.general-radio-dot {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.general-radio-input:checked + .general-radio-dot {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: inset 0 0 0 3px var(--color-background);
}

.general-radio-option:hover .general-radio-dot {
  border-color: var(--color-primary);
}

.general-radio-label {
  user-select: none;
}

.config-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-foreground);
}

.config-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-input {
  flex: 1;
}

.config-unit {
  font-size: 13px;
  color: var(--color-muted-foreground);
  white-space: nowrap;
}

.config-stats {
  margin-top: 8px;
  padding: 14px;
  border-radius: 8px;
  background: color-mix(in oklch, var(--color-accent) 50%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-stat-label {
  font-size: 13px;
  color: var(--color-muted-foreground);
}

.config-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-foreground);
  font-variant-numeric: tabular-nums;
}

.settings-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

/* Team Info */
.team-info-card {
  padding: 16px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--color-accent) 40%, transparent);
  border: 1px solid var(--color-border);
}

.team-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-mini-stat {
  text-align: center;
  padding: 8px;
  border-radius: 6px;
  background: color-mix(in oklch, var(--color-background) 50%, transparent);
}

/* Pricing & Billing */
.billing-panel {
  max-width: 720px;
}

.billing-current {
  padding: 12px 16px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--color-accent) 40%, transparent);
  border: 1px solid var(--color-border);
}

.billing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) {
  .billing-grid {
    grid-template-columns: 1fr;
  }
}

.billing-card {
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.billing-card--current {
  border-color: var(--color-primary);
  background: color-mix(in oklch, var(--color-primary) 6%, var(--color-card));
}

.billing-card--pro {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.billing-card-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.billing-perks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.billing-perk {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--color-foreground);
}

.billing-perk--no {
  opacity: 0.85;
}

.billing-card-footer {
  margin-top: auto;
  padding-top: 8px;
}
</style>
