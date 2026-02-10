import type { Player } from '~/lib/types'
import { DEFAULT_OFFENSE_ATTRIBUTES, DEFAULT_DEFENSE_ATTRIBUTES } from '~/lib/constants'

export function usePlayers() {
  const client = useSupabaseDB()
  const players = ref<Player[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPlayers() {
    const user = useSupabaseUser()

    if (!user.value) {
      const unwatch = watch(user, (u) => {
        if (u) {
          unwatch()
          fetchPlayers()
        }
      })
      return
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('players')
        .select('*')
        .eq('user_id', user.value.id)
        .order('number', { ascending: true })

      if (err) throw err
      players.value = (data ?? []) as Player[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createPlayer(player: {
    name: string
    number: number
    offense_positions: string[]
    defense_positions: string[]
    offense_attributes?: Record<string, number>
    defense_attributes?: Record<string, number>
  }) {
    const user = useSupabaseUser()
    if (!user.value) return null

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('players')
        .insert({
          user_id: user.value.id,
          name: player.name,
          number: player.number,
          offense_positions: player.offense_positions,
          defense_positions: player.defense_positions,
          offense_attributes: player.offense_attributes ?? DEFAULT_OFFENSE_ATTRIBUTES,
          defense_attributes: player.defense_attributes ?? DEFAULT_DEFENSE_ATTRIBUTES,
        })
        .select()
        .single()

      if (err) throw err
      players.value.push(data as Player)
      return data as Player
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePlayer(id: string, updates: Partial<Player>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('players')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const index = players.value.findIndex((p) => p.id === id)
      if (index !== -1) players.value[index] = data as Player
      return data as Player
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePlayer(id: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await client.from('players').delete().eq('id', id)

      if (err) throw err
      players.value = players.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Position-relevant attribute keys and their weights
  const OFF_WEIGHTS: Record<string, { key: string; weight: number }[]> = {
    _universal: [
      { key: 'speed', weight: 0.5 },
      { key: 'football_iq', weight: 0.5 },
      { key: 'stamina', weight: 0.25 },
      { key: 'hip_drop', weight: 0.25 },
      { key: 'knee_slide', weight: 0.25 },
      { key: 'hip_twist', weight: 0.25 },
    ],
    QB: [
      { key: 'throwing', weight: 4 },
      { key: 'accuracy', weight: 4 },
      { key: 'throwing_power', weight: 3 },
      { key: 'decision_making', weight: 3 },
      { key: 'pocket_awareness', weight: 2.5 },
    ],
    WR: [
      { key: 'catching', weight: 4 },
      { key: 'route_running', weight: 4 },
      { key: 'separation', weight: 3 },
      { key: 'release', weight: 2 },
      { key: 'jump_ball', weight: 2 },
      { key: 'hip_drop', weight: 1.5 },
      { key: 'hip_twist', weight: 1.5 },
    ],
    C: [
      { key: 'snapping', weight: 4 },
      { key: 'ball_spiral_rate', weight: 3 },
      { key: 'snapping_consistency', weight: 3 },
      { key: 'football_iq', weight: 2 },
    ],
  }

  const DEF_WEIGHTS: Record<string, { key: string; weight: number }[]> = {
    _universal: [
      { key: 'speed', weight: 0.5 },
      { key: 'football_iq', weight: 0.5 },
      { key: 'stamina', weight: 0.25 },
      { key: 'flag_pulling', weight: 0.5 },
      { key: 'pursuit', weight: 0.5 },
    ],
    DB: [
      { key: 'coverage', weight: 4 },
      { key: 'zone_awareness', weight: 3 },
      { key: 'ball_hawking', weight: 3 },
      { key: 'agility', weight: 2.5 },
    ],
    RSH: [
      { key: 'rush', weight: 4 },
      { key: 'rush_moves', weight: 4 },
      { key: 'timing', weight: 3 },
      { key: 'agility', weight: 2 },
    ],
    MLB: [
      { key: 'play_recognition', weight: 4 },
      { key: 'field_awareness', weight: 4 },
      { key: 'coverage', weight: 2 },
      { key: 'agility', weight: 2 },
    ],
  }

  function computeZScores(
    roster: Player[],
    attrField: 'offense_attributes' | 'defense_attributes',
  ): Map<string, Record<string, number>> {
    // Collect all attribute keys from the first player
    const keys = Object.keys(roster[0]?.[attrField] ?? {})
    // Compute mean and stddev per attribute across the whole roster
    const stats: Record<string, { mean: number; std: number }> = {}
    for (const key of keys) {
      const vals = roster.map((p) => (p[attrField] as Record<string, number>)[key] ?? 5)
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
      const std = Math.sqrt(variance) || 1 // avoid divide-by-zero
      stats[key] = { mean, std }
    }
    // Per-player z-scores
    const result = new Map<string, Record<string, number>>()
    for (const p of roster) {
      const z: Record<string, number> = {}
      for (const key of keys) {
        const raw = (p[attrField] as Record<string, number>)[key] ?? 5
        z[key] = (raw - stats[key].mean) / stats[key].std
      }
      result.set(p.id, z)
    }
    return result
  }

  function relativeScore(
    zScores: Record<string, number>,
    positions: string[],
    weightTable: Record<string, { key: string; weight: number }[]>,
  ): number {
    let score = 0
    let totalWeight = 0

    // Universal attrs
    for (const { key, weight } of weightTable._universal) {
      score += (zScores[key] ?? 0) * weight
      totalWeight += weight
    }

    // Position-specific attrs
    for (const pos of positions) {
      for (const { key, weight } of weightTable[pos] ?? []) {
        score += (zScores[key] ?? 0) * weight
        totalWeight += weight
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0
  }

  // Score a player for a single specific position
  function positionScore(
    zScores: Record<string, number>,
    position: string,
    weightTable: Record<string, { key: string; weight: number }[]>,
  ): number {
    let score = 0
    let totalWeight = 0
    for (const { key, weight } of weightTable._universal) {
      score += (zScores[key] ?? 0) * weight
      totalWeight += weight
    }
    for (const { key, weight } of weightTable[position] ?? []) {
      score += (zScores[key] ?? 0) * weight
      totalWeight += weight
    }
    return totalWeight > 0 ? score / totalWeight : 0
  }

  // Best score across all of a player's positions
  function bestPositionScore(
    zScores: Record<string, number>,
    positions: string[],
    weightTable: Record<string, { key: string; weight: number }[]>,
  ): number {
    if (positions.length === 0) return 0
    return Math.max(...positions.map((pos) => positionScore(zScores, pos, weightTable)))
  }

  // Deterministic sort: higher score first, ties broken by lower player number
  function deterministicSort(a: { score: number; number: number }, b: { score: number; number: number }): number {
    if (b.score !== a.score) return b.score - a.score
    return a.number - b.number
  }

  // Fill exactly `total` starters: positional slots first, then best remaining
  function fillStarters(
    slots: string[],
    total: number,
    roster: Player[],
    zMap: Map<string, Record<string, number>>,
    weightTable: Record<string, { key: string; weight: number }[]>,
    posField: 'offense_positions' | 'defense_positions',
  ): Set<string> {
    const starters = new Set<string>()
    const taken = new Set<string>()

    // Phase 1: fill each positional slot with the best qualified player
    for (const slot of slots) {
      if (starters.size >= total) break
      const candidates = roster
        .filter((p) => !taken.has(p.id) && (p[posField] as string[]).includes(slot))
        .map((p) => ({ id: p.id, number: p.number, score: positionScore(zMap.get(p.id)!, slot, weightTable) }))
        .sort(deterministicSort)

      if (candidates.length > 0) {
        starters.add(candidates[0].id)
        taken.add(candidates[0].id)
      }
    }

    // Phase 2: if still under `total`, fill remaining with best available on that side
    if (starters.size < total) {
      const remaining = roster
        .filter((p) => !taken.has(p.id))
        .map((p) => ({
          id: p.id,
          number: p.number,
          score: bestPositionScore(zMap.get(p.id)!, p[posField] as string[], weightTable),
        }))
        .sort(deterministicSort)

      for (const c of remaining) {
        if (starters.size >= total) break
        starters.add(c.id)
      }
    }

    return starters
  }

  async function autoAssignStarters() {
    const all = players.value
    if (all.length === 0) return

    const offRoster = all.filter((p) => p.offense_positions.length > 0)
    const defRoster = all.filter((p) => p.defense_positions.length > 0)

    const offZ = offRoster.length > 0 ? computeZScores(offRoster, 'offense_attributes') : new Map()
    const defZ = defRoster.length > 0 ? computeZScores(defRoster, 'defense_attributes') : new Map()

    // Offense: 1 QB, 1 C, 3 WR — exactly 5
    const offStarters = fillStarters(['QB', 'C', 'WR', 'WR', 'WR'], 5, offRoster, offZ, OFF_WEIGHTS, 'offense_positions')
    // Defense: 1 RSH required, then best 4 remaining (DB/MLB/any) — merit-based
    const defStarters = fillStarters(['RSH'], 5, defRoster, defZ, DEF_WEIGHTS, 'defense_positions')

    for (const p of all) {
      const newOff = offStarters.has(p.id)
      const newDef = defStarters.has(p.id)
      if (p.offense_starter !== newOff || p.defense_starter !== newDef) {
        await updatePlayer(p.id, { offense_starter: newOff, defense_starter: newDef } as Partial<Player>)
      }
    }
  }

  async function resetStarters() {
    for (const p of players.value) {
      if (p.offense_starter || p.defense_starter) {
        await updatePlayer(p.id, { offense_starter: false, defense_starter: false } as Partial<Player>)
      }
    }
  }

  /**
   * Score a single player at a given position using weighted attributes.
   * Returns a value on a 1-10 scale (raw weighted average of relevant attrs).
   */
  function playerPositionRating(
    player: Player,
    position: string,
    side: 'offense' | 'defense',
  ): number {
    const wt = side === 'offense' ? OFF_WEIGHTS : DEF_WEIGHTS
    const attrs = (side === 'offense' ? player.offense_attributes : player.defense_attributes) as Record<string, number>
    const universal = wt._universal ?? []
    const posWeights = wt[position] ?? []
    let score = 0, totalWeight = 0
    for (const { key, weight } of universal) {
      score += (attrs[key] ?? 5) * weight
      totalWeight += weight
    }
    for (const { key, weight } of posWeights) {
      score += (attrs[key] ?? 5) * weight
      totalWeight += weight
    }
    return totalWeight > 0 ? score / totalWeight : 5
  }

  /**
   * Rate a team's offense or defense on a 1-10 scale.
   * Uses each player's assigned position and weights starters 2x vs bench.
   * Expects team_players with player data attached.
   */
  function teamScore(teamPlayers: Player[], side: 'offense' | 'defense', teamPlayerData?: { player_id: string; position: string | null; starter: boolean }[]): number {
    const posField = side === 'offense' ? 'offense_positions' : 'defense_positions'
    const eligible = teamPlayers.filter((p) => (p[posField] as string[]).length > 0)
    if (eligible.length === 0) return 0

    let totalScore = 0, totalWeight = 0
    for (const p of eligible) {
      // Determine position: use team assignment if available, otherwise best position
      let position = (p[posField] as string[])[0]
      let isStarter = false
      if (teamPlayerData) {
        const tpd = teamPlayerData.find((d) => d.player_id === p.id)
        if (tpd?.position) position = tpd.position
        isStarter = tpd?.starter ?? false
      }
      const rating = playerPositionRating(p, position, side)
      const weight = isStarter ? 2 : 1
      totalScore += rating * weight
      totalWeight += weight
    }
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0
  }

  return {
    players,
    loading,
    error,
    fetchPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
    autoAssignStarters,
    resetStarters,
    teamScore,
  }
}
