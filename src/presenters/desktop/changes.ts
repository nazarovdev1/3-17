import type { GameState } from '@/core/state/types'

/**
 * What is different tonight (fear-design.md, "Things that change when not observed").
 * `…Tonight` marks the night a change first happens: then it waits until unobserved;
 * on later nights it is simply so.
 */
export interface NightChanges {
  /** A long coat that isn't the player's on the hall hooks (night 2 on). */
  coat: boolean
  coatTonight: boolean
  /** The room chair turned to face the wall of 48 (night 3 on). */
  chairMoved: boolean
  chairMovedTonight: boolean
  /** The entrance chain hanging loose though it was fastened (night 4, after 3:17). */
  chainLoose: boolean
  /** The bundle from home on the landing outside 47 (night 4, after 3:17, until taken). */
  bundle: boolean
  /** Wet footprints from the stairs to door 48 (night 4, once the figure was seen). */
  footprints: boolean
  /** Visible breath in the corridor: the cold from 48 (night 5). */
  breath: boolean
}

/** Where the room chair ends up: in front of the sofa's end, facing the wall of 48. */
export const CHAIR_MOVED = {
  position: [-0.7, 0, -2.75] as [number, number, number],
  rotation: -Math.PI / 2,
}

export function changesFor(nodeId: string, state: GameState): NightChanges {
  const night = state.night
  const visited = (id: string) => state.visitedNodes.includes(id)
  const afterOutage4 = night === 4 && visited('n4_317')
  return {
    // Night 2's day is spent out; the coat is there when the night begins.
    coat:
      night > 2 ||
      (night === 2 &&
        !nodeId.startsWith('n2_day') &&
        !nodeId.startsWith('n2_muhabbat') &&
        !nodeId.startsWith('n2_ask')),
    coatTonight: night === 2,
    chairMoved: night >= 3,
    chairMovedTonight: night === 3,
    chainLoose: afterOutage4,
    bundle: afterOutage4 && !state.flags['took_bundle'],
    footprints: night === 4 && !!state.flags['saw_figure'],
    breath: night === 5,
  }
}
