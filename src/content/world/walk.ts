import {
  CORRIDOR_SPLIT_Z,
  WORLD,
  footprint,
  inRect,
  openingRect,
  type Rect,
  type Room,
} from './layout'

/**
 * Walkable floor derived from the world layout: inside any room (or a passable doorway),
 * clear of floor-standing furniture by the player's radius. Shared by the desktop camera
 * and validate:world's navigation check, so the test walks the same floor the player does.
 */
export const PLAYER_RADIUS = 0.2

export interface WalkOptions {
  /** Flat 48 is open (its door ajar, nights 4–5). */
  flat48: boolean
  /** Night-3 corridor stretch in metres (0 = normal). */
  extension: number
}

const PASSABLE = new Set(['door', 'balcony_door', 'arch'])

/** Floor rectangles: rooms plus the doorways between them. Stairs are not walkable. */
function floorRects(room: (r: Room) => boolean): Rect[] {
  const rooms = WORLD.rooms.filter((r) => r.id !== 'stairs' && room(r))
  const doors = WORLD.walls.flatMap((w) =>
    w.openings
      .filter((o) => PASSABLE.has(o.kind) && o.door !== 'lift')
      .map((o) => openingRect(w, o)),
  )
  // Doorways of locked neighbours' flats (46, 49) lead nowhere walkable.
  return [...rooms.flatMap((r) => r.rects), ...doors]
}

const FLOOR_47 = floorRects((r) => r.flat !== '48')
const FLOOR_ALL = floorRects(() => true)

/** Floor-standing furniture footprints (cheap enough to read live; tests edit the list). */
const blockers = (): Rect[] => WORLD.objects.filter((o) => o.blocks).map(footprint)

/** Undo the corridor stretch: map a stretched position back to the base layout. */
function unstretch(x: number, z: number, extension: number): [number, number] | 'inserted' {
  if (extension <= 0 || z < CORRIDOR_SPLIT_Z) return [x, z]
  // Inside the inserted corridor piece: bare walls at x = ±0.6, nothing else.
  if (z < CORRIDOR_SPLIT_Z + extension) return 'inserted'
  return [x, z - extension]
}

function onFloor(floor: Rect[], x: number, z: number) {
  return floor.some((rect) => inRect(rect, x, z))
}

export function canWalk(x: number, z: number, options: WalkOptions): boolean {
  const base = unstretch(x, z, options.extension)
  if (base === 'inserted') return Math.abs(x) <= 0.6 - PLAYER_RADIUS
  const [bx, bz] = base
  const floor = options.flat48 ? FLOOR_ALL : FLOOR_47
  const r = PLAYER_RADIUS
  for (const [dx, dz] of [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ] as const) {
    if (!onFloor(floor, bx + dx, bz + dz)) return false
  }
  return !blockers().some((b) =>
    inRect({ x0: b.x0 - r, x1: b.x1 + r, z0: b.z0 - r, z1: b.z1 + r }, bx, bz),
  )
}

/** Slides along walls axis by axis; deterministic and frame-rate independent. */
export function walk(
  position: [number, number, number],
  dx: number,
  dz: number,
  options: WalkOptions,
): [number, number, number] {
  let x = position[0]
  const y = position[1]
  let z = position[2]
  if (canWalk(x + dx, z, options)) x += dx
  if (canWalk(x, z + dz, options)) z += dz
  return [x, y, z]
}
