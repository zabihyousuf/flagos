<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-white">
        <!-- Header -->
        <div class="flex-none flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
          <div>
            <h2 class="text-lg font-semibold font-display">Add Players</h2>
            <p class="text-sm text-muted-foreground mt-0.5">Add multiple players with full attribute control. Defaults to 5 for all attributes.</p>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
            <Button
              :disabled="validRows.length === 0 || importing"
              @click="handleImport"
            >
              <Loader2 v-if="importing" class="w-4 h-4 mr-2 animate-spin" />
              Add {{ validRows.length }} Player{{ validRows.length !== 1 ? 's' : '' }}
            </Button>
          </div>
        </div>

        <!-- Post-import result overlay -->
        <div v-if="importResult" class="flex-1 flex items-center justify-center">
          <div class="text-center space-y-4">
            <CheckCircle2 v-if="importResult.failed === 0" class="w-12 h-12 text-green-400 mx-auto" />
            <AlertTriangle v-else class="w-12 h-12 text-yellow-400 mx-auto" />
            <p class="text-base">
              <span class="font-semibold text-green-400">{{ importResult.created }}</span> player{{ importResult.created !== 1 ? 's' : '' }} imported
              <template v-if="importResult.failed > 0">,
                <span class="font-semibold text-destructive">{{ importResult.failed }}</span> failed
              </template>
            </p>
            <div v-if="importResult.errors.length > 0" class="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
              <p v-for="(e, i) in importResult.errors" :key="i">Row {{ e.index + 1 }}: {{ e.message }}</p>
            </div>
            <Button @click="handleDone">Done</Button>
          </div>
        </div>

        <!-- Main content -->
        <template v-else>
          <!-- Tabs -->
          <div class="flex-none px-6 pt-3 pb-0 flex items-center gap-4 border-b">
            <button
              class="px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
              :class="activeTab === 'quick' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'quick'"
            >
              Quick Add
            </button>
            <button
              class="px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
              :class="activeTab === 'csv' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'csv'"
            >
              CSV Upload
            </button>
            <div class="flex-1" />
            <div v-if="activeTab === 'quick'" class="flex items-center gap-2 pb-2">
              <Button variant="outline" size="sm" @click="addEmptyRow">
                <Plus class="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
              <Button variant="outline" size="sm" @click="addSampleRow">
                <Wand2 class="w-3.5 h-3.5 mr-1" />
                Add Sample
              </Button>
              <span v-if="rowWarnings.length > 0" class="text-xs text-yellow-400">
                <AlertTriangle class="w-3 h-3 inline mr-1" />{{ rowWarnings[0] }}
              </span>
            </div>
          </div>

          <!-- Quick Add Tab -->
          <div v-if="activeTab === 'quick'" class="flex-1 min-h-0 relative border-t">
            <!-- Scroll indicator -->
            <div class="absolute top-2 right-6 z-40 bg-background/80 backdrop-blur px-2 py-1 rounded-md border shadow-sm pointer-events-none text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
              <ArrowRight class="w-3 h-3" />
              <span>Scroll for more attributes</span>
            </div>

            <div class="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <table class="relative w-full text-sm border-collapse min-w-[1800px]">
              <!-- content unchanged, replacing wrapper only in effect, but need to match range -->
              <thead class="sticky top-0 z-20 bg-white">
                <!-- Column headers -->
                <tr class="border-b">
                  <th class="sticky left-0 z-30 bg-white px-2 py-2 text-center w-8"></th>
                  <th class="sticky left-8 z-30 bg-white px-3 py-2 text-left font-medium text-muted-foreground w-[200px] min-w-[200px]">Name</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-[140px]">Team</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-16">#</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-14">HT</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-14">WT</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-[100px]">OFF</th>
                  <th class="px-2 py-2 text-left font-medium text-muted-foreground w-[100px]">DEF</th>
                  <th
                    v-for="(attr, ai) in UNIVERSAL_ATTRIBUTE_GROUP.attrs"
                    :key="attr.key"
                    class="px-1 py-2 text-center font-medium text-muted-foreground w-[52px] text-[10px]"
                    :class="ai === 0 ? 'border-l border-border/20' : ''"
                  >
                    <TooltipProvider :delay-duration="150">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <template v-for="group in OFFENSE_ATTRIBUTE_GROUPS" :key="'oh-' + group.label">
                    <th
                      v-for="(attr, ai) in group.attrs"
                      :key="attr.key"
                      class="px-1 py-2 text-center font-medium text-muted-foreground w-[52px] text-[10px]"
                      :class="ai === 0 ? 'border-l border-border/20' : ''"
                    >
                      <TooltipProvider :delay-duration="150">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  </template>
                  <template v-for="group in DEFENSE_ATTRIBUTE_GROUPS" :key="'dh-' + group.label">
                    <th
                      v-for="(attr, ai) in group.attrs"
                      :key="attr.key"
                      class="px-1 py-2 text-center font-medium text-muted-foreground w-[52px] text-[10px]"
                      :class="ai === 0 ? 'border-l border-border/20' : ''"
                    >
                      <TooltipProvider :delay-duration="150">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  </template>
                  <th class="w-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in rows" :key="i" class="border-b border-border/30 hover:bg-muted/20">
                  <!-- Remove -->
                  <td class="sticky left-0 z-10 bg-white px-1 py-1 text-center">
                    <button
                      @click="removeRow(i)"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <!-- Name (sticky) -->
                  <td class="sticky left-8 z-10 bg-white px-2 py-1">
                    <Input
                      v-model="row.name"
                      placeholder="Player name"
                      class="h-8 text-sm"
                      :class="row.errors.length > 0 && row.name.trim() === '' ? 'border-destructive' : ''"
                      @blur="validateRow(i)"
                      @keydown.enter="handleEnterOnRow(i)"
                    />
                  </td>
                  <!-- Team -->
                  <td class="px-2 py-1">
                    <Select v-model="row.team_id">
                      <SelectTrigger class="h-8 text-xs">
                        <SelectValue placeholder="Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Free Agents</SelectItem>
                        <SelectItem v-for="team in teams" :key="team.id" :value="team.id">
                          {{ team.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <!-- Number -->
                  <td class="px-1 py-1">
                    <input
                      :value="row.number ?? ''"
                      inputmode="numeric"
                      placeholder="#"
                      class="w-14 h-8 text-center text-sm rounded-md border border-input bg-background px-1"
                      @input="(e: Event) => row.number = (e.target as HTMLInputElement).value === '' ? null : parseInt((e.target as HTMLInputElement).value, 10) || null"
                      @blur="validateRow(i)"
                    />
                  </td>
                  <!-- Height -->
                  <td class="px-1 py-1">
                    <div class="flex gap-1">
                      <input
                        :value="Math.floor((row.height ?? 0) / 12) || ''"
                        inputmode="numeric"
                        placeholder="ft"
                        class="w-8 h-8 text-center text-sm rounded-md border border-input bg-background px-0.5"
                        @input="(e: Event) => updateHeight(row, (e.target as HTMLInputElement).value, 'ft')"
                        @blur="validateRow(i)"
                      />
                      <input
                        :value="(row.height ?? 0) % 12 || ''"
                        inputmode="numeric"
                        placeholder="in"
                        class="w-8 h-8 text-center text-sm rounded-md border border-input bg-background px-0.5"
                        @input="(e: Event) => updateHeight(row, (e.target as HTMLInputElement).value, 'in')"
                        @blur="validateRow(i)"
                      />
                    </div>
                  </td>
                  <!-- Weight -->
                  <td class="px-1 py-1">
                    <input
                      :value="row.weight ?? ''"
                      inputmode="numeric"
                      placeholder="lbs"
                      class="w-12 h-8 text-center text-sm rounded-md border border-input bg-background px-1"
                      @input="(e: Event) => row.weight = (e.target as HTMLInputElement).value === '' ? null : parseInt((e.target as HTMLInputElement).value, 10) || null"
                      @blur="validateRow(i)"
                    />
                  </td>
                  <!-- Offense positions -->
                  <td class="px-1 py-1">
                    <div class="flex gap-0.5">
                      <button
                        v-for="pos in OFFENSE_POS"
                        :key="pos"
                        @click="togglePosition(row, 'offense', pos)"
                        class="px-1 py-0.5 text-[10px] font-medium rounded transition-colors"
                        :class="row.offense_positions.includes(pos)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'"
                      >
                        {{ pos }}
                      </button>
                    </div>
                  </td>
                  <!-- Defense positions -->
                  <td class="px-1 py-1">
                    <div class="flex gap-0.5">
                      <button
                        v-for="pos in DEFENSE_POS"
                        :key="pos"
                        @click="togglePosition(row, 'defense', pos)"
                        class="px-1 py-0.5 text-[10px] font-medium rounded transition-colors"
                        :class="row.defense_positions.includes(pos)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'"
                      >
                        {{ pos }}
                      </button>
                    </div>
                  </td>
                  <!-- Universal attributes -->
                  <td
                    v-for="(attr, ai) in UNIVERSAL_ATTRIBUTE_GROUP.attrs"
                    :key="'u-' + attr.key + '-' + i"
                    class="px-0.5 py-1"
                    :class="ai === 0 ? 'border-l border-border/20' : ''"
                  >
                    <input
                      :value="row.universal_attributes[attr.key]"
                      inputmode="numeric"
                      class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                      @input="(e: Event) => row.universal_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                      @blur="(e: Event) => row.universal_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                    />
                  </td>
                  <!-- Offense attributes -->
                  <template v-for="group in OFFENSE_ATTRIBUTE_GROUPS" :key="'o-' + group.label + '-' + i">
                    <td
                      v-for="(attr, ai) in group.attrs"
                      :key="attr.key"
                      class="px-0.5 py-1"
                      :class="ai === 0 ? 'border-l border-border/20' : ''"
                    >
                      <input
                        :value="row.offense_attributes[attr.key]"
                        inputmode="numeric"
                        class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                        @input="(e: Event) => row.offense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                        @blur="(e: Event) => row.offense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                      />
                    </td>
                  </template>
                  <!-- Defense attributes -->
                  <template v-for="group in DEFENSE_ATTRIBUTE_GROUPS" :key="'d-' + group.label + '-' + i">
                    <td
                      v-for="(attr, ai) in group.attrs"
                      :key="attr.key"
                      class="px-0.5 py-1"
                      :class="ai === 0 ? 'border-l border-border/20' : ''"
                    >
                      <input
                        :value="row.defense_attributes[attr.key]"
                        inputmode="numeric"
                        class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                        @input="(e: Event) => row.defense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                        @blur="(e: Event) => row.defense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                      />
                    </td>
                  </template>

                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td :colspan="100" class="px-3 py-2">
                    <Button variant="ghost" size="sm" class="text-muted-foreground" @click="addEmptyRow">
                      <Plus class="w-3.5 h-3.5 mr-1.5" />
                      Add Row
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

            </div>

          <!-- CSV Upload Tab -->
          <div v-else-if="activeTab === 'csv'" class="flex-1 overflow-auto px-6 py-4">
            <!-- Upload zone -->
            <template v-if="rows.length === 0 || csvMode === 'upload'">
              <div class="max-w-2xl mx-auto space-y-6">
                <div
                  class="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
                  :class="dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'"
                  @dragover.prevent="dragOver = true"
                  @dragleave="dragOver = false"
                  @drop.prevent="handleDrop"
                >
                  <Upload class="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p class="text-sm text-muted-foreground mb-3">Drag and drop a CSV file here</p>
                  <Button variant="outline" @click="fileInput?.click()">
                    Choose File
                  </Button>
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".csv,.tsv,.txt"
                    class="hidden"
                    @change="handleFileSelect"
                  />
                </div>
                <div class="space-y-2">
                  <p class="text-xs text-muted-foreground">Or paste CSV data below:</p>
                  <Textarea
                    v-model="pasteText"
                    placeholder="Name,Number,Offense,Defense&#10;John Smith,7,QB,&#10;Sarah Jones,12,WR,DB"
                    rows="4"
                    class="text-xs font-mono"
                  />
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="!pasteText.trim()"
                      @click="handlePaste"
                    >
                      Parse CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="loadSampleCSV"
                    >
                      Load Sample
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="downloadTemplate"
                    >
                      Download Template
                    </Button>
                  </div>
                </div>
                <p v-if="parseError" class="text-xs text-destructive">{{ parseError }}</p>
              </div>
            </template>

            <!-- Preview table -->
            <template v-else>
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm text-muted-foreground">{{ rows.length }} row{{ rows.length !== 1 ? 's' : '' }} parsed</p>
                <Button variant="ghost" size="sm" class="text-xs" @click="csvMode = 'upload'; clearAll()">
                  Re-upload
                </Button>
              </div>
              <div class="rounded border overflow-auto max-h-[70vh]">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-white z-10">
                    <tr class="border-b text-left">
                      <th class="p-2 font-medium text-muted-foreground">Name</th>
                      <th class="p-2 font-medium text-muted-foreground w-16">#</th>
                      <th class="p-2 font-medium text-muted-foreground w-14">Ht</th>
                      <th class="p-2 font-medium text-muted-foreground w-14">Wt</th>
                      <th class="p-2 font-medium text-muted-foreground">OFF</th>
                      <th class="p-2 font-medium text-muted-foreground">DEF</th>
                      <th class="p-2 font-medium text-muted-foreground w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, i) in rows"
                      :key="i"
                      class="border-b border-border/50"
                      :class="row.errors.length > 0 ? 'bg-destructive/5' : ''"
                    >
                      <td class="p-2" :class="row.errors.length > 0 ? 'text-destructive' : ''">{{ row.name || '—' }}</td>
                      <td class="p-2 tabular-nums">{{ row.number ?? '—' }}</td>
                      <td class="p-2 tabular-nums">{{ row.height ?? '—' }}</td>
                      <td class="p-2 tabular-nums">{{ row.weight ?? '—' }}</td>
                      <td class="p-2">
                        <div class="flex gap-1">
                          <span
                            v-for="pos in row.offense_positions"
                            :key="pos"
                            class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary"
                          >{{ pos }}</span>
                          <span v-if="row.offense_positions.length === 0" class="text-muted-foreground/40">—</span>
                        </div>
                      </td>
                      <td class="p-2">
                        <div class="flex gap-1">
                          <span
                            v-for="pos in row.defense_positions"
                            :key="pos"
                            class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary"
                          >{{ pos }}</span>
                          <span v-if="row.defense_positions.length === 0" class="text-muted-foreground/40">—</span>
                        </div>
                      </td>
                      <td class="p-2">
                        <span v-if="row.errors.length > 0" class="text-[10px] text-destructive">{{ row.errors[0] }}</span>
                        <span v-else-if="row.warnings.length > 0" class="text-[10px] text-yellow-400">{{ row.warnings[0] }}</span>
                        <span v-else class="text-[10px] text-green-400">OK</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </template>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  Upload,
  Trash2,
  Plus,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Wand2,
  ArrowRight,
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
  POSITION_COLORS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS
} from '@/lib/constants'
import { useBulkImport } from '@/composables/useBulkImport'
import { useTeams } from '@/composables/useTeams'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'import-done'): void
}>()

const { teams, addPlayerToTeam } = useTeams()
const { bulkCreatePlayers } = usePlayers()
const {
  activeTab,
  csvInput,
  rows,
  parseError,
  importing,
  validRows,
  rowWarnings,
  importResult,
  parseCSV,
  addEmptyRow,
  addSampleRow,
  removeRow,
  clearAll,
  performImport,
  revalidateAll,
} = useBulkImport()

// Offense/Defense position options
const OFF_POS = OFFENSE_POSITIONS
const DEF_POS = DEFENSE_POSITIONS

const selectableTeams = computed(() => {
  return teams.value.map(t => ({ id: t.id, name: t.name }))
})

// Local state for UI not covered by composable
const dragOver = ref(false)
const pasteText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const csvMode = ref<'upload' | 'preview'>('upload')

// Helper to shorten attribute labels (e.g. "Throwing Power" -> "THP")
function attrShortLabel(label: string) {
  if (label === 'Football IQ') return 'IQ'
  const map: Record<string, string> = {
    'Heigh': 'HGT',
    'Weight': 'WGT',
    'Throwing Power': 'THP',
    'Accuracy': 'ACC',
    'Decision Making': 'DEC',
    'Pocket Awareness': 'PAW',
    'Catching': 'CAT',
    'Route Running': 'RUN',
    'Release': 'REL',
    'Hip Twist': 'HTW',
    'Coverage': 'COV',
    'Rush': 'RSH',
    'Agility': 'AGL',
    'Ball Hawking': 'BHK',
    'Zone Awareness': 'ZAW',
    'Timing': 'TMG',
    'Rush Moves': 'RMV',
    'Flag Pulling': 'FLP',
    'Pursuit': 'PUR',
    'Play Recognition': 'PRE',
    'Field Awareness': 'FAW',
  }
  return map[label] ?? label.slice(0, 3).toUpperCase()
}

function clampAttr(v: string | number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  if (isNaN(n)) return 5
  return Math.min(10, Math.max(1, n))
}

// Initialize with 5 empty rows when sheet opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // If we have rows, maybe don't clear?
    // But usually opening means fresh start or continue.
    // Let's just ensure we have at least 1 row if empty.
    // Start with 0 rows as requested
    // if (rows.value.length === 0) {
    //    for(let i=0; i<5; i++) addEmptyRow()
    // }
    
    activeTab.value = 'quick'
    pasteText.value = ''
    csvMode.value = 'upload'
  }
})

// Close on Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function updateHeight(row: ImportRow, value: string, unit: 'ft' | 'in') {
  const currentHeight = row.height ?? 0
  let ft = Math.floor(currentHeight / 12)
  let inch = currentHeight % 12
  
  const val = parseInt(value, 10) || 0
  
  if (unit === 'ft') ft = val
  else inch = val
  
  // Update total inches
  row.height = (ft * 12) + inch
  if (row.height === 0 && value === '') row.height = null
}

function handleEnterOnRow(index: number) {
  if (index === rows.value.length - 1) {
    addEmptyRow()
    nextTick(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('table tbody tr:last-child input[type="text"], table tbody tr:last-child input:not([type])')
      inputs[0]?.focus()
    })
  }
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readFile(file)
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    parseCSV(text)
    if (!parseError.value) csvMode.value = 'preview'
  }
  reader.readAsText(file)
}

function handlePaste() {
  parseCSV(pasteText.value)
  if (!parseError.value) csvMode.value = 'preview'
}

function loadSampleCSV() {
  pasteText.value = `Name,Number,Height,Weight,Offense,Defense
Tyreek Hill,10,70,185,WR,
Sauce Gardner,1,75,190,,DB
Patrick Mahomes,15,QB,
Travis Kelce,87,C,
Micah Parsons,11,,RSH
Fred Warner,54,,MLB
Justin Jefferson,18,WR,DB`
}

function downloadTemplate() {
  // Build headers
  const headers = ['Name', 'Number', 'Height', 'Weight', 'Offense', 'Defense']
  
  // Universal
  UNIVERSAL_ATTRIBUTE_GROUP.attrs.forEach(a => headers.push(a.label))
  
  // Offense
  OFFENSE_ATTRIBUTE_GROUPS.forEach(g => {
    g.attrs.forEach(a => headers.push(a.label))
  })
  
  // Defense
  DEFENSE_ATTRIBUTE_GROUPS.forEach(g => {
    g.attrs.forEach(a => headers.push(a.label))
  })
  
  // Build a sample row with 5s for everything
  const sample = ['Example Player', '99', '70', '180', 'WR', 'DB']
  // Add 5 for every attribute column
  for (let i = 4; i < headers.length; i++) {
    sample.push('5')
  }
  
  const csvContent = [
    headers.join(','),
    sample.join(',')
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', 'flagos_player_template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function handleImport() {
  revalidateAll()
  const toImport = validRows.value.map((r) => ({
    name: r.name.trim(),
    number: r.number ?? 0,
    height: r.height,
    weight: r.weight,
    offense_positions: r.offense_positions,
    defense_positions: r.defense_positions,
    universal_attributes: { ...r.universal_attributes },
    offense_attributes: { ...r.offense_attributes },
    defense_attributes: { ...r.defense_attributes },
  }))

  if (toImport.length === 0) return

  importing.value = true
  try {
    const result = await bulkCreatePlayers(toImport) // Now returns { created: { player, index }[], ... }
    importResult.value = {
      created: result.created.length,
      failed: result.errors.length,
      errors: result.errors,
    }
    if (result.created.length > 0) {
      // Process using the returned index to map back to validRows
      for (const item of result.created) {
        const player = item.player
        const row = validRows.value[item.index] 

        if (row && row.team_id && row.team_id !== 'unassigned') {
          await addPlayerToTeam(
            row.team_id,
            player.id,
            player.offense_positions[0] ?? null,
            player.defense_positions[0] ?? null
          )
        }
      }
      emit('import-done')
    }
  } finally {
    importing.value = false
  }
}

function handleDone() {
  clearAll()
  emit('update:open', false)
}
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

/* Sticky name column shadow */
td.sticky,
th.sticky {
  box-shadow: 2px 0 8px -2px rgba(0, 0, 0, 0.15);
}
</style>
