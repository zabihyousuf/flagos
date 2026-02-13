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

export const DEFAULT_UNIVERSAL_ATTRIBUTES: UniversalAttributes = {
  speed: 5,
  acceleration: 5,
  stamina: 5,
  football_iq: 5,
  agility: 5,
  playmaking: 5,
}

export const DEFAULT_OFFENSE_ATTRIBUTES: OffenseAttributes = {
  throwing_power: 5,
  accuracy: 5,
  decision_making: 5,
  pocket_awareness: 5,
  catching: 5,
  route_running: 5,
  release: 5,
  separation: 5,
  jump_ball: 5,
  snapping: 5,
  snap_accuracy: 5,
  hip_drop: 5,
  knee_slide: 5,
  hip_twist: 5,
}

export const DEFAULT_DEFENSE_ATTRIBUTES: DefenseAttributes = {
  coverage: 5,
  ball_hawking: 5,
  zone_awareness: 5,
  rush: 5,
  rush_moves: 5,
  timing: 5,
  play_recognition: 5,
  field_awareness: 5,
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
    ],
  },
  {
    label: 'C',
    attrs: [
      { key: 'snapping', label: 'Snapping' },
      { key: 'snap_accuracy', label: 'Snap Accuracy' },
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
    ],
  },
  {
    label: 'RSH',
    attrs: [
      { key: 'rush', label: 'Rush' },
      { key: 'rush_moves', label: 'Rush Moves' },
      { key: 'timing', label: 'Timing' },
    ],
  },
  {
    label: 'MLB',
    attrs: [
      { key: 'play_recognition', label: 'Play Recognition' },
      { key: 'field_awareness', label: 'Field Awareness' },
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

export const DEFAULT_FIELD_SETTINGS = {
  field_length: 50,
  field_width: 25, // Standard 5v5 width
  endzone_size: 7,
  line_of_scrimmage: 5,
  first_down: 25, // yard line for first down (e.g. midfield on 50yd field)
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

// Default positions for offense formation slots
const OFFENSE_SLOTS: { position: string; designation: string; x: number; y: number }[] = [
  { position: 'QB', designation: 'QB', x: 0.5, y: 0.62 },
  { position: 'C', designation: 'C', x: 0.5, y: 0.57 },
  { position: 'WR', designation: 'WR', x: 0.15, y: 0.57 },
  { position: 'WR', designation: 'WR', x: 0.85, y: 0.57 },
  { position: 'WR', designation: 'WR', x: 0.7, y: 0.57 },
]

// Default positions for defense formation slots
const DEFENSE_SLOTS: { position: string; designation: string; x: number; y: number }[] = [
  { position: 'RSH', designation: 'RSH', x: 0.5, y: 0.55 },
  { position: 'DB', designation: 'DB', x: 0.3, y: 0.48 },
  { position: 'DB', designation: 'DB', x: 0.7, y: 0.48 },
  { position: 'DB', designation: 'DB', x: 0.25, y: 0.35 },
  { position: 'DB', designation: 'DB', x: 0.75, y: 0.35 },
]

export const OFFENSE_DESIGNATIONS = ['QB', 'WR', 'C'] as const
export const DEFENSE_DESIGNATIONS = ['RSH', 'DB'] as const



export function getDefaultFormation(
  side: 'offense' | 'defense',
  starters?: Player[],
  options?: { los: number, length: number, endzone: number },
  positionMap?: Record<string, string>,
): CanvasData {
  const s = options || DEFAULT_FIELD_SETTINGS
  const los = (s as any).los ?? (s as any).line_of_scrimmage
  const length = (s as any).length ?? (s as any).field_length
  const ez = (s as any).endzone ?? (s as any).endzone_size
  const totalLength = length + (ez * 2)
  
  // Calculate LOS Y-coordinate (0 is top, 1 is bottom)
  // Field Structure: [EZ 1 (Top)] -- [Field] -- [EZ 2 (Bottom)]
  // If Offense at Bottom driving Up:
  // LOS is measured from "Goal Line" (where field meets EZ 2).
  // So if LOS=5. It is 5 yards "Up" from Bottom Goal Line.
  // Bottom GL Y = (ez + length).
  // 5 yards Up = (ez + length) - 5.
  
  const oneYard = 1 / totalLength
  const losY = (ez + length - los) * oneYard

  const players: CanvasPlayer[] = []
  
  // Create a pool of available starters
  const starterPool = starters ? [...starters] : []
  
  // Define slots relative to LOS
  const slots = side === 'offense' 
    ? [
        { position: 'QB', x: 0.5, yOffset: 5 }, // 5 yds back (towards bottom)
        { position: 'C', x: 0.5, yOffset: 0 },   
        { position: 'WR', x: 0.2, yOffset: 0 },
        { position: 'WR', x: 0.8, yOffset: 0 },
        { position: 'WR', x: 0.65, yOffset: 0 },
      ]
    : [
        { position: 'RSH', x: 0.5, yOffset: -7 }, // 7 yds off ball (towards top/defense side)
        { position: 'MLB', x: 0.5, yOffset: -5 },
        { position: 'DB', x: 0.2, yOffset: -5 },
        { position: 'DB', x: 0.8, yOffset: -5 },
        { position: 'DB', x: 0.5, yOffset: -10 },
      ]

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
