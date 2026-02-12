import type { Team, TeamPlayer, Player } from '~/lib/types'

// Weight tables (same as usePlayers — kept inline to avoid circular deps)
const OFF_WEIGHTS: Record<string, { key: string; weight: number }[]> = {
  _universal: [
    { key: 'speed', weight: 0.5 }, { key: 'acceleration', weight: 0.25 },
    { key: 'football_iq', weight: 0.5 },
    { key: 'stamina', weight: 0.25 }, { key: 'agility', weight: 0.25 },
    { key: 'hip_drop', weight: 0.25 },
    { key: 'knee_slide', weight: 0.25 }, { key: 'hip_twist', weight: 0.25 },
    { key: 'playmaking', weight: 0.5 },
    { key: 'height', weight: 0.1 }, { key: 'weight', weight: 0.1 },
  ],
  QB: [
    { key: 'throwing_power', weight: 4 }, { key: 'accuracy', weight: 4 },
    { key: 'decision_making', weight: 3 },
    { key: 'pocket_awareness', weight: 2.5 },
    { key: 'height', weight: 1.5 },
  ],
  WR: [
    { key: 'catching', weight: 4 }, { key: 'route_running', weight: 4 },
    { key: 'separation', weight: 3 }, { key: 'release', weight: 2 },
    { key: 'jump_ball', weight: 2 }, { key: 'hip_drop', weight: 1.5 }, { key: 'hip_twist', weight: 1.5 },
    { key: 'height', weight: 2 },
  ],
  C: [
    { key: 'snapping', weight: 4 }, { key: 'snap_accuracy', weight: 3 }, { key: 'football_iq', weight: 2 },
    { key: 'weight', weight: 2 },
  ],
}

const DEF_WEIGHTS: Record<string, { key: string; weight: number }[]> = {
  _universal: [
    { key: 'speed', weight: 0.5 }, { key: 'acceleration', weight: 0.25 },
    { key: 'football_iq', weight: 0.5 },
    { key: 'stamina', weight: 0.25 }, { key: 'agility', weight: 0.5 },
    { key: 'flag_pulling', weight: 0.5 }, { key: 'pursuit', weight: 0.5 },
    { key: 'playmaking', weight: 0.5 },
    { key: 'height', weight: 0.1 }, { key: 'weight', weight: 0.1 },
  ],
  DB: [
    { key: 'coverage', weight: 4 }, { key: 'zone_awareness', weight: 3 },
    { key: 'ball_hawking', weight: 3 }, { key: 'agility', weight: 2.5 },
    { key: 'height', weight: 1.5 },
  ],
  RSH: [
    { key: 'rush', weight: 4 }, { key: 'rush_moves', weight: 4 },
    { key: 'timing', weight: 3 }, { key: 'agility', weight: 2 },
    { key: 'height', weight: 1 },
  ],
  MLB: [
    { key: 'play_recognition', weight: 4 }, { key: 'field_awareness', weight: 4 },
    { key: 'coverage', weight: 2 }, { key: 'agility', weight: 2 },
    { key: 'height', weight: 1 }, { key: 'weight', weight: 1 },
  ],
}

/**
 * Merge universal + side-specific attributes into a single flat map for scoring.
 */
function mergedAttrs(player: Player, side: 'offense' | 'defense'): Record<string, number> {
  const uni = { ...(player.universal_attributes ?? {}) } as unknown as Record<string, number>
  const specific = { ...(side === 'offense' ? player.offense_attributes : player.defense_attributes) } as unknown as Record<string, number>
  
  const extra: Record<string, number> = {}
  if (player.height) extra['height'] = player.height
  if (player.weight) extra['weight'] = player.weight

  return { ...uni, ...specific, ...extra }
}

function computeZScores(
  roster: Player[],
  side: 'offense' | 'defense',
): Map<string, Record<string, number>> {
  const mergedAll = roster.map((p) => ({ id: p.id, attrs: mergedAttrs(p, side) }))
  
  const allKeys = new Set<string>()
  mergedAll.forEach(m => Object.keys(m.attrs).forEach(k => allKeys.add(k)))
  const keys = Array.from(allKeys)

  const stats: Record<string, { mean: number; std: number }> = {}
  for (const key of keys) {
    let defaultVal = 5
    if (key === 'height') defaultVal = 70
    if (key === 'weight') defaultVal = 180

    const vals = mergedAll.map((m) => m.attrs[key] ?? defaultVal)
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
    stats[key] = { mean, std: Math.sqrt(variance) || 1 }
  }

  const result = new Map<string, Record<string, number>>()
  for (const m of mergedAll) {
    const z: Record<string, number> = {}
    for (const key of keys) {
      let defaultVal = 5
      if (key === 'height') defaultVal = 70
      if (key === 'weight') defaultVal = 180
      
      const raw = m.attrs[key] ?? defaultVal
      z[key] = (raw - stats[key].mean) / stats[key].std
    }
    result.set(m.id, z)
  }
  return result
}

function positionScore(
  zScores: Record<string, number>,
  position: string,
  wt: Record<string, { key: string; weight: number }[]>,
): number {
  let score = 0, total = 0
  for (const { key, weight } of wt._universal) { score += (zScores[key] ?? 0) * weight; total += weight }
  for (const { key, weight } of wt[position] ?? []) { score += (zScores[key] ?? 0) * weight; total += weight }
  return total > 0 ? score / total : 0
}

function bestPositionScore(
  zScores: Record<string, number>,
  positions: string[],
  wt: Record<string, { key: string; weight: number }[]>,
): number {
  if (positions.length === 0) return 0
  return Math.max(...positions.map((pos) => positionScore(zScores, pos, wt)))
}

function deterministicSort(a: { score: number; number: number }, b: { score: number; number: number }): number {
  if (b.score !== a.score) return b.score - a.score
  return a.number - b.number
}

function pickStarters(
  slots: string[],
  total: number,
  roster: Player[],
  zMap: Map<string, Record<string, number>>,
  wt: Record<string, { key: string; weight: number }[]>,
  posField: 'offense_positions' | 'defense_positions',
): Map<string, string> {
  const starters = new Map<string, string>() // playerId → position
  const taken = new Set<string>()
  for (const slot of slots) {
    if (starters.size >= total) break
    const candidates = roster
      .filter((p) => !taken.has(p.id) && (p[posField] as string[]).includes(slot))
      .map((p) => ({ id: p.id, number: p.number, score: positionScore(zMap.get(p.id)!, slot, wt) }))
      .sort(deterministicSort)
    if (candidates.length > 0) { starters.set(candidates[0].id, slot); taken.add(candidates[0].id) }
  }
  if (starters.size < total) {
    // Count how many of each slot are already filled vs needed
    const slotCounts = new Map<string, number>()
    for (const s of slots) slotCounts.set(s, (slotCounts.get(s) ?? 0) + 1)
    const filledCounts = new Map<string, number>()
    for (const pos of starters.values()) filledCounts.set(pos, (filledCounts.get(pos) ?? 0) + 1)

    const remaining = roster
      .filter((p) => !taken.has(p.id))
      .map((p) => {
        const positions = p[posField] as string[]
        // Prefer positions that still have unfilled slots
        let bestPos = positions[0] ?? ''
        let bestScore = -Infinity
        for (const pos of positions) {
          const needed = slotCounts.get(pos) ?? 0
          const filled = filledCounts.get(pos) ?? 0
          const hasOpenSlot = filled < needed
          const s = positionScore(zMap.get(p.id)!, pos, wt)
          // Boost score for positions with open slots so they're preferred
          const adjusted = hasOpenSlot ? s + 1000 : s
          if (adjusted > bestScore) { bestScore = adjusted; bestPos = pos }
        }
        return { id: p.id, number: p.number, score: bestPositionScore(zMap.get(p.id)!, positions, wt), bestPos }
      })
      .sort(deterministicSort)
    for (const c of remaining) {
      if (starters.size >= total) break
      starters.set(c.id, c.bestPos)
      filledCounts.set(c.bestPos, (filledCounts.get(c.bestPos) ?? 0) + 1)
    }
  }
  return starters
}

export function useTeams() {
  const client = useSupabaseDB()
  const teams = ref<Team[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTeams() {
    const user = useSupabaseUser()

    if (!user.value) {
      const unwatch = watch(user, (u) => {
        if (u) {
          unwatch()
          fetchTeams()
        }
      })
      return
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('teams')
        .select('*, team_players(*, player:players(*))')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      teams.value = (data ?? []) as Team[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createTeam(name: string, description: string) {
    const user = useSupabaseUser()
    if (!user.value) return null

    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('teams')
        .insert({ user_id: user.value.id, name, description })
        .select()
        .single()

      if (err) throw err
      const team = data as Team
      team.team_players = []
      teams.value.unshift(team)
      return team
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateTeam(id: string, updates: Partial<Team>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const index = teams.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        const existing = teams.value[index]
        teams.value[index] = { ...data, team_players: existing.team_players } as Team
      }
      return data as Team
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteTeam(id: string) {
    const team = teams.value.find((t) => t.id === id)
    if (team?.name === 'Free Agent') return

    loading.value = true
    error.value = null
    try {
      const { error: err } = await client.from('teams').delete().eq('id', id)

      if (err) throw err
      teams.value = teams.value.filter((t) => t.id !== id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addPlayerToTeam(
    teamId: string,
    playerId: string,
    offensePosition: string | null,
    defensePosition: string | null,
  ) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await client
        .from('team_players')
        .insert({
          team_id: teamId,
          player_id: playerId,
          offense_position: offensePosition,
          defense_position: defensePosition,
          offense_starter_locked: false,
          defense_starter_locked: false,
        })
        .select('*, player:players(*)')
        .single()

      if (err) throw err
      const team = teams.value.find((t) => t.id === teamId)
      if (team) {
        if (!team.team_players) team.team_players = []
        team.team_players.push(data as TeamPlayer)
      }
      return data as TeamPlayer
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function removePlayerFromTeam(teamId: string, teamPlayerId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await client
        .from('team_players')
        .delete()
        .eq('id', teamPlayerId)

      if (err) throw err
      const team = teams.value.find((t) => t.id === teamId)
      if (team && team.team_players) {
        team.team_players = team.team_players.filter((tp) => tp.id !== teamPlayerId)
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }



  async function removePlayerFromTeamByPlayerId(teamId: string, playerId: string) {
    loading.value = true
    error.value = null
    try {
      // Find the team_player record first to remove it locally later
      const team = teams.value.find((t) => t.id === teamId)
      const tp = team?.team_players?.find((tp) => tp.player_id === playerId)
      
      const { error: err } = await client
        .from('team_players')
        .delete()
        .match({ team_id: teamId, player_id: playerId })

      if (err) throw err
      
      // Update local state
      if (team && team.team_players) {
        team.team_players = team.team_players.filter((t) => t.player_id !== playerId)
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateTeamPlayer(teamPlayerId: string, updates: Partial<TeamPlayer>) {
    try {
      const { error: err } = await client
        .from('team_players')
        .update(updates)
        .eq('id', teamPlayerId)

      if (err) throw err
      // Update local state
      for (const team of teams.value) {
        const tp = team.team_players?.find((tp) => tp.id === teamPlayerId)
        if (tp) {
          Object.assign(tp, updates)
          break
        }
      }
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function autoAssignTeamStarters(teamId: string) {
    const team = teams.value.find((t) => t.id === teamId)
    if (!team?.team_players || team.team_players.length === 0) return

    // Get the full Player objects from each team_player
    const roster = team.team_players
      .map((tp) => tp.player)
      .filter((p): p is Player => !!p)

    if (roster.length === 0) return

    const offRoster = roster.filter((p) => p.offense_positions.length > 0)
    const defRoster = roster.filter((p) => p.defense_positions.length > 0)

    const offZ = offRoster.length > 0 ? computeZScores(offRoster, 'offense') : new Map()
    const defZ = defRoster.length > 0 ? computeZScores(defRoster, 'defense') : new Map()

    const offStarters = pickStarters(['QB', 'C', 'WR', 'WR', 'WR'], 5, offRoster, offZ, OFF_WEIGHTS, 'offense_positions')
    const defStarters = pickStarters(['RSH'], 5, defRoster, defZ, DEF_WEIGHTS, 'defense_positions')

    // Update each team_player record with starter flag + starting position
    for (const tp of team.team_players) {
      // Respect locks
      if (tp.offense_starter_locked) {
        // Skip offense update entirely for this player
      } else {
        const newOff = offStarters.has(tp.player_id)
        const offPos = offStarters.get(tp.player_id) ?? tp.offense_position
        const updates: Partial<TeamPlayer> = {}
        let changed = false
        
        if (tp.offense_starter !== newOff) { updates.offense_starter = newOff; changed = true }
        if (newOff && tp.offense_position !== offPos) { updates.offense_position = offPos as any; changed = true }
        
        if (changed) await updateTeamPlayer(tp.id, updates)
      }

      if (tp.defense_starter_locked) {
        // Skip defense update entirely for this player
      } else {
        const newDef = defStarters.has(tp.player_id)
        const defPos = defStarters.get(tp.player_id) ?? tp.defense_position
        const updates: Partial<TeamPlayer> = {}
        let changed = false
        
        if (tp.defense_starter !== newDef) { updates.defense_starter = newDef; changed = true }
        if (newDef && tp.defense_position !== defPos) { updates.defense_position = defPos as any; changed = true }
        
        if (changed) await updateTeamPlayer(tp.id, updates)
      }
    }
  }

  async function resetTeamStarters(teamId: string) {
    const team = teams.value.find((t) => t.id === teamId)
    if (!team?.team_players) return

    for (const tp of team.team_players) {
      // Don't reset locked players
      if (tp.offense_starter_locked || tp.defense_starter_locked) continue

      if (tp.offense_starter || tp.defense_starter) {
        await updateTeamPlayer(tp.id, {
          offense_starter: false,
          defense_starter: false,
        } as Partial<TeamPlayer>)
      }
    }
  }

  async function bulkSetPlayerTeams(playerIds: string[], teamIds: string[]) {
    const fa = teams.value.find((t) => t.name === 'Free Agent')
    const realTeamIds = teamIds.filter((id) => {
      const t = teams.value.find((team) => team.id === id)
      return t && t.name !== 'Free Agent'
    })

    for (const playerId of playerIds) {
      // Find all current team memberships for this player
      const currentTeamIds: string[] = []
      const currentTpMap = new Map<string, string>() // teamId → teamPlayerId
      for (const team of teams.value) {
        const tp = team.team_players?.find((tp) => tp.player_id === playerId)
        if (tp) {
          currentTeamIds.push(team.id)
          currentTpMap.set(team.id, tp.id)
        }
      }

      const currentReal = currentTeamIds.filter((id) => id !== fa?.id)

      // Remove from teams not in new list
      for (const teamId of currentReal) {
        if (!realTeamIds.includes(teamId)) {
          const tpId = currentTpMap.get(teamId)
          if (tpId) await removePlayerFromTeam(teamId, tpId)
        }
      }

      // Add to teams in new list
      for (const teamId of realTeamIds) {
        if (!currentReal.includes(teamId)) {
          // Get player's positions for the team_player record
          const player = teams.value
            .flatMap((t) => t.team_players ?? [])
            .find((tp) => tp.player_id === playerId)?.player
          await addPlayerToTeam(
            teamId,
            playerId,
            player?.offense_positions?.[0] ?? null,
            player?.defense_positions?.[0] ?? null,
          )
        }
      }

      // Free Agent logic
      if (realTeamIds.length > 0 && fa) {
        // Remove from Free Agent if on real teams
        const faTpId = currentTpMap.get(fa.id)
        if (faTpId) await removePlayerFromTeam(fa.id, faTpId)
      } else if (realTeamIds.length === 0 && fa) {
        // Add to Free Agent if no real teams
        const alreadyFA = currentTpMap.has(fa.id)
        if (!alreadyFA) {
          await addPlayerToTeam(fa.id, playerId, null, null)
        }
      }
    }
  }

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPlayerToTeam,
    removePlayerFromTeam,
    removePlayerFromTeamByPlayerId,
    updateTeamPlayer,
    autoAssignTeamStarters,
    resetTeamStarters,
    bulkSetPlayerTeams,
  }
}
