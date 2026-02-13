import { 
  DEFAULT_UNIVERSAL_ATTRIBUTES, 
  DEFAULT_OFFENSE_ATTRIBUTES, 
  DEFAULT_DEFENSE_ATTRIBUTES,
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS
} from '~/lib/constants'

export interface ImportRow {
  name: string
  number: number | null
  height: number | null
  weight: number | null
  team_id: string
  offense_positions: string[]
  defense_positions: string[]
  universal_attributes: Record<string, number>
  offense_attributes: Record<string, number>
  defense_attributes: Record<string, number>
  errors: string[]
  warnings: string[]
}

export interface ImportResult {
  created: number
  failed: number
  errors: { index: number; message: string }[]
}

const VALID_OFFENSE = [...OFFENSE_POSITIONS]
const VALID_DEFENSE = [...DEFENSE_POSITIONS]

// Flexible column name matching
const NAME_ALIASES = ['name', 'player name', 'player', 'full name', 'fullname']
const NUMBER_ALIASES = ['number', '#', 'num', 'jersey', 'jersey number', 'no', 'no.']
const OFFENSE_ALIASES = ['offense', 'off', 'offense positions', 'off pos', 'offensive', 'offense position']
const DEFENSE_ALIASES = ['defense', 'def', 'defense positions', 'def pos', 'defensive', 'defense position']
const HEIGHT_ALIASES = ['height', 'ht', 'hgt', 'tall']
const WEIGHT_ALIASES = ['weight', 'wt', 'wgt', 'heavy']

function matchColumn(header: string, aliases: string[]): boolean {
  const h = header.trim().toLowerCase()
  return aliases.includes(h)
}

function parsePositions(raw: string): { offense: string[]; defense: string[] } {
  const tokens = raw
    .split(/[,\/\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  const offense: string[] = []
  const defense: string[] = []

  for (const tok of tokens) {
    if (VALID_OFFENSE.includes(tok as any)) offense.push(tok)
    else if (VALID_DEFENSE.includes(tok as any)) defense.push(tok)
  }

  return { offense, defense }
}

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] ?? ''
  const counts = { ',': 0, '\t': 0, ';': 0 }
  for (const ch of firstLine) {
    if (ch in counts) counts[ch as keyof typeof counts]++
  }
  if (counts['\t'] >= counts[','] && counts['\t'] >= counts[';']) return '\t'
  if (counts[';'] > counts[',']) return ';'
  return ','
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

// Helper to normalize header for matching
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function clampAttr(val: number): number {
  return Math.min(10, Math.max(1, Math.round(val)))
}

export function useBulkImport() {
  const rows = ref<ImportRow[]>([])
  const importing = ref(false)
  const importResult = ref<ImportResult | null>(null)

  const parseError = ref<string | null>(null)
  const activeTab = ref<'quick' | 'csv'>('quick')
  const csvInput = ref('')

  const rowWarnings = computed(() => {
    return rows.value.reduce<string[]>((acc, row, i) => {
      if (row.warnings.length) {
        row.warnings.forEach((w) => acc.push(`Row ${i + 1}: ${w}`))
      }
      return acc
    }, [])
  })

  const DB_DUPLICATE_WARNING = 'Name already in roster'

  function checkDuplicateNumbers(list: ImportRow[]) {
    const seen = new Map<number, number[]>()
    list.forEach((r, i) => {
      if (r.number !== null) {
        const indices = seen.get(r.number) ?? []
        indices.push(i)
        seen.set(r.number, indices)
      }
    })
    for (const [num, indices] of seen) {
      if (indices.length > 1) {
        for (const i of indices) {
          list[i].warnings.push(`Duplicate #${num}`)
        }
      }
    }
  }

  /** Mark rows whose name exists in the DB (case-insensitive). Call after parse or when existing names change. */
  function checkDuplicateNamesInDb(existingNames: string[]) {
    const set = new Set(existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean))
    for (const row of rows.value) {
      const name = row.name.trim()
      if (!name) continue
      const isDuplicate = set.has(name.toLowerCase())
      const hasWarning = row.warnings.some((w) => w === DB_DUPLICATE_WARNING)
      if (isDuplicate && !hasWarning) row.warnings.push(DB_DUPLICATE_WARNING)
      if (!isDuplicate && hasWarning) row.warnings = row.warnings.filter((w) => w !== DB_DUPLICATE_WARNING)
    }
  }

  function parseCSV(text: string) {
    parseError.value = null
    rows.value = []

    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      parseError.value = 'CSV must have a header row and at least one data row.'
      return
    }

    const delimiter = detectDelimiter(text)
    const headers = parseCSVLine(lines[0], delimiter)
    const normalizedHeaders = headers.map(normalizeHeader)

    // Map Core Columns
    let nameCol = -1
    let numberCol = -1
    let offenseCol = -1
    let defenseCol = -1
    let heightCol = -1
    let weightCol = -1

    headers.forEach((h, i) => {
      if (matchColumn(h, NAME_ALIASES)) nameCol = i
      else if (matchColumn(h, NUMBER_ALIASES)) numberCol = i
      else if (matchColumn(h, OFFENSE_ALIASES)) offenseCol = i
      else if (matchColumn(h, DEFENSE_ALIASES)) defenseCol = i
      else if (matchColumn(h, HEIGHT_ALIASES)) heightCol = i
      else if (matchColumn(h, WEIGHT_ALIASES)) weightCol = i
    })

    if (nameCol === -1) {
      parseError.value = 'Could not find a "Name" column. Expected headers like: Name, Number, Offense, Defense'
      return
    }

    // Map Attribute Columns
    const uniMap = new Map<string, number>() // key -> colIndex
    const offMap = new Map<string, number>()
    const defMap = new Map<string, number>()

    // Universal
    for (const attr of UNIVERSAL_ATTRIBUTE_GROUP.attrs) {
      const idx = normalizedHeaders.indexOf(normalizeHeader(attr.label))
      if (idx !== -1) uniMap.set(attr.key, idx)
      else {
        // Try key match as fallback
        const keyIdx = normalizedHeaders.indexOf(normalizeHeader(attr.key))
        if (keyIdx !== -1) uniMap.set(attr.key, keyIdx)
      }
    }

    // Offense
    for (const group of OFFENSE_ATTRIBUTE_GROUPS) {
      for (const attr of group.attrs) {
        const idx = normalizedHeaders.indexOf(normalizeHeader(attr.label))
        if (idx !== -1) offMap.set(attr.key, idx)
        else {
           const keyIdx = normalizedHeaders.indexOf(normalizeHeader(attr.key))
           if (keyIdx !== -1) offMap.set(attr.key, keyIdx)
        }
      }
    }

    // Defense
    for (const group of DEFENSE_ATTRIBUTE_GROUPS) {
      for (const attr of group.attrs) {
        const idx = normalizedHeaders.indexOf(normalizeHeader(attr.label))
        if (idx !== -1) defMap.set(attr.key, idx)
        else {
           const keyIdx = normalizedHeaders.indexOf(normalizeHeader(attr.key))
           if (keyIdx !== -1) defMap.set(attr.key, keyIdx)
        }
      }
    }

    const parsed: ImportRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i], delimiter)
        const name = fields[nameCol]?.trim() ?? ''
  
        // Skip completely empty rows
        if (!name && fields.every((f) => !f.trim())) continue
  
        const rawNumber = numberCol >= 0 ? fields[numberCol]?.trim() : ''
        const rawOffense = offenseCol >= 0 ? fields[offenseCol]?.trim() ?? '' : ''
        const rawDefense = defenseCol >= 0 ? fields[defenseCol]?.trim() ?? '' : ''
        const rawHeight = heightCol >= 0 ? fields[heightCol]?.trim() : ''
        const rawWeight = weightCol >= 0 ? fields[weightCol]?.trim() : ''
  
        const num = rawNumber ? parseInt(rawNumber, 10) : null
        const height = rawHeight ? parseInt(rawHeight, 10) : null
        const weight = rawWeight ? parseInt(rawWeight, 10) : null
        const offPositions = rawOffense ? parsePositions(rawOffense) : { offense: [], defense: [] }
        const defPositions = rawDefense ? parsePositions(rawDefense) : { offense: [], defense: [] }
  
        // Merge offense/defense from both columns
        const offense = [...new Set([...offPositions.offense, ...defPositions.offense])]
        const defense = [...new Set([...offPositions.defense, ...defPositions.defense])]
  
        const errors: string[] = []
        const warnings: string[] = []
  
        if (!name) errors.push('Name is required')
        if (num !== null && (isNaN(num) || num < 0 || num > 99)) errors.push('Number must be 0-99')
        if (height !== null && (isNaN(height) || height < 30 || height > 90)) errors.push('Height must be 30-90 inches')
        if (weight !== null && (isNaN(weight) || weight < 50 || weight > 400)) errors.push('Weight must be 50-400 lbs')

        // Parse Attributes
        const uniAttrs = { ...DEFAULT_UNIVERSAL_ATTRIBUTES }
        const offAttrs = { ...DEFAULT_OFFENSE_ATTRIBUTES }
        const defAttrs = { ...DEFAULT_DEFENSE_ATTRIBUTES }

        for (const [key, colIdx] of uniMap) {
            const val = parseInt(fields[colIdx]?.trim(), 10)
            if (!isNaN(val)) (uniAttrs as any)[key] = clampAttr(val)
        }
        for (const [key, colIdx] of offMap) {
            const val = parseInt(fields[colIdx]?.trim(), 10)
            if (!isNaN(val)) (offAttrs as any)[key] = clampAttr(val)
        }
        for (const [key, colIdx] of defMap) {
            const val = parseInt(fields[colIdx]?.trim(), 10)
            if (!isNaN(val)) (defAttrs as any)[key] = clampAttr(val)
        }
  
        parsed.push({
          name,
          number: num !== null && !isNaN(num) ? num : null,
          height: height !== null && !isNaN(height) ? height : null,
          weight: weight !== null && !isNaN(weight) ? weight : null,
          team_id: 'unassigned', // Default to unassigned
          offense_positions: offense,
          defense_positions: defense,
          universal_attributes: uniAttrs,
          offense_attributes: offAttrs,
          defense_attributes: defAttrs,
          errors,
          warnings,
        })
      }
    
    if (parsed.length === 0) {
      parseError.value = 'No valid data rows found.'
      return
    }

    checkDuplicateNumbers(parsed)
    rows.value = parsed
    // Caller should call checkDuplicateNamesInDb(existingPlayerNames) after parse to mark DB duplicates
  }

  function addEmptyRow() {
    rows.value.push({
      name: '',
      number: null,
      height: null,
      weight: null,
      team_id: 'unassigned',
      offense_positions: [],
      defense_positions: [],
      universal_attributes: (UNIVERSAL_ATTRIBUTE_GROUP.attrs as unknown as any[]).reduce((acc: any, a: any) => ({ ...acc, [a.key]: 5 }), {}),
      offense_attributes: (OFFENSE_ATTRIBUTE_GROUPS as unknown as any[]).flatMap(g => g.attrs).reduce((acc: any, a: any) => ({ ...acc, [a.key]: 5 }), {}),
      defense_attributes: (DEFENSE_ATTRIBUTE_GROUPS as unknown as any[]).flatMap(g => g.attrs).reduce((acc: any, a: any) => ({ ...acc, [a.key]: 5 }), {}),
      errors: [],
      warnings: [],
    })
  }

  function addSampleRow() {
    const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Donald', 'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth', 'George', 'Joshua', 'Kevin', 'Brian', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Stephen', 'Jonathan', 'Larry', 'Justin', 'Scott', 'Brandon', 'Frank', 'Benjamin', 'Gregory', 'Samuel', 'Raymond', 'Patrick', 'Alexander', 'Jack', 'Dennis', 'Jerry']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']
    
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
    const number = Math.floor(Math.random() * 99) + 1
    const height = 65 + Math.floor(Math.random() * 15)
    const weight = 150 + Math.floor(Math.random() * 100)
    
    const offense_positions: string[] = []
    const defense_positions: string[] = []
    
    // Use correct offense positions: QB, C, WR
    const availOff = ['QB', 'C', 'WR']
    const numOffPos = Math.random() > 0.5 ? 1 : 2
    for (let i = 0; i < numOffPos; i++) {
      const pos = availOff[Math.floor(Math.random() * availOff.length)]
      if (!offense_positions.includes(pos)) offense_positions.push(pos)
    }
    
    // Use correct defense positions: MLB, RSH, DB
    const availDef = ['MLB', 'RSH', 'DB']
    const numDefPos = Math.random() > 0.5 ? 1 : 2
    for (let i = 0; i < numDefPos; i++) {
      const pos = availDef[Math.floor(Math.random() * availDef.length)]
      if (!defense_positions.includes(pos)) defense_positions.push(pos)
    }

    const uniAttrs = (UNIVERSAL_ATTRIBUTE_GROUP.attrs as unknown as any[])
    const offAttrs = (OFFENSE_ATTRIBUTE_GROUPS as unknown as any[]).flatMap(g => g.attrs)
    const defAttrs = (DEFENSE_ATTRIBUTE_GROUPS as unknown as any[]).flatMap(g => g.attrs)

    rows.value.push({
      name,
      number,
      height,
      weight,
      team_id: 'unassigned',
      offense_positions: [...new Set(offense_positions)],
      defense_positions: [...new Set(defense_positions)],
      universal_attributes: uniAttrs.reduce((acc: any, a: any) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {}),
      offense_attributes: offAttrs.reduce((acc: any, a: any) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {}),
      defense_attributes: defAttrs.reduce((acc: any, a: any) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {}),
      errors: [],
      warnings: [],
    })
  }

  function removeRow(index: number) {
    rows.value.splice(index, 1)
  }

  function clearAll() {
    rows.value = []
    importResult.value = null
    parseError.value = null
  }

  function revalidateAll() {
    for (const row of rows.value) {
      row.errors = []
      row.warnings = []
      if (!row.name.trim()) row.errors.push('Name is required')
      if (row.number !== null && (row.number < 0 || row.number > 99)) row.errors.push('Number must be 0-99')
    }
    checkDuplicateNumbers(rows.value)
  }

  function validateRow(index: number) {
    const row = rows.value[index]
    if (!row) return
    revalidateAll()
  }

  const validRows = computed(() =>
    rows.value.filter((r) => r.name.trim() && r.errors.length === 0),
  )

  function initQuickAdd(count = 5) {
    clearAll()
    for (let i = 0; i < count; i++) addEmptyRow()
  }

  const duplicateNamesInRoster = computed(() => {
    return rows.value
      .filter((r) => r.warnings.some((w) => w === DB_DUPLICATE_WARNING))
      .map((r) => r.name.trim())
      .filter(Boolean)
  })

  return {
    rows,
    importing,
    importResult,
    parseError,
    parseCSV,
    checkDuplicateNamesInDb,
    addEmptyRow,
    addSampleRow,
    removeRow,
    clearAll,
    validateRow,
    revalidateAll,
    validRows,

    initQuickAdd,
    activeTab,
    csvInput,
    rowWarnings,
    duplicateNamesInRoster,
  }
}
