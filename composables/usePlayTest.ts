import type { CanvasPlayer, Player } from '~/lib/types'
import { usePlaySimulation } from './usePlaySimulation'

/**
 * Thin wrapper around usePlaySimulation for play preview in the play designer.
 * Always runs in playTestMode (guaranteed catch, anticipation timing, primary target).
 * Optionally accepts ghost defense players who will actively play their zones/rush.
 */
export function usePlayTest() {
  const sim = usePlaySimulation()

  function initialize(
    offensePlayers: CanvasPlayer[],
    defensePlayers: CanvasPlayer[],
    roster: Player[],
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number },
  ) {
    sim.initialize(offensePlayers, defensePlayers, roster, fieldSettings, { playTestMode: true })
  }

  return {
    animatedPositions: sim.animatedPositions,
    animatedBall: sim.animatedBall,
    simulationState: sim.simulationState,
    isRunning: sim.isRunning,
    playbackSpeed: sim.playbackSpeed,
    initialize,
    start: sim.start,
    stop: sim.pause,
    reset: sim.reset,
    /** Clear overlay only — show formation, no canvas/selection state change */
    clearOverlay: sim.clearOverlay,
  }
}
