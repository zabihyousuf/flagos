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
  first_down?: number
  /** Default canvas view for plays: fit or full */
  default_play_view?: 'fit' | 'full'
  /** Default play type for new plays */
  default_play_type?: 'offense' | 'defense'
  /** New offensive plays open with ghost defense overlay when true */
  show_ghost_defense_by_default?: boolean
  /** Default defensive play to show as ghost (required when show_ghost_defense_by_default is true) */
  default_ghost_defense_play_id?: string | null
  /** Sidebar starts collapsed on load */
  sidebar_start_collapsed?: boolean
  /** Show player names below icons on the canvas */
  show_player_names_on_canvas?: boolean
  /** Default for new players: what to show inside marker (number / position / both / none) */
  default_player_label_on_canvas?: 'number' | 'position' | 'both' | 'none'
  /** Appearance: light, dark, or system (follow OS) */
  theme?: 'light' | 'dark' | 'system'
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
  height: number | null // in inches
  weight: number | null // in lbs
  photo_url: string | null
  offense_positions: OffensePosition[]
  defense_positions: DefensePosition[]
  universal_attributes: UniversalAttributes
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
  offense_starter_locked: boolean
  defense_starter_locked: boolean
  player?: Player
}

export type OffensePosition = 'QB' | 'WR' | 'C'
export type DefensePosition = 'DB' | 'RSH' | 'MLB'
export type PlayType = 'offense' | 'defense'

export interface UniversalAttributes {
  speed: number
  acceleration: number
  stamina: number
  football_iq: number
  agility: number
  playmaking: number
}

export interface OffenseAttributes {
  // QB
  throwing_power: number
  accuracy: number
  decision_making: number
  pocket_awareness: number
  // WR
  catching: number
  route_running: number
  release: number
  separation: number
  jump_ball: number
  // C
  snapping: number
  snap_accuracy: number
  // Evasion
  hip_drop: number
  knee_slide: number
  hip_twist: number
}

export interface DefenseAttributes {
  // DB
  coverage: number
  ball_hawking: number
  zone_awareness: number
  // RSH
  rush: number
  rush_moves: number
  timing: number
  // MLB
  play_recognition: number
  field_awareness: number
  // Evasion
  flag_pulling: number
  pursuit: number
}

// Canvas types
export interface CanvasData {
  version: number
  players: CanvasPlayer[]
  annotations: CanvasAnnotation[]
  /** When viewing an offensive play: id of the defensive play to show as ghost overlay (saved with play) */
  ghost_defense_play_id?: string | null
  /** Canvas view: fit in viewport or full field (saved per play) */
  view_mode?: 'fit' | 'full'
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
  /** When true, zone can be moved; player runs to zone when play starts (line drawn from player to zone) */
  coverageZoneUnlocked?: boolean
  /** Zone center in 0-1 field coords when coverageZoneUnlocked (defaults to player pos) */
  coverageZoneX?: number
  coverageZoneY?: number
  alignment?: 'tight' | 'normal' | 'soft' | 'off' // Alignment depth
  /** Offense: QB throws to this receiver regardless of read progression */
  primaryTarget?: boolean
  /** @deprecated Use designation instead */
  label?: string
  /** Marker shape on the field (saved with play) */
  markerShape?: 'circle' | 'square' | 'triangle'
  /** Override color for this player's marker (hex; saved with play) */
  markerColor?: string
  /** What to show inside the marker: number, position (designation), both, or none (saved with play) */
  showLabel?: 'number' | 'position' | 'both' | 'none'
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

