import type { Point } from './layout'

/**
 * Where the figure (FIX_PROMPT §4.4, fear-design.md) may stand when a beat places it. It is
 * never in good light, never in the open, and gone within seconds: each appearance ends
 * for good once the player has seen it and looked away, walks too close, or waits it out.
 * Pure data so the rules can be tested; World/Figure.tsx renders it.
 */
export type AppearanceId = 'under_door' | 'frosted' | 'stairwell' | 'peephole' | 'tv_reflection'

export interface Appearance {
  id: AppearanceId
  /** Feet position on the floor (ignored for the TV reflection, placed behind the player). */
  position: Point
  /** Rotation about y; 0 faces +z. */
  yaw: number
  /** Head turn relative to the body, eased in over a few seconds (radians). */
  headYaw: number
  /** Head bowed forward (radians): looking down at whoever is in front of it. */
  headPitch?: number
  /** Gone once seen and then out of view (the "look away, look back" rule). */
  vanishWhenUnseen: boolean
  /** Gone when the player comes closer than this (metres, on the floor plane). */
  vanishWithin: number
  /** Gone after this many seconds even if the player keeps staring. */
  maxSeconds: number
  /** Only visible in a reflection (render layer of the TV screen), never in the room. */
  reflectionOnly: boolean
  /** Doors held shut while it stands there (a door that swung open would show it plainly). */
  closedDoors: string[]
  /** Lighting circuits held off while it stands there (it is lit from behind only). */
  darkCircuits: number[]
  /** The landing's timer bulb clicks off while it stands there. */
  landingDark: boolean
}

export const REFLECTION_LAYER = 3

/** Outside the entrance of 47, toes almost touching the door, facing it. */
const UNDER_DOOR: Point = [0.04, 0, 4.78 + 0.24]

const APPEARANCES: Record<AppearanceId, Appearance> = {
  // Feet shadows in the light under the entrance door; the body is on the landing.
  under_door: {
    id: 'under_door',
    position: UNDER_DOOR,
    yaw: Math.PI,
    headYaw: 0,
    // Bowed toward the peephole, which is lower than its eyes.
    headPitch: 0.32,
    vanishWhenUnseen: false,
    vanishWithin: 0,
    maxSeconds: 75,
    reflectionOnly: false,
    closedDoors: ['front_door'],
    darkCircuits: [],
    landingDark: false,
  },
  // A dark shape behind the kitchen's ribbed glass, against the window. Facing the door.
  frosted: {
    id: 'frosted',
    position: [1.06, 0, 1.45],
    yaw: -Math.PI / 2,
    headYaw: 0.2,
    vanishWhenUnseen: true,
    vanishWithin: 1.0,
    maxSeconds: 25,
    reflectionOnly: false,
    closedDoors: ['kitchen_door'],
    darkCircuits: [1],
    landingDark: false,
  },
  // At the far end of the landing, at the head of the stairs, half behind the lift wall;
  // the timer bulb has just clicked off and the light comes up the stairwell behind it.
  stairwell: {
    id: 'stairwell',
    position: [2.5, 0, 6.85],
    yaw: -Math.PI / 2 - 0.2,
    headYaw: 0,
    vanishWhenUnseen: true,
    vanishWithin: 3.2,
    maxSeconds: 20,
    reflectionOnly: false,
    closedDoors: [],
    darkCircuits: [],
    landingDark: true,
  },
  // Through the peephole: by the stairs, back turned. Look away and it is gone.
  peephole: {
    id: 'peephole',
    position: [0.62, 0, 6.35],
    yaw: 0.25,
    headYaw: 0,
    vanishWhenUnseen: true,
    vanishWithin: 0,
    maxSeconds: 9,
    reflectionOnly: false,
    closedDoors: [],
    darkCircuits: [],
    landingDark: false,
  },
  // In the black TV screen: in the room's doorway, dark against the lit corridor, facing
  // the set. Turn around and the doorway is empty.
  tv_reflection: {
    id: 'tv_reflection',
    position: [0.02, 0, 0.32],
    yaw: Math.atan2(2.5, -2.0),
    headYaw: -0.15,
    vanishWhenUnseen: false,
    vanishWithin: 0,
    maxSeconds: 30,
    reflectionOnly: true,
    closedDoors: [],
    darkCircuits: [],
    landingDark: false,
  },
}

/** The appearance the Director placed with a figure action, or nowhere. */
export function appearanceFor(id: string | null): Appearance | null {
  return id && id in APPEARANCES ? APPEARANCES[id as AppearanceId] : null
}
