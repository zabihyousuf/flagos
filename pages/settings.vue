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
      <div v-if="loading || (!settings && activeTab === 'field')" class="text-muted-foreground p-8 flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-2">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Loading settings...</span>
        </div>
      </div>

      <template v-else-if="settings && activeTab === 'field'">
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

      <!-- Placeholder for future tabs -->
      <template v-else-if="activeTab !== 'field'">
        <div class="settings-placeholder">
          <p class="text-muted-foreground">Coming soon</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldSettings } from '~/lib/types'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Ruler, Users, Shield, Settings2 } from 'lucide-vue-next'

const tabs = [
  { id: 'field', label: 'Field', icon: Ruler },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'rules', label: 'Rules', icon: Shield },
  { id: 'general', label: 'General', icon: Settings2 },
]

const activeTab = ref('field')

const { settings, loading, fetchSettings, updateSettings } = useFieldSettings()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedUpdate(updates: Partial<FieldSettings>) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateSettings(updates)
  }, 500)
}

onMounted(() => {
  fetchSettings()
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
  border-right: 1px solid var(--color-border);
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
  font-size: 14px;
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

.config-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: 12px;
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
  height: 100%;
  min-height: 400px;
}
</style>
