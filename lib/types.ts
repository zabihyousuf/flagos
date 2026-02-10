export interface Profile {
  id: string
  display_name: string | null
  default_team_id: string | null
  created_at: string
  updated_at: string
}

export interface FieldSettings {
  id: string
  user_id: string
  field_length: number
  field_width: number
  endzone_size: number
  line_of_scrimmage: number
  created_at: string
  updated_at: string
}

export interface Playbook {
  id: string
  user_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  plays?: Play[]
}

export interface Play {
  id: string
  playbook_id: string
  user_id: string
  name: string
  play_type: 'offense' | 'defense'
  formation: string
  canvas_data: CanvasData
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  user_id: string
  name: string
  number: number
  photo_url: string | null
  offense_positions: OffensePosition[]
  defense_positions: DefensePosition[]
  offense_attributes: OffenseAttributes
  defense_attributes: DefenseAttributes
  offense_starter: boolean
  defense_starter: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  user_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  team_players?: TeamPlayer[]
}

export interface TeamPlayer {
  id: string
  team_id: string
  player_id: string
  offense_position: OffensePosition | null
  defense_position: DefensePosition | null
  offense_starter: boolean
  defense_starter: boolean
  player?: Player
}

export type OffensePosition = 'QB' | 'WR' | 'C'
export type DefensePosition = 'DB' | 'RSH' | 'MLB'
export type PlayType = 'offense' | 'defense'

export interface OffenseAttributes {
  // Universal
  speed: number
  football_iq: number
  stamina: number
  // General
  catching: number
  throwing: number
  route_running: number
  // QB
  throwing_power: number
  accuracy: number
  decision_making: number
  pocket_awareness: number
  // WR
  release: number
  separation: number
  jump_ball: number
  // C
  snapping: number
  ball_spiral_rate: number
  snapping_consistency: number
  // Evasion
  hip_drop: number
  knee_slide: number
  hip_twist: number
}

export interface DefenseAttributes {
  // Universal
  speed: number
  football_iq: number
  stamina: number
  // General
  coverage: number
  rush: number
  agility: number
  // DB
  ball_hawking: number
  zone_awareness: number
  // RSH
  timing: number
  rush_moves: number
  // Flag Football
  flag_pulling: number
  pursuit: number
  // MLB
  play_recognition: number
  field_awareness: number
}

// Canvas types
export interface CanvasData {
  version: number
  players: CanvasPlayer[]
  annotations: CanvasAnnotation[]
}

export interface CanvasPlayer {
  id: string
  x: number
  y: number
  position: string
  designation: string
  side: 'offense' | 'defense'
  route: CanvasRoute | null
  motionPath: CanvasPoint[] | null
  number?: number
  name?: string
  /** Defensive attributes */
  coverageRadius?: number // In yards
  alignment?: 'tight' | 'normal' | 'soft' | 'off' // Alignment depth
  /** @deprecated Use designation instead */
  label?: string
}

export interface CanvasRoute {
  segments: RouteSegment[]
  /** @deprecated Use segments instead — kept for migration */
  points?: CanvasPoint[]
  /** @deprecated Use segments instead */
  type?: 'curve' | 'straight'
  /** @deprecated Use segments instead */
  color?: string
}

export interface RouteSegment {
  points: CanvasPoint[]
  type: 'straight' | 'curve' | 'option'
  readOrder?: number // 1, 2, 3... read progression
}

export interface CanvasPoint {
  x: number
  y: number
}

export interface CanvasAnnotation {
  id: string
  type: 'text' | 'arrow' | 'line'
  x: number
  y: number
  text?: string
  points?: CanvasPoint[]
  color: string
}

export type CanvasTool = 'select' | 'straight' | 'curve' | 'option' | 'motion' | 'readorder' | 'erase'

export type OffenseDesignation = 'Q' | 'X' | 'Y' | 'Z' | 'C'
export type DefenseDesignation = 'R' | 'D1' | 'D2' | 'D3' | 'D4'

