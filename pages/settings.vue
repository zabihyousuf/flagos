<template>
  <div class="settings-layout">
    <!-- Vertical Tab Navigation -->
    <nav class="settings-nav">
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

    <!-- Content Area -->
    <div class="settings-content">
      <!-- Loading -->
      <div v-if="loading && activeTab === 'field'" class="settings-placeholder">
        <div class="flex flex-col items-center gap-2">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="text-muted-foreground">Loading settings...</span>
        </div>
      </div>

      <!-- Field Tab -->
      <template v-if="settings && activeTab === 'field'">
        <div class="settings-split">
          <!-- Field Preview (left) -->
          <div class="settings-preview">
            <FieldPreview
              :field-length="settings.field_length"
              :field-width="settings.field_width"
              :endzone-size="settings.endzone_size"
              :line-of-scrimmage="settings.line_of_scrimmage"
              :height="580"
              :show-players="true"
            />
          </div>

          <!-- Config Panel (right) -->
          <div class="settings-config">
            <div class="config-header">
              <h2 class="text-lg font-semibold tracking-tight font-display">Field Dimensions</h2>
              <p class="text-muted-foreground text-sm">Configure the field size in yards.</p>
            </div>

            <div class="config-fields">
              <div class="config-field">
                <Label class="config-label">Field Length</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.field_length"
                    @update:model-value="(v: string | number) => debouncedUpdate({ field_length: Number(v) })"
                    :min="40"
                    :max="100"
                    class="config-input"
                  />
                  <span class="config-unit">yards</span>
                </div>
              </div>

              <div class="config-field">
                <Label class="config-label">Field Width</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.field_width"
                    @update:model-value="(v: string | number) => debouncedUpdate({ field_width: Number(v) })"
                    :min="20"
                    :max="53"
                    class="config-input"
                  />
                  <span class="config-unit">yards</span>
                </div>
              </div>

              <div class="config-field">
                <Label class="config-label">Endzone Size</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.endzone_size"
                    @update:model-value="(v: string | number) => debouncedUpdate({ endzone_size: Number(v) })"
                    :min="5"
                    :max="20"
                    class="config-input"
                  />
                  <span class="config-unit">yards</span>
                </div>
              </div>

              <div class="config-field">
                <Label class="config-label">Line of Scrimmage</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.line_of_scrimmage"
                    @update:model-value="(v: string | number) => debouncedUpdate({ line_of_scrimmage: Number(v) })"
                    :min="1"
                    :max="69"
                    class="config-input"
                  />
                  <span class="config-unit">yard line</span>
                </div>
              </div>

              <div class="config-field">
                <Label class="config-label">First Down Line</Label>
                <div class="config-input-row">
                  <Input
                    type="number"
                    :model-value="settings.first_down ?? Math.floor(settings.field_length / 2)"
                    @update:model-value="(v: string | number) => debouncedUpdate({ first_down: Number(v) })"
                    :min="1"
                    :max="69"
                    class="config-input"
                  />
                  <span class="config-unit">yard line</span>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="config-stats">
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
                  <p class="text-[12px] text-muted-foreground">Players</p>
                </div>
                <div class="team-mini-stat">
                  <p class="text-lg font-bold">{{ offStarterCount }}</p>
                  <p class="text-[12px] text-muted-foreground">Off Starters</p>
                </div>
                <div class="team-mini-stat">
                  <p class="text-lg font-bold">{{ defStarterCount }}</p>
                  <p class="text-[12px] text-muted-foreground">Def Starters</p>
                </div>
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
  </div>
</template>

<script setup lang="ts">
import type { FieldSettings, Profile } from '~/lib/types'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Ruler, Shield as ShieldIcon, User, LogOut } from 'lucide-vue-next'

const tabs = [
  { id: 'field', label: 'Field', icon: Ruler },
  { id: 'team', label: 'Team', icon: ShieldIcon },
  { id: 'account', label: 'Account', icon: User },
]

const activeTab = ref('field')

const user = useSupabaseUser()
const supaClient = useSupabaseClient()
const { settings, loading, fetchSettings, updateSettings } = useFieldSettings()
const { profile, fetchProfile, updateProfile } = useProfile()
const { teams, fetchTeams } = useTeams()

// Debounced field settings update
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedUpdate(updates: Partial<FieldSettings>) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateSettings(updates)
  }, 500)
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
  height: calc(100vh - 64px);
  overflow: hidden;
}

.settings-nav {
  width: 180px;
  min-width: 180px;
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
  font-size: 16px;
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
}

.settings-split {
  display: flex;
  height: 100%;
}

.settings-preview {
  flex: 1;
  min-width: 0;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.settings-config {
  width: 300px;
  min-width: 300px;
  border-left: 1px solid var(--color-border);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.settings-panel {
  padding: 32px;
  max-width: 480px;
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
  font-size: 15px;
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
  font-size: 15px;
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
  font-size: 14px;
  color: var(--color-muted-foreground);
}

.config-stat-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-foreground);
  font-variant-numeric: tabular-nums;
}

.settings-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
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
</style>
