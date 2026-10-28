import { WORLD, inRect, type Rect } from './layout'

/**
 * Places the Director listens for (docs/BEATS.md triggers). Every room of the plan is a zone
 * under its own id; these add finer spots. Metres, same plan as layout.ts.
 */
export const EXTRA_ZONES: { id: string; rect: Rect }[] = [
  // In front of flat 47's entrance, on the landing.
  { id: 'door47', rect: { x0: -0.9, x1: 1.4, z0: 4.78, z1: 5.9 } },
  // Where the stairs come up to the landing: the way down and out (ending B).
  { id: 'stairs_down', rect: { x0: 0.4, x1: 3.0, z0: 6.7, z1: 7.2 } },
]

/** Zones containing a floor point (rooms by id, plus EXTRA_ZONES). */
export function zonesAt(x: number, z: number): string[] {
  const out: string[] = []
  for (const room of WORLD.rooms)
    if (room.rects.some((rect) => inRect(rect, x, z))) out.push(room.id)
  for (const zone of EXTRA_ZONES) if (inRect(zone.rect, x, z)) out.push(zone.id)
  return out
}
