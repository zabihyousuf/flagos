import type { CanvasData, CanvasPlayer, Player, UniversalAttributes, OffenseAttributes, DefenseAttributes } from './types'

export const OFFENSE_POSITIONS = ['QB', 'C', 'WR'] as const
export const DEFENSE_POSITIONS = ['DB', 'RSH', 'MLB'] as const

export const POSITION_COLORS: Record<string, string> = {
  QB: '#f97316',
  WR: '#22c55e',
  C: '#f59e0b',
  DB: '#ef4444',
  RSH: '#a855f7',
  MLB: '#3b82f6',
}

export const POSITION_LABELS: Record<string, string> = {
  QB: 'Quarterback',
  WR: 'Wide Receiver',
  C: 'Center',
  DB: 'Defensive Back',
  RSH: 'Rusher',
  MLB: 'Middle Linebacker',
}

/** Defaults for new players. When backfilling existing players, new attributes are inferred from
 * current values (e.g. reaction_time from speed+agility+football_iq, reach from height,
 * body_control_balance from agility+evasion, offense/defense new attrs from related existing attrs).
 * See migration: backfill_new_attributes_from_current_values. */
export const DEFAULT_UNIVERSAL_ATTRIBUTES: UniversalAttributes = {
  speed: 5,
  acceleration: 5,
  stamina: 5,
  football_iq: 5,
  agility: 5,
  playmaking: 5,
  reaction_time: 5,
  deceleration: 5,
  change_of_direction: 5,
  reach: 5,
  body_control_balance: 5,
  field_vision: 5,
}

export const DEFAULT_OFFENSE_ATTRIBUTES: OffenseAttributes = {
  throwing_power: 5,
  accuracy: 5,
  decision_making: 5,
  pocket_awareness: 5,
  release_quickness: 5,
  throw_timing: 5,
  throw_on_run: 5,
  ball_security: 5,
  catching: 5,
  route_running: 5,
  release: 5,
  separation: 5,
  jump_ball: 5,
  ball_tracking: 5,
  contested_catch: 5,
  hands_consistency: 5,
  after_catch_vision: 5,
  snapping: 5,
  snap_accuracy: 5,
  snap_speed: 5,
  snap_velocity: 5,
  hip_drop: 5,
  knee_slide: 5,
  hip_twist: 5,
}

export const DEFAULT_DEFENSE_ATTRIBUTES: DefenseAttributes = {
  coverage: 5,
  ball_hawking: 5,
  zone_awareness: 5,
  coverage_technique: 5,
  ball_skills_defensive: 5,
  closing_burst: 5,
  recovery_agility: 5,
  flag_pull_technique: 5,
  play_recognition: 5,
  rush: 5,
  rush_moves: 5,
  timing: 5,
  get_off_burst: 5,
  rush_angle_efficiency: 5,
  closing_burst_rush: 5,
  rush_discipline: 5,
  sack_flag_conversion: 5,
  field_awareness: 5,
  zone_recognition: 5,
  pursuit_angle: 5,
  coverage_support: 5,
  flag_pulling: 5,
  pursuit: 5,
}

export const UNIVERSAL_ATTRIBUTE_GROUP = {
  label: 'Universal',
  attrs: [
    { key: 'speed', label: 'Speed' },
    { key: 'acceleration', label: 'Acceleration' },
    { key: 'stamina', label: 'Stamina' },
    { key: 'football_iq', label: 'Football IQ' },
    { key: 'agility', label: 'Agility' },
    { key: 'playmaking', label: 'Playmaking' },
    { key: 'reaction_time', label: 'Reaction Time' },
    { key: 'deceleration', label: 'Deceleration' },
    { key: 'change_of_direction', label: 'Change of Direction (COD)' },
    { key: 'reach', label: 'Reach (Catch Radius)' },
    { key: 'body_control_balance', label: 'Body Control / Balance' },
    { key: 'field_vision', label: 'Field Vision' },
  ],
} as const

export const OFFENSE_ATTRIBUTE_GROUPS = [
  {
    label: 'QB',
    attrs: [
      { key: 'throwing_power', label: 'Throwing Power' },
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'decision_making', label: 'Decision Making' },
      { key: 'pocket_awareness', label: 'Pocket Awareness' },
      { key: 'release_quickness', label: 'Release Quickness' },
      { key: 'throw_timing', label: 'Throw Timing (Anticipation)' },
      { key: 'throw_on_run', label: 'Throw on the Run' },
      { key: 'ball_security', label: 'Ball Security' },
    ],
  },
  {
    label: 'WR',
    attrs: [
      { key: 'catching', label: 'Catching' },
      { key: 'route_running', label: 'Route Running' },
      { key: 'release', label: 'Release' },
      { key: 'separation', label: 'Separation' },
      { key: 'jump_ball', label: 'Jump Ball' },
      { key: 'ball_tracking', label: 'Ball Tracking' },
      { key: 'contested_catch', label: 'Contested Catch' },
      { key: 'hands_consistency', label: 'Hands Consistency' },
      { key: 'after_catch_vision', label: 'After Catch Vision' },
    ],
  },
  {
    label: 'C',
    attrs: [
      { key: 'snapping', label: 'Snapping' },
      { key: 'snap_accuracy', label: 'Snap Accuracy' },
      { key: 'snap_speed', label: 'Snap Speed' },
      { key: 'snap_velocity', label: 'Snap Velocity' },
    ],
  },
  {
    label: 'Evasion',
    attrs: [
      { key: 'hip_drop', label: 'Hip Drop' },
      { key: 'knee_slide', label: 'Knee Slide' },
      { key: 'hip_twist', label: 'Hip Twist' },
    ],
  },
] as const

export const DEFENSE_ATTRIBUTE_GROUPS = [
  {
    label: 'DB',
    attrs: [
      { key: 'coverage', label: 'Coverage' },
      { key: 'ball_hawking', label: 'Ball Hawking' },
      { key: 'zone_awareness', label: 'Zone Awareness' },
      { key: 'coverage_technique', label: 'Coverage Technique' },
      { key: 'ball_skills_defensive', label: 'Ball Skills (Defensive)' },
      { key: 'closing_burst', label: 'Closing Burst' },
      { key: 'recovery_agility', label: 'Recovery Agility' },
      { key: 'flag_pull_technique', label: 'Flag Pull Technique' },
      { key: 'play_recognition', label: 'Play Recognition' },
    ],
  },
  {
    label: 'RSH',
    attrs: [
      { key: 'rush', label: 'Rush' },
      { key: 'rush_moves', label: 'Rush Moves' },
      { key: 'timing', label: 'Timing' },
      { key: 'get_off_burst', label: 'Get-Off Burst' },
      { key: 'rush_angle_efficiency', label: 'Rush Angle Efficiency' },
      { key: 'closing_burst_rush', label: 'Closing Burst (Rush)' },
      { key: 'rush_discipline', label: 'Rush Discipline' },
      { key: 'sack_flag_conversion', label: 'Sack / Flag Conversion' },
    ],
  },
  {
    label: 'MLB',
    attrs: [
      { key: 'play_recognition', label: 'Play Recognition' },
      { key: 'field_awareness', label: 'Field Awareness' },
      { key: 'zone_recognition', label: 'Zone Recognition' },
      { key: 'pursuit_angle', label: 'Pursuit Angle' },
      { key: 'coverage_support', label: 'Coverage Support' },
    ],
  },
  {
    label: 'Evasion',
    attrs: [
      { key: 'flag_pulling', label: 'Flag Pulling' },
      { key: 'pursuit', label: 'Pursuit' },
    ],
  },
] as const

/** Weights for attribute contribution to position-fit scoring (1 = normal). Used in determineBestRole etc. */
export const ATTRIBUTE_WEIGHTS: Record<string, number> = {
  // Universal — core for most positions
  speed: 1.2,
  acceleration: 1.1,
  agility: 1.1,
  reaction_time: 1.1,
  change_of_direction: 1.1,
  field_vision: 1.1,
  football_iq: 1.0,
  stamina: 1.0,
  playmaking: 1.0,
  deceleration: 1.0,
  reach: 1.0,
  body_control_balance: 1.0,
  // QB
  throwing_power: 1.2,
  accuracy: 1.2,
  decision_making: 1.2,
  release_quickness: 1.1,
  throw_timing: 1.1,
  pocket_awareness: 1.0,
  throw_on_run: 1.0,
  ball_security: 1.0,
  // WR
  route_running: 1.2,
  catching: 1.2,
  separation: 1.1,
  release: 1.1,
  ball_tracking: 1.1,
  contested_catch: 1.0,
  hands_consistency: 1.0,
  after_catch_vision: 1.0,
  jump_ball: 1.0,
  // C
  snapping: 1.2,
  snap_accuracy: 1.2,
  snap_speed: 1.1,
  snap_velocity: 1.1,
  // DB
  coverage: 1.2,
  ball_hawking: 1.2,
  zone_awareness: 1.1,
  coverage_technique: 1.1,
  closing_burst: 1.1,
  recovery_agility: 1.0,
  ball_skills_defensive: 1.0,
  flag_pull_technique: 1.0,
  play_recognition: 1.0,
  // RSH
  rush: 1.2,
  rush_moves: 1.2,
  get_off_burst: 1.1,
  timing: 1.1,
  closing_burst_rush: 1.0,
  rush_angle_efficiency: 1.0,
  rush_discipline: 1.0,
  sack_flag_conversion: 1.0,
  // MLB
  field_awareness: 1.2,
  play_recognition: 1.2,
  zone_recognition: 1.1,
  pursuit_angle: 1.1,
  coverage_support: 1.0,
  // Evasion (shared)
  flag_pulling: 1.0,
  pursuit: 1.0,
  hip_drop: 1.0,
  knee_slide: 1.0,
  hip_twist: 1.0,
}

export const DEFAULT_FIELD_SETTINGS = {
  field_length: 50,
  field_width: 25,
  endzone_size: 7,
  line_of_scrimmage: 5,
  first_down: 25,
  default_play_view: 'fit' as const,
  default_play_type: 'offense' as const,
  show_ghost_defense_by_default: false,
  default_ghost_defense_play_id: null as string | null,
  sidebar_start_collapsed: false,
  show_player_names_on_canvas: true,
  default_player_label_on_canvas: 'position' as const,
  default_offense_starter_count: 5,
  default_defense_starter_count: 5,
  theme: 'system' as const,
}

export const FIELD_COLORS = {
  grass: '#2d7a45',
  grassLight: '#348c4f',
  endzone: '#c62828',
  endzoneText: 'rgba(255, 255, 255, 0.18)',
  sideline: '#1a1a1a',
  lines: 'rgba(255, 255, 255, 0.5)',
  lineOfScrimmage: '#f97316',
  firstDown: '#fdd835',
  hashMarks: 'rgba(255, 255, 255, 0.3)',
  yardNumbers: 'rgba(255, 255, 255, 0.35)',
}

/** Offense formation slots by player count (5–8). First 5: QB,C,WR,WR,WR. 6–8 add WRs. */
const OFFENSE_SLOTS_BY_COUNT: Record<number, { position: string; x: number; yOffset: number }[]> = {
  5: [
    { position: 'QB', x: 0.5, yOffset: 5 },
    { position: 'C', x: 0.5, yOffset: 0 },
    { position: 'WR', x: 0.2, yOffset: 0 },
    { position: 'WR', x: 0.8, yOffset: 0 },
    { position: 'WR', x: 0.65, yOffset: 0 },
  ],
  6: [
    { position: 'QB', x: 0.5, yOffset: 5 },
    { position: 'C', x: 0.5, yOffset: 0 },
    { position: 'WR', x: 0.2, yOffset: 0 },
    { position: 'WR', x: 0.8, yOffset: 0 },
    { position: 'WR', x: 0.65, yOffset: 0 },
    { position: 'WR', x: 0.35, yOffset: 0 },
  ],
  7: [
    { position: 'QB', x: 0.5, yOffset: 5 },
    { position: 'C', x: 0.5, yOffset: 0 },
    { position: 'WR', x: 0.2, yOffset: 0 },
    { position: 'WR', x: 0.8, yOffset: 0 },
    { position: 'WR', x: 0.65, yOffset: 0 },
    { position: 'WR', x: 0.35, yOffset: 0 },
    { position: 'WR', x: 0.5, yOffset: 0 },
  ],
  8: [
    { position: 'QB', x: 0.5, yOffset: 5 },
    { position: 'C', x: 0.5, yOffset: 0 },
    { position: 'WR', x: 0.2, yOffset: 0 },
    { position: 'WR', x: 0.8, yOffset: 0 },
    { position: 'WR', x: 0.65, yOffset: 0 },
    { position: 'WR', x: 0.35, yOffset: 0 },
    { position: 'WR', x: 0.5, yOffset: 0 },
    { position: 'WR', x: 0.15, yOffset: 0 },
  ],
}

/** Defense formation slots by player count (5–8). First 5: RSH,MLB,DB,DB,DB. 6–8 add DBs. */
const DEFENSE_SLOTS_BY_COUNT: Record<number, { position: string; x: number; yOffset: number }[]> = {
  5: [
    { position: 'RSH', x: 0.5, yOffset: -7 },
    { position: 'MLB', x: 0.5, yOffset: -5 },
    { position: 'DB', x: 0.2, yOffset: -5 },
    { position: 'DB', x: 0.8, yOffset: -5 },
    { position: 'DB', x: 0.5, yOffset: -10 },
  ],
  6: [
    { position: 'RSH', x: 0.5, yOffset: -7 },
    { position: 'MLB', x: 0.5, yOffset: -5 },
    { position: 'DB', x: 0.2, yOffset: -5 },
    { position: 'DB', x: 0.8, yOffset: -5 },
    { position: 'DB', x: 0.5, yOffset: -10 },
    { position: 'DB', x: 0.35, yOffset: -7 },
  ],
  7: [
    { position: 'RSH', x: 0.5, yOffset: -7 },
    { position: 'MLB', x: 0.5, yOffset: -5 },
    { position: 'DB', x: 0.2, yOffset: -5 },
    { position: 'DB', x: 0.8, yOffset: -5 },
    { position: 'DB', x: 0.5, yOffset: -10 },
    { position: 'DB', x: 0.35, yOffset: -7 },
    { position: 'DB', x: 0.65, yOffset: -7 },
  ],
  8: [
    { position: 'RSH', x: 0.5, yOffset: -7 },
    { position: 'MLB', x: 0.5, yOffset: -5 },
    { position: 'DB', x: 0.2, yOffset: -5 },
    { position: 'DB', x: 0.8, yOffset: -5 },
    { position: 'DB', x: 0.5, yOffset: -10 },
    { position: 'DB', x: 0.35, yOffset: -7 },
    { position: 'DB', x: 0.65, yOffset: -7 },
    { position: 'DB', x: 0.25, yOffset: -12 },
  ],
}

/** Get offense slot positions for auto-assign (e.g. ['QB','C','WR','WR','WR']) */
export function getOffenseSlotsForCount(count: number): string[] {
  const slots = OFFENSE_SLOTS_BY_COUNT[Math.min(8, Math.max(5, count))] ?? OFFENSE_SLOTS_BY_COUNT[5]
  return slots.map((s) => s.position)
}

/** Get defense slot positions for auto-assign */
export function getDefenseSlotsForCount(count: number): string[] {
  const slots = DEFENSE_SLOTS_BY_COUNT[Math.min(8, Math.max(5, count))] ?? DEFENSE_SLOTS_BY_COUNT[5]
  return slots.map((s) => s.position)
}

export const OFFENSE_DESIGNATIONS = ['QB', 'WR', 'C'] as const
export const DEFENSE_DESIGNATIONS = ['RSH', 'DB'] as const



export function getDefaultFormation(
  side: 'offense' | 'defense',
  starters?: Player[],
  options?: {
    los?: number
    length?: number
    endzone?: number
    line_of_scrimmage?: number
    field_length?: number
    endzone_size?: number
    default_offense_starter_count?: number
    default_defense_starter_count?: number
  },
  positionMap?: Record<string, string>,
): CanvasData {
  const s = options || DEFAULT_FIELD_SETTINGS
  const los = (s as any).los ?? (s as any).line_of_scrimmage
  const length = (s as any).length ?? (s as any).field_length
  const ez = (s as any).endzone ?? (s as any).endzone_size
  const count = side === 'offense'
    ? Math.min(8, Math.max(5, (s as any).default_offense_starter_count ?? 5))
    : Math.min(8, Math.max(5, (s as any).default_defense_starter_count ?? 5))
  const totalLength = length + (ez * 2)
  
  const oneYard = 1 / totalLength
  const losY = (ez + length - los) * oneYard

  const players: CanvasPlayer[] = []
  const starterPool = starters ? [...starters] : []
  
  const slotMap = side === 'offense' ? OFFENSE_SLOTS_BY_COUNT : DEFENSE_SLOTS_BY_COUNT
  const slots = slotMap[count] ?? slotMap[5]

  slots.forEach((slot, index) => {
    let starter: Player | undefined

    if (starterPool.length > 0) {
      // Try to find a starter whose team-assigned position matches this slot
      let matchIndex = -1
      if (positionMap) {
        matchIndex = starterPool.findIndex(p => positionMap[p.id] === slot.position)
      }
      // Fallback: match by player's capability list
      if (matchIndex === -1) {
        matchIndex = starterPool.findIndex(p => {
          const positions = side === 'offense' ? p.offense_positions : p.defense_positions
          return (positions as string[])?.includes(slot.position)
        })
      }

      if (matchIndex !== -1) {
        starter = starterPool[matchIndex]
        starterPool.splice(matchIndex, 1) // Remove used starter
      } else {
        // Fallback: take first available
        starter = starterPool.shift()
      }
    }

    // Calculate Y
    // Offense (Bottom) "Back" means +Y (Higher value, lower on screen)
    // Defense (Top) "Back" means -Y (Lower value, higher on screen)

    const yPos = losY + (slot.yOffset * oneYard)

    // Use team-assigned position if available, otherwise player's capability list, otherwise slot default
    let assignedPosition = slot.position
    if (starter) {
      if (positionMap?.[starter.id]) {
        assignedPosition = positionMap[starter.id]
      } else {
        const positions = side === 'offense' ? starter.offense_positions : starter.defense_positions
        assignedPosition = positions?.[0] ?? slot.position
      }
    }

    players.push({
      id: `p${Date.now() + index}`,
      x: slot.x,
      y: yPos,
      position: assignedPosition,
      designation: assignedPosition,
      side: side,
      route: null,
      motionPath: null,
      coverageRadius: side === 'defense' && assignedPosition !== 'RSH' ? 5 : undefined, // Rushers have no zone
      alignment: side === 'defense' ? 'normal' : undefined,
      ...(starter && {
        number: starter.number,
        name: starter.name
      })
    })
  })

  return {
    version: 2,
    players,
    annotations: []
  }
}
