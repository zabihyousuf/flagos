import type { CanvasPlayer } from '~/lib/types'
import type { Player } from '~/lib/types'

export type SuggestPlayRouteType =
  | 'fly'
  | 'post'
  | 'corner'
  | 'in'
  | 'out'
  | 'curl'
  | 'slant'
  | 'center'
  | 'center_seam'
  | 'option_out_in'

export interface SuggestPlayRoute {
  position: string
  designation: string
  routeType: SuggestPlayRouteType
}

export type QbMotion = 'none' | 'roll_left' | 'roll_right' | 'boot_left' | 'boot_right'

export interface SuggestPlayResult {
  playName: string
  scenario: string
  reason: string
  routes: SuggestPlayRoute[]
  primaryTargetDesignation: string
  readOrderDesignations: string[]
  qbMotion?: QbMotion
}

const ROUTE_TYPES: SuggestPlayRouteType[] = [
  'fly',
  'post',
  'corner',
  'in',
  'out',
  'curl',
  'slant',
  'center',
  'center_seam',
  'option_out_in',
]

export function useSuggestPlay() {
  async function suggestPlay(
    players: CanvasPlayer[],
    roster: Player[],
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage?: number }
  ): Promise<SuggestPlayResult | null> {
    const result = await $fetch<SuggestPlayResult>('/api/suggest-play', {
      method: 'POST',
      body: {
        players,
        roster,
        fieldSettings: {
          field_length: fieldSettings.field_length,
          field_width: fieldSettings.field_width,
          endzone_size: fieldSettings.endzone_size,
        },
      },
    })
    if (!result?.routes?.length) return null
    return result
  }

  return { suggestPlay, ROUTE_TYPES }
}
