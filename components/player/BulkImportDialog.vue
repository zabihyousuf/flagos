<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-background">
        <!-- Header -->
        <div class="flex-none flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
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
            <CheckCircle2 v-if="importResult.failed === 0" class="w-12 h-12 text-green-500 dark:text-green-400 mx-auto" />
            <AlertTriangle v-else class="w-12 h-12 text-amber-500 dark:text-amber-400 mx-auto" />
            <p class="text-base text-foreground">
              <span class="font-semibold text-green-600 dark:text-green-400">{{ importResult.created }}</span> player{{ importResult.created !== 1 ? 's' : '' }} imported
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
          <div class="flex-none px-6 pt-3 pb-0 flex items-center gap-4 border-b border-border">
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
              <Button variant="outline" size="sm" @click="addEmptyRow(freeAgentTeamId || undefined)">
                <Plus class="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
              <Button variant="outline" size="sm" @click="addSampleRow(freeAgentTeamId || undefined)">
                <Wand2 class="w-3.5 h-3.5 mr-1" />
                Add Sample
              </Button>
              <span v-if="rowWarnings.length > 0" class="text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle class="w-3 h-3 inline mr-1" />{{ rowWarnings[0] }}
              </span>
            </div>
          </div>

          <!-- Quick Add Tab -->
          <div v-if="activeTab === 'quick'" class="flex-1 min-h-0 flex flex-col">
            <!-- Rows-from-CSV summary and duplicate-name warning -->
            <div v-if="rowsFromCsvCount > 0" class="flex-none px-6 py-3 border-b bg-muted/30 space-y-2">
              <p class="text-sm font-medium text-foreground">
                {{ rowsFromCsvCount }} row{{ rowsFromCsvCount !== 1 ? 's' : '' }} parsed from CSV
              </p>
              <div v-if="duplicateNamesInRoster.length > 0" class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                <p class="font-medium">Names already in your roster</p>
                <p class="mt-1 text-muted-foreground">
                  The following {{ duplicateNamesInRoster.length }} name{{ duplicateNamesInRoster.length !== 1 ? 's' : '' }} already exist in your roster and will be skipped if you add without changing them:
                  <span class="font-mono font-medium text-foreground">{{ duplicateNamesInRoster.join(', ') }}</span>
                </p>
                <p class="mt-1 text-xs text-muted-foreground">Edit or remove these rows before adding, or they will fail to import.</p>
              </div>
            </div>

            <!-- Table -->
            <div class="flex-1 min-h-0 quick-add-table-wrapper">
              <Table class="min-w-[1800px]">
                <TableHeader class="sticky top-0 z-20 bg-background">
                  <TableRow>
                    <TableHead class="sticky left-0 z-30 bg-background min-w-[240px]">Name</TableHead>
                    <TableHead class="w-[140px]">Team</TableHead>
                    <TableHead class="w-16">#</TableHead>
                    <TableHead class="w-20">HT</TableHead>
                    <TableHead class="w-14">WT</TableHead>
                    <TableHead class="w-[120px]">OFF</TableHead>
                    <TableHead class="w-[120px]">DEF</TableHead>
                    <TableHead
                      v-for="(attr, ai) in UNIVERSAL_ATTRIBUTE_GROUP.attrs"
                      :key="attr.key"
                      class="w-[52px] text-center text-[10px] px-1"
                      :class="ai === 0 ? 'border-l border-border/40' : ''"
                    >
                      <TooltipProvider :delay-duration="150">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <template v-for="group in OFFENSE_ATTRIBUTE_GROUPS" :key="'oh-' + group.label">
                      <TableHead
                        v-for="(attr, ai) in group.attrs"
                        :key="attr.key"
                        class="w-[52px] text-center text-[10px] px-1"
                        :class="ai === 0 ? 'border-l border-border/40' : ''"
                      >
                        <TooltipProvider :delay-duration="150">
                          <Tooltip>
                            <TooltipTrigger as-child>
                              <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    </template>
                    <template v-for="group in DEFENSE_ATTRIBUTE_GROUPS" :key="'dh-' + group.label">
                      <TableHead
                        v-for="(attr, ai) in group.attrs"
                        :key="attr.key"
                        class="w-[52px] text-center text-[10px] px-1"
                        :class="ai === 0 ? 'border-l border-border/40' : ''"
                      >
                        <TooltipProvider :delay-duration="150">
                          <Tooltip>
                            <TooltipTrigger as-child>
                              <span class="cursor-default">{{ attrShortLabel(attr.label) }}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" class="text-xs">{{ attr.label }}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    </template>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(row, i) in rows" :key="i">
                    <!-- Name (sticky) + Remove -->
                    <TableCell class="sticky left-0 z-10 bg-background px-2 py-1 min-w-[240px]">
                      <div class="flex items-center gap-1">
                        <button
                          @click="removeRow(i)"
                          class="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                        >
                          <X class="w-3.5 h-3.5" />
                        </button>
                        <Input
                          v-model="row.name"
                          placeholder="Player name"
                          class="h-8 text-sm flex-1"
                          :class="row.errors.length > 0 && row.name.trim() === '' ? 'border-destructive' : ''"
                          @blur="validateRow(i)"
                          @keydown.enter="handleEnterOnRow(i)"
                        />
                      </div>
                    </TableCell>
                    <!-- Team -->
                    <TableCell class="px-2 py-1">
                      <Select v-model="row.team_id">
                        <SelectTrigger class="h-8 text-xs">
                          <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="team in teams" :key="team.id" :value="team.id">
                            {{ team.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <!-- Number -->
                    <TableCell class="px-1 py-1">
                      <input
                        :value="row.number ?? ''"
                        inputmode="numeric"
                        placeholder="#"
                        class="w-14 h-8 text-center text-sm rounded-md border border-input bg-background px-1"
                        @input="(e: Event) => row.number = (e.target as HTMLInputElement).value === '' ? null : parseInt((e.target as HTMLInputElement).value, 10) || null"
                        @blur="validateRow(i)"
                      />
                    </TableCell>
                    <!-- Height -->
                    <TableCell class="px-1 py-1">
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
                    </TableCell>
                    <!-- Weight -->
                    <TableCell class="px-1 py-1">
                      <input
                        :value="row.weight ?? ''"
                        inputmode="numeric"
                        placeholder="lbs"
                        class="w-12 h-8 text-center text-sm rounded-md border border-input bg-background px-1"
                        @input="(e: Event) => row.weight = (e.target as HTMLInputElement).value === '' ? null : parseInt((e.target as HTMLInputElement).value, 10) || null"
                        @blur="validateRow(i)"
                      />
                    </TableCell>
                    <!-- Offense positions (dropdown) -->
                    <TableCell class="px-1 py-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <button class="inline-flex items-center gap-1 px-2 h-8 w-full rounded-md border border-input bg-background text-xs justify-between">
                            <span v-if="row.offense_positions.length" class="flex gap-0.5 overflow-hidden">
                              <span
                                v-for="p in row.offense_positions"
                                :key="p"
                                class="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium text-[11px]"
                              >{{ p }}</span>
                            </span>
                            <span v-else class="text-muted-foreground">Select</span>
                            <ChevronDown class="w-3 h-3 shrink-0 text-muted-foreground ml-auto" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" class="min-w-[160px]">
                          <DropdownMenuItem
                            v-for="pos in OFFENSE_POSITIONS"
                            :key="pos"
                            @select="(e: Event) => { e.preventDefault(); togglePosition(row, 'offense', pos) }"
                          >
                            <Check v-if="row.offense_positions.includes(pos)" class="w-3.5 h-3.5 mr-2 text-primary" />
                            <span v-else class="w-3.5 h-3.5 mr-2 inline-block" />
                            {{ pos }} &mdash; {{ POSITION_LABELS[pos] }}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <!-- Defense positions (dropdown) -->
                    <TableCell class="px-1 py-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <button class="inline-flex items-center gap-1 px-2 h-8 w-full rounded-md border border-input bg-background text-xs justify-between">
                            <span v-if="row.defense_positions.length" class="flex gap-0.5 overflow-hidden">
                              <span
                                v-for="p in row.defense_positions"
                                :key="p"
                                class="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium text-[11px]"
                              >{{ p }}</span>
                            </span>
                            <span v-else class="text-muted-foreground">Select</span>
                            <ChevronDown class="w-3 h-3 shrink-0 text-muted-foreground ml-auto" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" class="min-w-[180px]">
                          <DropdownMenuItem
                            v-for="pos in DEFENSE_POSITIONS"
                            :key="pos"
                            @select="(e: Event) => { e.preventDefault(); togglePosition(row, 'defense', pos) }"
                          >
                            <Check v-if="row.defense_positions.includes(pos)" class="w-3.5 h-3.5 mr-2 text-primary" />
                            <span v-else class="w-3.5 h-3.5 mr-2 inline-block" />
                            {{ pos }} &mdash; {{ POSITION_LABELS[pos] }}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <!-- Universal attributes -->
                    <TableCell
                      v-for="(attr, ai) in UNIVERSAL_ATTRIBUTE_GROUP.attrs"
                      :key="'u-' + attr.key + '-' + i"
                      class="px-0.5 py-1"
                      :class="ai === 0 ? 'border-l border-border/40' : ''"
                    >
                      <input
                        :value="row.universal_attributes[attr.key]"
                        inputmode="numeric"
                        class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                        @input="(e: Event) => row.universal_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                        @blur="(e: Event) => row.universal_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                      />
                    </TableCell>
                    <!-- Offense attributes -->
                    <template v-for="group in OFFENSE_ATTRIBUTE_GROUPS" :key="'o-' + group.label + '-' + i">
                      <TableCell
                        v-for="(attr, ai) in group.attrs"
                        :key="attr.key"
                        class="px-0.5 py-1"
                        :class="ai === 0 ? 'border-l border-border/40' : ''"
                      >
                        <input
                          :value="row.offense_attributes[attr.key]"
                          inputmode="numeric"
                          class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                          @input="(e: Event) => row.offense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                          @blur="(e: Event) => row.offense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                        />
                      </TableCell>
                    </template>
                    <!-- Defense attributes -->
                    <template v-for="group in DEFENSE_ATTRIBUTE_GROUPS" :key="'d-' + group.label + '-' + i">
                      <TableCell
                        v-for="(attr, ai) in group.attrs"
                        :key="attr.key"
                        class="px-0.5 py-1"
                        :class="ai === 0 ? 'border-l border-border/40' : ''"
                      >
                        <input
                          :value="row.defense_attributes[attr.key]"
                          inputmode="numeric"
                          class="w-11 h-7 text-center text-xs rounded border border-input bg-background"
                          @input="(e: Event) => row.defense_attributes[attr.key] = (e.target as HTMLInputElement).value as any"
                          @blur="(e: Event) => row.defense_attributes[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                        />
                      </TableCell>
                    </template>
                  </TableRow>
                </TableBody>
                <tfoot>
                  <TableRow class="hover:bg-transparent border-0">
                    <TableCell :colspan="100" class="sticky left-0">
                      <Button variant="ghost" size="sm" class="text-muted-foreground" @click="addEmptyRow">
                        <Plus class="w-3.5 h-3.5 mr-1.5" />
                        Add Row
                      </Button>
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
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

            <!-- Preview table (after CSV parse) -->
            <template v-else>
              <div class="flex items-center justify-end mb-3">
                <Button variant="ghost" size="sm" class="text-xs" @click="csvMode = 'upload'; rowsFromCsvCount = 0; clearAll()">
                  Re-upload
                </Button>
              </div>
              <div class="rounded border border-border overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader class="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead class="w-16">#</TableHead>
                      <TableHead class="w-14">Ht</TableHead>
                      <TableHead class="w-14">Wt</TableHead>
                      <TableHead>OFF</TableHead>
                      <TableHead>DEF</TableHead>
                      <TableHead class="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, i) in rows"
                      :key="i"
                      :class="row.errors.length > 0 ? 'bg-destructive/5' : ''"
                    >
                      <TableCell :class="row.errors.length > 0 ? 'text-destructive' : ''">{{ row.name || '—' }}</TableCell>
                      <TableCell class="tabular-nums">{{ row.number ?? '—' }}</TableCell>
                      <TableCell class="tabular-nums">{{ row.height ?? '—' }}</TableCell>
                      <TableCell class="tabular-nums">{{ row.weight ?? '—' }}</TableCell>
                      <TableCell>
                        <div class="flex gap-1">
                          <span
                            v-for="pos in row.offense_positions"
                            :key="pos"
                            class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary"
                          >{{ pos }}</span>
                          <span v-if="row.offense_positions.length === 0" class="text-muted-foreground/40">—</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div class="flex gap-1">
                          <span
                            v-for="pos in row.defense_positions"
                            :key="pos"
                            class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary"
                          >{{ pos }}</span>
                          <span v-if="row.defense_positions.length === 0" class="text-muted-foreground/40">—</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span v-if="row.errors.length > 0" class="text-[10px] text-destructive">{{ row.errors[0] }}</span>
                        <span v-else-if="row.warnings.length > 0" class="text-[10px] text-amber-600 dark:text-amber-400">{{ row.warnings[0] }}</span>
                        <span v-else class="text-[10px] text-green-600 dark:text-green-400">OK</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </template>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  X,
  Upload,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wand2,
  Check,
  ChevronDown,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
  POSITION_LABELS,
} from '@/lib/constants'
import { useBulkImport, type ImportRow } from '@/composables/useBulkImport'
import { useTeams } from '@/composables/useTeams'

const props = defineProps<{
  open: boolean
  teams?: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'import-done'): void
  (e: 'imported'): void
}>()

const { addPlayerToTeam } = useTeams()
const teams = computed(() => props.teams ?? [])
const freeAgentTeamId = computed(() => teams.value.find((t) => t.name === 'Free Agent')?.id ?? '')
const { players, bulkCreatePlayers } = usePlayers()
const {
  activeTab,
  rows,
  parseError,
  importing,
  validRows,
  rowWarnings,
  importResult,
  parseCSV,
  checkDuplicateNamesInDb,
  addEmptyRow,
  addSampleRow,
  removeRow,
  clearAll,
  validateRow,
  revalidateAll,
  duplicateNamesInRoster,
} = useBulkImport()

// Local state
const dragOver = ref(false)
const pasteText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const csvMode = ref<'upload' | 'preview'>('upload')
const rowsFromCsvCount = ref(0)

// Initialize with 1 empty row when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    clearAll()
    addEmptyRow(freeAgentTeamId.value || undefined)
    activeTab.value = 'quick'
    pasteText.value = ''
    csvMode.value = 'upload'
    rowsFromCsvCount.value = 0
  }
})

// Close on Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function togglePosition(row: ImportRow, side: 'offense' | 'defense', pos: string) {
  const arr = side === 'offense' ? row.offense_positions : row.defense_positions
  const idx = arr.indexOf(pos)
  if (idx >= 0) {
    arr.splice(idx, 1)
  } else {
    arr.push(pos)
  }
}

function attrShortLabel(label: string) {
  if (label === 'Football IQ') return 'IQ'
  const map: Record<string, string> = {
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

function updateHeight(row: ImportRow, value: string, unit: 'ft' | 'in') {
  const currentHeight = row.height ?? 0
  let ft = Math.floor(currentHeight / 12)
  let inch = currentHeight % 12

  const val = parseInt(value, 10) || 0

  if (unit === 'ft') ft = val
  else inch = val

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
    if (!parseError.value) {
      checkDuplicateNamesInDb(players.value.map((p) => p.name))
      rowsFromCsvCount.value = rows.value.length
      csvMode.value = 'preview'
      activeTab.value = 'quick'
    }
  }
  reader.readAsText(file)
}

function handlePaste() {
  parseCSV(pasteText.value)
  if (!parseError.value) {
    checkDuplicateNamesInDb(players.value.map((p) => p.name))
    rowsFromCsvCount.value = rows.value.length
    csvMode.value = 'preview'
    activeTab.value = 'quick'
  }
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
  const headers = ['Name', 'Number', 'Height', 'Weight', 'Offense', 'Defense']
  UNIVERSAL_ATTRIBUTE_GROUP.attrs.forEach(a => headers.push(a.label))
  OFFENSE_ATTRIBUTE_GROUPS.forEach(g => { g.attrs.forEach(a => headers.push(a.label)) })
  DEFENSE_ATTRIBUTE_GROUPS.forEach(g => { g.attrs.forEach(a => headers.push(a.label)) })

  const sample = ['Example Player', '99', '70', '180', 'WR', 'DB']
  for (let i = 4; i < headers.length; i++) sample.push('5')

  const csvContent = [headers.join(','), sample.join(',')].join('\n')
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
  checkDuplicateNamesInDb(players.value.map((p) => p.name))
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
    const result = await bulkCreatePlayers(toImport)
    importResult.value = {
      created: result.created.length,
      failed: result.errors.length,
      errors: result.errors,
    }
    if (result.created.length > 0) {
      for (const item of result.created) {
        const player = item.player
        const row = validRows.value[item.index]

        if (row && row.team_id) {
          const teamId = row.team_id === 'unassigned' ? freeAgentTeamId.value : row.team_id
          if (teamId) {
            await addPlayerToTeam(
              teamId,
              player.id,
              player.offense_positions[0] ?? null,
              player.defense_positions[0] ?? null
            )
          }
        }
      }
      emit('import-done')
      emit('imported')
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

/* Make the Table component's container fill available height */
.quick-add-table-wrapper :deep([data-slot="table-container"]) {
  height: 100%;
}

/* Shadow for sticky name column (theme-aware) */
:deep(td.sticky),
:deep(th.sticky) {
  box-shadow: 2px 0 8px -2px hsl(var(--border) / 0.5);
}
</style>
