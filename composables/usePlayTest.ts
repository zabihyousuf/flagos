import type { CanvasPlayer, Player } from '~/lib/types'
import { usePlaySimulation } from './usePlaySimulation'

/**
 * Thin wrapper around usePlaySimulation for offense-only play preview
 * in the play designer. Pass empty defense array — test mode has no defenders.
 */
export function usePlayTest() {
  const sim = usePlaySimulation()

  function initialize(
    offensePlayers: CanvasPlayer[],
    roster: Player[],
    fieldSettings: { field_length: number; field_width: number; endzone_size: number; line_of_scrimmage: number },
  ) {
    sim.initialize(offensePlayers, [], roster, fieldSettings)
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
  }
}
