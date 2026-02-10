import type { CanvasData, CanvasPlayer, Player, OffenseAttributes, DefenseAttributes } from './types'

export const OFFENSE_POSITIONS = ['QB', 'WR', 'C'] as const
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

export const DEFAULT_OFFENSE_ATTRIBUTES: OffenseAttributes = {
  speed: 5,
  football_iq: 5,
  stamina: 5,
  catching: 5,
  throwing: 5,
  route_running: 5,
  throwing_power: 5,
  accuracy: 5,
  decision_making: 5,
  pocket_awareness: 5,
  release: 5,
  separation: 5,
  jump_ball: 5,
  snapping: 5,
  ball_spiral_rate: 5,
  snapping_consistency: 5,
  hip_drop: 5,
  knee_slide: 5,
  hip_twist: 5,
}

export const DEFAULT_DEFENSE_ATTRIBUTES: DefenseAttributes = {
  speed: 5,
  football_iq: 5,
  stamina: 5,
  coverage: 5,
  rush: 5,
  agility: 5,
  ball_hawking: 5,
  zone_awareness: 5,
  timing: 5,
  rush_moves: 5,
  flag_pulling: 5,
  pursuit: 5,
  play_recognition: 5,
  field_awareness: 5,
}

export const OFFENSE_ATTRIBUTE_GROUPS = [
  {
    label: 'Universal',
    attrs: [
      { key: 'speed', label: 'Speed' },
      { key: 'football_iq', label: 'Football IQ' },
      { key: 'stamina', label: 'Stamina' },
    ],
  },
  {
    label: 'General',
    attrs: [
      { key: 'catching', label: 'Catching' },
      { key: 'throwing', label: 'Throwing' },
      { key: 'route_running', label: 'Route Running' },
    ],
  },
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
      { key: 'release', label: 'Release' },
      { key: 'separation', label: 'Separation' },
      { key: 'jump_ball', label: 'Jump Ball' },
    ],
  },
  {
    label: 'C',
    attrs: [
      { key: 'snapping', label: 'Snapping' },
      { key: 'ball_spiral_rate', label: 'Ball Spiral Rate' },
      { key: 'snapping_consistency', label: 'Snapping Consistency' },
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
    label: 'Universal',
    attrs: [
      { key: 'speed', label: 'Speed' },
      { key: 'football_iq', label: 'Football IQ' },
      { key: 'stamina', label: 'Stamina' },
    ],
  },
  {
    label: 'General',
    attrs: [
      { key: 'coverage', label: 'Coverage' },
      { key: 'rush', label: 'Rush' },
      { key: 'agility', label: 'Agility' },
    ],
  },
  {
    label: 'DB',
    attrs: [
      { key: 'ball_hawking', label: 'Ball Hawking' },
      { key: 'zone_awareness', label: 'Zone Awareness' },
    ],
  },
  {
    label: 'RSH',
    attrs: [
      { key: 'timing', label: 'Timing' },
      { key: 'rush_moves', label: 'Rush Moves' },
    ],
  },
  {
    label: 'Flag Football',
    attrs: [
      { key: 'flag_pulling', label: 'Flag Pulling' },
      { key: 'pursuit', label: 'Pursuit' },
    ],
  },
  {
    label: 'MLB',
    attrs: [
      { key: 'play_recognition', label: 'Play Recognition' },
      { key: 'field_awareness', label: 'Field Awareness' },
    ],
  },
] as const

export const DEFAULT_FIELD_SETTINGS = {
  field_length: 50,
  field_width: 25, // Standard 5v5 width
  endzone_size: 7,
  line_of_scrimmage: 5,
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

export const OFFENSE_POSITIONS = ['QB', 'C', 'WR', 'RB', 'TE'] as const
export const DEFENSE_POSITIONS = ['RSH', 'LB', 'CB', 'S', 'DB'] as const

export function getDefaultFormation(
  side: 'offense' | 'defense', 
  starters?: Player[], 
  options?: { los: number, length: number, endzone: number }
): CanvasData {
  const settings = options || DEFAULT_FIELD_SETTINGS
  const los = settings.los ?? settings.line_of_scrimmage
  const length = settings.length ?? settings.field_length
  const ez = settings.endzone ?? settings.endzone_size
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
        { position: 'LB', x: 0.5, yOffset: -5 },
        { position: 'CB', x: 0.2, yOffset: -5 },
        { position: 'CB', x: 0.8, yOffset: -5 },
        { position: 'S', x: 0.5, yOffset: -10 },
      ]

  slots.forEach((slot, index) => {
    // Attempt to find starter
    const starter = starters?.[index] // Simple mapping for now
    
    // Calculate Y
    // Offense (Bottom) "Back" means +Y (Higher value, lower on screen)
    // Defense (Top) "Back" means -Y (Lower value, higher on screen)
    
    // Wait, if LOS is at Y=0.8.
    // Offense is BELOW LOS (Y > 0.8).
    // Defense is ABOVE LOS (Y < 0.8).
    
    // So Offense Offset (5 yds back) should be ADDED to Y.
    // Defense Offset (-7 yds back) should be SUBTRACTED from Y.
    
    // My slots above use positive for Offense 5. Negative for Defense -7.
    // So generic formula: y = losY + (slot.yOffset * oneYard)
    
    // Wait, let's verify direction.
    // If Offense drives UP (Bottom to Top).
    // They start at Bottom.
    // So they are "Behind" the ball (towards Bottom).
    // So YES, larger Y.
    
    // Defense is "Beyond" the ball (towards Top).
    // So YES, smaller Y.
    
    const yPos = losY + (slot.yOffset * oneYard)
    
    players.push({
      id: `p${Date.now() + index}`,
      x: slot.x,
      y: yPos,
      position: slot.position,
      designation: slot.position, // Default designation to position
      side: side,
      route: null,
      motionPath: null,
      coverageRadius: side === 'defense' ? 5 : undefined, // Default 5 yd radius
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
