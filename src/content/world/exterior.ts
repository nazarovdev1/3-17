import { inRect, type Rect } from './layout'

/**
 * Outside the building (ending B): the snowy courtyard four floors down and the early bus
 * idling by the kerb with its door open. Metres in the same plan as layout.ts; the ground
 * is GROUND_Y below the 4th floor.
 */
export const GROUND_Y = -8.6

/** Where the player can walk outside: the yard between our building and the bus. */
export const YARD: Rect = { x0: -6, x1: 9, z0: -16.6, z1: -4.4 }

/** The bus along the kerb: its body, the open front door on the yard side, its seats. */
export const BUS = {
  x0: -4.5,
  x1: 7.5,
  z0: -19.6,
  z1: -17.1,
  floor: GROUND_Y + 0.42,
  door: { x0: 5.6, x1: 6.6 },
} as const

/** In front of the bus's open door. */
export const BUS_DOOR: Rect = { x0: 5.3, x1: 6.9, z0: -16.6, z1: -15.6 }

/** Seated inside, by a window on the far side, facing the glass. */
export const BUS_SEAT: [number, number, number] = [2.4, BUS.floor + 1.18, -18.2]

/** The yard's height for a body at `feet`, or null (only reachable once the player is out). */
export function yardHeight(x: number, z: number, feet: number): number | null {
  return Math.abs(feet - GROUND_Y) < 0.45 && inRect(YARD, x, z) ? GROUND_Y : null
}

export function outsideZonesAt(x: number, z: number): string[] {
  const out = ['yard']
  if (inRect(BUS_DOOR, x, z)) out.push('bus_door')
  return out
}

/** Feet are on the ground outside. */
export const isOutside = (feet: number) => feet < GROUND_Y + 1
