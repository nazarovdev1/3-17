import { inRect, type Rect } from './layout'

/**
 * The stairwell below the 4th floor (docs/BEATS.md night 2, owner decision 8): the flight
 * down to the half-landing, the flight on to the 3rd floor, and the 3rd-floor landing where
 * Muhabbat opa lives in 43, under 47. Heights are of the floor under the player's feet, in
 * metres from the 4th-floor landing (0). The way further down is blocked by moving boxes.
 */
export const STOREY = 2.8
export const HALF_LANDING_Y = -STOREY / 2
export const LANDING3_Y = -STOREY

/** Risers per flight and their size (the treads drawn by Architecture follow these). */
export const FLIGHT = { risers: 8, rise: STOREY / 2 / 8, run: 0.25, top: 7.25 } as const
const FLIGHT_END = FLIGHT.top + FLIGHT.risers * FLIGHT.run

/** Flight A goes down from the 4th-floor landing; flight B comes back under the landing. */
// It starts a little onto the landing (at 0 there), so a body can step onto its edge.
export const FLIGHT_A: Rect = { x0: 0.23, x1: 1.53, z0: 7.0, z1: FLIGHT_END }
export const FLIGHT_B: Rect = { x0: 1.68, x1: 2.98, z0: FLIGHT.top, z1: FLIGHT_END }
export const HALF_LANDING: Rect = { x0: 0.2, x1: 3.0, z0: FLIGHT_END, z1: 10.0 }
/** The 3rd-floor landing: the 4th's footprint, one storey down, and the foot of flight B. */
export const LANDING3: Rect = { x0: -6.4, x1: 3.0, z0: 4.78, z1: 7.2 }
const LANDING3_FOOT: Rect = { x0: 1.6, x1: 3.0, z0: 7.2, z1: 7.6 }
/** Moving boxes stacked on the head of the next flight down (nobody goes further). */
export const BOXES3: Rect = { x0: 0.2, x1: 1.6, z0: 6.75, z1: 7.6 }

/** Muhabbat opa's door (43), under 47's; it opens on its chain, toward the landing. */
export const DOOR43 = { x: 0, z: 4.69, width: 0.9 } as const
/** The bread bag on the half-landing windowsill. */
export const BREAD_SILL: [number, number, number] = [1.2, HALF_LANDING_Y + 0.37, 9.9]

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

interface Surface {
  rect: Rect
  height: (x: number, z: number) => number
}

const SURFACES: Surface[] = [
  {
    rect: FLIGHT_A,
    height: (_x, z) => -(STOREY / 2) * clamp01((z - FLIGHT.top) / (FLIGHT_END - FLIGHT.top)),
  },
  { rect: HALF_LANDING, height: () => HALF_LANDING_Y },
  {
    rect: FLIGHT_B,
    height: (_x, z) =>
      HALF_LANDING_Y - (STOREY / 2) * clamp01((FLIGHT_END - z) / (FLIGHT_END - FLIGHT.top)),
  },
  { rect: LANDING3, height: () => LANDING3_Y },
  { rect: LANDING3_FOOT, height: () => LANDING3_Y },
]

/** How far a foot reaches up or down between two frames of walking (a stair riser fits). */
const STEP_REACH = 0.45

/**
 * The floor height of the stairwell at a point, reachable from feet at `feet`, or null.
 * The 4th-floor landing itself is not here (it is a room of the plan, at 0).
 */
export function stairHeight(x: number, z: number, feet: number): number | null {
  let best: number | null = null
  for (const surface of SURFACES) {
    if (!inRect(surface.rect, x, z)) continue
    if (surface.rect === LANDING3 && inRect(BOXES3, x, z)) continue
    const h = surface.height(x, z)
    if (Math.abs(h - feet) > STEP_REACH) continue
    if (best === null || Math.abs(h - feet) < Math.abs(best - feet)) best = h
  }
  return best
}

/** Zones that exist only below the 4th floor. */
export const LOWER_ZONES = ['stairwell', 'landing3', 'half_landing', 'by_43'] as const

/** Below the 4th floor: the stairwell's own zones instead of the plan's rooms. */
export function lowerZonesAt(x: number, z: number, feet: number): string[] {
  const out = ['stairwell']
  if (feet < LANDING3_Y + 0.3 && inRect(LANDING3, x, z)) out.push('landing3')
  if (feet < LANDING3_Y + 0.3 && inRect(LANDING3_FOOT, x, z)) out.push('landing3')
  if (inRect(HALF_LANDING, x, z)) out.push('half_landing')
  // Close enough to 43 to be talked to: the landing in front of it and the foot of the stairs.
  if (feet < -1.8 && Math.hypot(x - DOOR43.x, z - DOOR43.z) < 3.4) out.push('by_43')
  return out
}

/** Feet are below the 4th floor's plan (on the stairs or lower). */
export const isBelow = (feet: number) => feet < -0.3
