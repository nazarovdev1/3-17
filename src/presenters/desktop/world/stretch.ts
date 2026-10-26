import { CORRIDOR_SPLIT_Z, type Rect, type Wall } from '@/content/world/layout'

/**
 * Night-3 corridor stretch for rendering: everything of flat 47 and the landing at or
 * beyond the split moves toward +z by `extension`; walls and floors that cross the split
 * are cut in two. Flat 48 (x < −2.2) never moves.
 */
const affected = (x0: number) => x0 > -2.2

export function shiftZ(x: number, z: number, extension: number) {
  return extension > 0 && affected(x) && z >= CORRIDOR_SPLIT_Z ? z + extension : z
}

export function splitRect(rect: Rect, extension: number): Rect[] {
  if (extension <= 0 || !affected(rect.x0)) return [rect]
  if (rect.z1 <= CORRIDOR_SPLIT_Z) return [rect]
  if (rect.z0 >= CORRIDOR_SPLIT_Z)
    return [{ ...rect, z0: rect.z0 + extension, z1: rect.z1 + extension }]
  return [
    { ...rect, z1: CORRIDOR_SPLIT_Z },
    { ...rect, z0: CORRIDOR_SPLIT_Z + extension, z1: rect.z1 + extension },
  ]
}

export function splitWall(w: Wall, extension: number): Wall[] {
  if (extension <= 0 || !affected(w.box.x0)) return [w]
  if (w.axis === 'x') {
    return w.box.z0 >= CORRIDOR_SPLIT_Z
      ? [{ ...w, box: { ...w.box, z0: w.box.z0 + extension, z1: w.box.z1 + extension } }]
      : [w]
  }
  const [near, far] = [w.box.z0 < CORRIDOR_SPLIT_Z, w.box.z1 > CORRIDOR_SPLIT_Z]
  if (!far) return [w]
  if (!near) {
    return [
      {
        ...w,
        box: { ...w.box, z0: w.box.z0 + extension, z1: w.box.z1 + extension },
        openings: w.openings.map((o) => ({ ...o, at: o.at + extension })),
      },
    ]
  }
  return [
    {
      ...w,
      id: `${w.id}:a`,
      box: { ...w.box, z1: CORRIDOR_SPLIT_Z },
      openings: w.openings.filter((o) => o.at < CORRIDOR_SPLIT_Z),
    },
    {
      ...w,
      id: `${w.id}:b`,
      box: { ...w.box, z0: CORRIDOR_SPLIT_Z + extension, z1: w.box.z1 + extension },
      openings: w.openings
        .filter((o) => o.at >= CORRIDOR_SPLIT_Z)
        .map((o) => ({ ...o, at: o.at + extension })),
    },
  ]
}

/** Walls of the inserted corridor piece (both sides) for a given extension. */
export function insertedWalls(extension: number): Wall[] {
  if (extension <= 0) return []
  const z0 = CORRIDOR_SPLIT_Z
  const z1 = CORRIDOR_SPLIT_Z + extension
  return [-0.65, 0.65].map((x, i) => ({
    id: `stretch_${i}`,
    kind: 'partition' as const,
    axis: 'z' as const,
    box: { x0: x - 0.05, x1: x + 0.05, z0, z1 },
    height: 2.6,
    openings: [],
  }))
}
