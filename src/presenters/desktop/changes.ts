/**
 * What is different tonight (fear-design.md, "Things that change when not observed").
 * `…Tonight` marks the night a change first happens: then it waits until unobserved;
 * on later nights it is simply so.
 */
export interface NightChanges {
  /** A long coat that isn't the player's on the hall hooks (night 3 on). */
  coat: boolean
  coatTonight: boolean
  /** The same coat inside the wardrobe on night 2 (BEATS night 2 #11). */
  wardrobeCoat: boolean
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

export function changesFor(
  night: number,
  flags: Record<string, unknown>,
  daylight: boolean,
): NightChanges {
  const afterOutage4 = night === 4 && !!flags['power_off']
  return {
    // Night 2 it hangs in the wardrobe; on night 3 it is on the hooks the moment nobody looks.
    coat: night >= 3,
    coatTonight: night === 3,
    wardrobeCoat: night === 2 && !daylight,
    chairMoved: night >= 3,
    chairMovedTonight: night === 3,
    chainLoose: afterOutage4,
    bundle: afterOutage4 && !flags['took_parcel'],
    footprints: night === 4 && !!flags['saw_figure'],
    // Night 5 all night; night 4 once the entrance has swung open on the cold landing.
    breath: night === 5 || (night === 4 && !!flags['cold_n4']),
  }
}
