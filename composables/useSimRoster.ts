import type { MaybeRef } from 'vue'
import type { CanvasData, CanvasPlayer, Player, SimPlayer, Team } from '~/lib/types'
import { OFFENSE_ATTRIBUTE_GROUPS, DEFENSE_ATTRIBUTE_GROUPS } from '~/lib/constants'
import type { TeamPlayer } from '~/lib/types'

export interface RosterError {
  canvas_player_id: string
  position: string
  message: string
}

export interface ResolveRosterResult {
  success: boolean
  players: SimPlayer[]
  errors: RosterError[]
}

function getPositionAttrKeys(playType: 'offense' | 'defense', position: string): string[] {
  const groups = playType === 'offense' ? OFFENSE_ATTRIBUTE_GROUPS : DEFENSE_ATTRIBUTE_GROUPS
  const keys: string[] = []
  const positionGroup = groups.find((g) => g.label === position)
  if (positionGroup) positionGroup.attrs.forEach((a) => keys.push(a.key))
  const evasionGroup = groups.find((g) => g.label === 'Evasion')
  if (evasionGroup) evasionGroup.attrs.forEach((a) => keys.push(a.key))
  return keys
}

function buildUniversalAttributes(player: Player): SimPlayer['universal_attributes'] {
  const u = player.universal_attributes ?? {}
  return {
    speed: u.speed ?? 5,
    acceleration: u.acceleration ?? 5,
    stamina: u.stamina ?? 5,
    football_iq: u.football_iq ?? 5,
    agility: u.agility ?? 5,
    playmaking: u.playmaking ?? 5,
    reaction_time: u.reaction_time ?? 5,
    deceleration: u.deceleration ?? 5,
    change_of_direction: u.change_of_direction ?? 5,
    reach: u.reach ?? 5,
    body_control_balance: u.body_control_balance ?? 5,
    field_vision: u.field_vision ?? 5,
  }
}

function buildPositionAttributes(
  player: Player,
  playType: 'offense' | 'defense',
  position: string,
): Record<string, number> {
  const keys = getPositionAttrKeys(playType, position)
  const attrs = playType === 'offense' ? player.offense_attributes : player.defense_attributes
  const out: Record<string, number> = {}
  for (const key of keys) {
    out[key] = (attrs as unknown as Record<string, number>)?.[key] ?? 5
  }
  return out
}

function buildSimPlayer(
  canvasPlayer: CanvasPlayer,
  player: Player,
  playType: 'offense' | 'defense',
): SimPlayer {
  const position = canvasPlayer.position || canvasPlayer.designation
  return {
    canvas_player_id: canvasPlayer.id,
    player_id: player.id,
    position,
    canvas_alignment: canvasPlayer.alignment ?? null,
    universal_attributes: buildUniversalAttributes(player),
    position_attributes: buildPositionAttributes(player, playType, position),
  }
}

/**
 * Create a SimPlayer with all-5 default attributes for a canvas slot that has
 * no real starter assigned. Used so the simulation can still run.
 */
function buildBaseSimPlayer(
  canvasPlayer: CanvasPlayer,
  playType: 'offense' | 'defense',
): SimPlayer {
  const position = canvasPlayer.position || canvasPlayer.designation
  const keys = getPositionAttrKeys(playType, position)
  const posAttrs: Record<string, number> = {}
  for (const k of keys) posAttrs[k] = 5
  return {
    canvas_player_id: canvasPlayer.id,
    player_id: null,
    position,
    canvas_alignment: canvasPlayer.alignment ?? null,
    universal_attributes: {
      speed: 5, acceleration: 5, stamina: 5, football_iq: 5,
      agility: 5, playmaking: 5, reaction_time: 5, deceleration: 5,
      change_of_direction: 5, reach: 5, body_control_balance: 5, field_vision: 5,
    },
    position_attributes: posAttrs,
  }
}

function getStartersForTeam(
  teamsInput: MaybeRef<Team[]>,
  teamId: string,
  playType: 'offense' | 'defense',
): { tp: TeamPlayer; player: Player }[] {
  const teamsList = toValue(teamsInput)
  const team = teamsList.find((t) => t.id === teamId)
  if (!team?.team_players) return []
  const isStarter = playType === 'offense'
    ? (tp: TeamPlayer) => tp.offense_starter
    : (tp: TeamPlayer) => tp.defense_starter
  const posField = playType === 'offense' ? 'offense_position' : 'defense_position'
  return team.team_players
    .filter((tp) => isStarter(tp) && tp.player)
    .map((tp) => ({ tp, player: tp.player! }))
}

function assignStartersToCanvas(
  canvasPlayers: CanvasPlayer[],
  starters: { tp: TeamPlayer; player: Player }[],
  playType: 'offense' | 'defense',
): Map<string, { tp: TeamPlayer; player: Player }> {
  const posField = playType === 'offense' ? 'offense_position' : 'defense_position'
  const capField = playType === 'offense' ? 'offense_positions' : 'defense_positions'

  const byPosition = new Map<string, { tp: TeamPlayer; player: Player }[]>()
  for (const { tp, player } of starters) {
    const pos = (tp[posField] as string) ?? ''
    if (!pos) continue
    if (!byPosition.has(pos)) byPosition.set(pos, [])
    byPosition.get(pos)!.push({ tp, player })
  }
  for (const [, list] of byPosition) {
    list.sort((a, b) => (a.player.name ?? '').localeCompare(b.player.name ?? ''))
  }

  const used = new Map<string, number>()
  const assignment = new Map<string, { tp: TeamPlayer; player: Player }>()
  const assignedPlayerIds = new Set<string>()
  const sortedCanvas = [...canvasPlayers].sort((a, b) => a.id.localeCompare(b.id))

  for (const cp of sortedCanvas) {
    const position = cp.position || cp.designation
    const available = byPosition.get(position) ?? []
    const index = used.get(position) ?? 0
    used.set(position, index + 1)
    if (index < available.length) {
      assignment.set(cp.id, available[index])
      assignedPlayerIds.add(available[index].player.id)
    }
  }

  const unfilled = sortedCanvas.filter((cp) => !assignment.has(cp.id))
  if (unfilled.length > 0) {
    const remaining = starters.filter((s) => !assignedPlayerIds.has(s.player.id))
    for (const cp of unfilled) {
      const position = cp.position || cp.designation
      const match = remaining.find((s) =>
        (s.player[capField] as string[])?.includes(position),
      )
      if (match) {
        assignment.set(cp.id, match)
        assignedPlayerIds.add(match.player.id)
        remaining.splice(remaining.indexOf(match), 1)
      }
    }
  }

  return assignment
}

export function useSimRoster(teamsInput: MaybeRef<Team[]>) {
  async function resolveRoster(
    canvasData: CanvasData,
    playType: 'offense' | 'defense',
    teamId: string,
  ): Promise<ResolveRosterResult> {
    const players: SimPlayer[] = []
    const errors: RosterError[] = []
    const canvasPlayers = (canvasData.players ?? []).filter((p) => p.side === playType)
    const starters = getStartersForTeam(teamsInput, teamId, playType)
    const assignment = assignStartersToCanvas(canvasPlayers, starters, playType)
    for (const cp of canvasPlayers) {
      const assigned = assignment.get(cp.id)
      if (!assigned) {
        errors.push({
          canvas_player_id: cp.id,
          position: cp.position || cp.designation,
          message: `No starter found for position ${cp.position || cp.designation}`,
        })
        continue
      }
      players.push(buildSimPlayer(cp, assigned.player, playType))
    }
    return { success: errors.length === 0, players, errors }
  }

  async function resolveRosterWithOverrides(
    canvasData: CanvasData,
    playType: 'offense' | 'defense',
    overrides: Record<string, string>,
    teamId: string,
  ): Promise<ResolveRosterResult> {
    const { players: allPlayers } = usePlayers()
    const starters = getStartersForTeam(teamsInput, teamId, playType)
    const canvasPlayers = (canvasData.players ?? []).filter((p) => p.side === playType)
    const withoutOverride = canvasPlayers.filter((cp) => !overrides[cp.id])
    const assignment = assignStartersToCanvas(withoutOverride, starters, playType)
    const playerById = new Map<string, Player>()
    for (const { player } of starters) {
      playerById.set(player.id, player)
    }
    for (const p of allPlayers.value) {
      playerById.set(p.id, p)
    }
    const players: SimPlayer[] = []
    const errors: RosterError[] = []
    for (const cp of canvasPlayers) {
      const overridePlayerId = overrides[cp.id]
      let player: Player | null = null
      if (overridePlayerId) {
        player = playerById.get(overridePlayerId) ?? null
        if (!player) {
          errors.push({
            canvas_player_id: cp.id,
            position: cp.position || cp.designation,
            message: `Override player ${overridePlayerId} not found`,
          })
          continue
        }
      } else {
        const assigned = assignment.get(cp.id)
        if (assigned) player = assigned.player
      }
      if (!player) {
        errors.push({
          canvas_player_id: cp.id,
          position: cp.position || cp.designation,
          message: `No starter or override for position ${cp.position || cp.designation}`,
        })
        continue
      }
      players.push(buildSimPlayer(cp, player, playType))
    }
    return { success: errors.length === 0, players, errors }
  }

  /**
   * Like resolveRoster but fills unassigned slots with base players (all-5 attrs)
   * instead of producing errors. Returns `warnings` for slots that used fallback.
   */
  async function resolveRosterWithFallback(
    canvasData: CanvasData,
    playType: 'offense' | 'defense',
    teamId: string,
  ): Promise<ResolveRosterResult & { warnings: RosterError[] }> {
    const players: SimPlayer[] = []
    const warnings: RosterError[] = []
    const canvasPlayers = (canvasData.players ?? []).filter((p) => p.side === playType)
    const starters = getStartersForTeam(teamsInput, teamId, playType)
    const assignment = assignStartersToCanvas(canvasPlayers, starters, playType)
    for (const cp of canvasPlayers) {
      const assigned = assignment.get(cp.id)
      if (assigned) {
        players.push(buildSimPlayer(cp, assigned.player, playType))
      } else {
        warnings.push({
          canvas_player_id: cp.id,
          position: cp.position || cp.designation,
          message: `No starter for ${cp.position || cp.designation} — using base player (average attributes)`,
        })
        players.push(buildBaseSimPlayer(cp, playType))
      }
    }
    return { success: true, players, errors: [], warnings }
  }

  /**
   * Quick count of how many starters exist for a team + play type,
   * useful for proactive UI warnings without running a full resolve.
   */
  function countStarters(teamId: string, playType: 'offense' | 'defense'): number {
    return getStartersForTeam(teamsInput, teamId, playType).length
  }

  return { resolveRoster, resolveRosterWithOverrides, resolveRosterWithFallback, countStarters }
}
