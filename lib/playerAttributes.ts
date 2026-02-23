import {
  DEFAULT_OFFENSE_ATTRIBUTES,
  DEFAULT_DEFENSE_ATTRIBUTES,
  DEFAULT_UNIVERSAL_ATTRIBUTES,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
} from '~/lib/constants'

const OFFENSE_ATTR_KEYS_BY_POSITION: Record<string, string[]> = {}
OFFENSE_ATTRIBUTE_GROUPS.forEach((g) => {
  const keys = g.attrs.map((a) => a.key)
  if (g.label === 'Evasion') {
    OFFENSE_ATTR_KEYS_BY_POSITION['Evasion'] = keys
  } else {
    OFFENSE_ATTR_KEYS_BY_POSITION[g.label] = keys
  }
})

const DEFENSE_ATTR_KEYS_BY_POSITION: Record<string, string[]> = {}
DEFENSE_ATTRIBUTE_GROUPS.forEach((g) => {
  const keys = g.attrs.map((a) => a.key)
  if (g.label === 'Evasion') {
    DEFENSE_ATTR_KEYS_BY_POSITION['Evasion'] = keys
  } else {
    DEFENSE_ATTR_KEYS_BY_POSITION[g.label] = keys
  }
})

export function getOffenseAttrKeysForPositions(positions: string[]): string[] {
  const keys = new Set<string>()
  positions.forEach((pos) => {
    const groupKeys = OFFENSE_ATTR_KEYS_BY_POSITION[pos]
    if (groupKeys) groupKeys.forEach((k) => keys.add(k))
  })
  if (positions.length > 0) {
    const eva = OFFENSE_ATTR_KEYS_BY_POSITION['Evasion']
    if (eva) eva.forEach((k) => keys.add(k))
  }
  return Array.from(keys)
}

export function getDefenseAttrKeysForPositions(positions: string[]): string[] {
  const keys = new Set<string>()
  positions.forEach((pos) => {
    const groupKeys = DEFENSE_ATTR_KEYS_BY_POSITION[pos]
    if (groupKeys) groupKeys.forEach((k) => keys.add(k))
  })
  if (positions.length > 0) {
    const eva = DEFENSE_ATTR_KEYS_BY_POSITION['Evasion']
    if (eva) eva.forEach((k) => keys.add(k))
  }
  return Array.from(keys)
}

const ALL_OFFENSE_KEYS = Object.keys(DEFAULT_OFFENSE_ATTRIBUTES)
const ALL_DEFENSE_KEYS = Object.keys(DEFAULT_DEFENSE_ATTRIBUTES)

/** Set all non-position-relevant attributes to 5. Keeps position-relevant attrs as-is. */
export function sanitizeAttributesForPositions(
  offensePositions: string[],
  defensePositions: string[],
  universal: Record<string, number>,
  offense: Record<string, number>,
  defense: Record<string, number>,
): {
  universal_attributes: Record<string, number>
  offense_attributes: Record<string, number>
  defense_attributes: Record<string, number>
} {
  const offRelevant = new Set(getOffenseAttrKeysForPositions(offensePositions))
  const defRelevant = new Set(getDefenseAttrKeysForPositions(defensePositions))

  const offenseOut: Record<string, number> = {}
  ALL_OFFENSE_KEYS.forEach((key) => {
    offenseOut[key] = offRelevant.has(key) ? (offense[key] ?? 5) : 5
  })

  const defenseOut: Record<string, number> = {}
  ALL_DEFENSE_KEYS.forEach((key) => {
    defenseOut[key] = defRelevant.has(key) ? (defense[key] ?? 5) : 5
  })

  return {
    universal_attributes: { ...DEFAULT_UNIVERSAL_ATTRIBUTES, ...universal } as Record<string, number>,
    offense_attributes: offenseOut,
    defense_attributes: defenseOut,
  }
}

/** Get offense attribute groups visible for the given offense positions. */
export function getVisibleOffenseGroups(offensePositions: string[]) {
  if (offensePositions.length === 0) return []
  return OFFENSE_ATTRIBUTE_GROUPS.filter((g) => {
    if (g.label === 'Evasion') return true
    return offensePositions.includes(g.label)
  })
}

/** Get defense attribute groups visible for the given defense positions. */
export function getVisibleDefenseGroups(defensePositions: string[]) {
  if (defensePositions.length === 0) return []
  return DEFENSE_ATTRIBUTE_GROUPS.filter((g) => {
    if (g.label === 'Evasion') return true
    return defensePositions.includes(g.label)
  })
}

/** Reset attributes for a specific position group to 5. */
export function resetAttributesForPosition(
  side: 'offense' | 'defense',
  position: string,
  offense: Record<string, number>,
  defense: Record<string, number>,
): void {
  const keys =
    side === 'offense'
      ? OFFENSE_ATTR_KEYS_BY_POSITION[position]
      : DEFENSE_ATTR_KEYS_BY_POSITION[position]
  if (!keys) return
  if (side === 'offense') {
    keys.forEach((k) => { offense[k] = 5 })
  } else {
    keys.forEach((k) => { defense[k] = 5 })
  }
}
