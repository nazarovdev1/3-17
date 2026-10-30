import {
  CORRIDOR_SPLIT_Z,
  WORLD,
  footprint,
  inRect,
  openingRect,
  type Rect,
  type Room,
} from './layout'
import { stairHeight } from './stairwell'
import { yardHeight } from './exterior'

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
  /** Current door leaf segments in world coordinates, supplied by the desktop scene. */
  doorLeaves?: DoorLeaf[]
}

export interface DoorLeaf {
  x0: number
  z0: number
  x1: number
  z1: number
}

/** Distance from the player's centre to a finite leaf, including its hinge and free end. */
export function touchesDoor(x: number, z: number, leaf: DoorLeaf): boolean {
  const dx = leaf.x1 - leaf.x0
  const dz = leaf.z1 - leaf.z0
  const length2 = dx * dx + dz * dz
  const t =
    length2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - leaf.x0) * dx + (z - leaf.z0) * dz) / length2))
  return Math.hypot(x - leaf.x0 - t * dx, z - leaf.z0 - t * dz) < PLAYER_RADIUS + 0.025
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
  if (options.doorLeaves?.some((leaf) => touchesDoor(x, z, leaf))) return false
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

const SAMPLES = [
  [PLAYER_RADIUS, 0],
  [-PLAYER_RADIUS, 0],
  [0, PLAYER_RADIUS],
  [0, -PLAYER_RADIUS],
] as const

/**
 * The floor under a body standing at (x, z) whose feet were at `feet`: 0 on the 4th floor's
 * plan, the stairwell's height below it, or null where it cannot stand.
 */
export function standAt(x: number, z: number, feet: number, options: WalkOptions): number | null {
  if (Math.abs(feet) < 0.45 && options.doorLeaves?.some((leaf) => touchesDoor(x, z, leaf)))
    return null
  const level = Math.abs(feet) < 0.45
  if (level && canWalk(x, z, options)) return 0
  // Outside in the yard (ending B): flat ground, every edge of the body on it.
  const ground = yardHeight(x, z, feet)
  if (ground !== null)
    return SAMPLES.every(([dx, dz]) => yardHeight(x + dx, z + dz, feet) !== null) ? ground : null
  const h = stairHeight(x, z, feet)
  if (h === null) return null
  const floor = options.flat48 ? FLOOR_ALL : FLOOR_47
  for (const [dx, dz] of SAMPLES) {
    const sx = x + dx
    const sz = z + dz
    if (stairHeight(sx, sz, h) !== null) continue
    if (Math.abs(h) < 0.45 && onFloor(floor, sx, sz)) continue
    return null
  }
  return h
}

/** Like walk(), on stairs too: returns [x, feet, z]. */
export function walkFeet(
  x: number,
  feet: number,
  z: number,
  dx: number,
  dz: number,
  options: WalkOptions,
): [number, number, number] {
  let f = feet
  const across = standAt(x + dx, z, f, options)
  if (across !== null) {
    x += dx
    f = across
  }
  const along = standAt(x, z + dz, f, options)
  if (along !== null) {
    z += dz
    f = along
  }
  return [x, f, z]
}

/** Does the plan segment (ax, az)→(bx, bz) cross the rectangle? (Slab test.) */
function segmentHitsRect(ax: number, az: number, bx: number, bz: number, r: Rect): boolean {
  let t0 = 0
  let t1 = 1
  for (const [a, d, lo, hi] of [
    [ax, bx - ax, r.x0, r.x1],
    [az, bz - az, r.z0, r.z1],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (a < lo || a > hi) return false
      continue
    }
    let near = (lo - a) / d
    let far = (hi - a) / d
    if (near > far) [near, far] = [far, near]
    t0 = Math.max(t0, near)
    t1 = Math.min(t1, far)
    if (t0 > t1) return false
  }
  return true
}

function segmentsCross(ax: number, az: number, bx: number, bz: number, leaf: DoorLeaf): boolean {
  const orient = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number) =>
    (qx - px) * (rz - pz) - (qz - pz) * (rx - px)
  const d1 = orient(ax, az, bx, bz, leaf.x0, leaf.z0)
  const d2 = orient(ax, az, bx, bz, leaf.x1, leaf.z1)
  const d3 = orient(leaf.x0, leaf.z0, leaf.x1, leaf.z1, ax, az)
  const d4 = orient(leaf.x0, leaf.z0, leaf.x1, leaf.z1, bx, bz)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** The solid pieces of each wall at eye height: its box, less the doorways and arches. */
const SOLIDS: Rect[] = WORLD.walls.flatMap((w) => {
  const [lo, hi] = w.axis === 'x' ? [w.box.x0, w.box.x1] : [w.box.z0, w.box.z1]
  const gaps = w.openings
    .filter((o) => PASSABLE.has(o.kind) || o.kind === 'closet')
    .map((o) => [o.at - o.width / 2, o.at + o.width / 2] as const)
    .sort((a, b) => a[0] - b[0])
  const pieces: [number, number][] = []
  let from = lo
  for (const [g0, g1] of gaps) {
    if (g0 > from) pieces.push([from, g0])
    from = Math.max(from, g1)
  }
  if (from < hi) pieces.push([from, hi])
  return pieces.map(([a, b]) =>
    w.axis === 'x' ? { ...w.box, x0: a, x1: b } : { ...w.box, z0: a, z1: b },
  )
})

/**
 * Can an eye at (x, z) see a point on the plan? Walls and door leaves stop it; the last
 * `slack` metres before the target are not tested, because wall-mounted things (the
 * peephole, the shared wall) sit in the wall itself. Interaction is measured with this, so
 * nothing can be reached through a wall or a shut door.
 */
export function sightBlocked(
  x: number,
  z: number,
  tx: number,
  tz: number,
  options: Pick<WalkOptions, 'doorLeaves'>,
  slack = 0.15,
): boolean {
  const length = Math.hypot(tx - x, tz - z)
  if (length <= slack) return false
  const k = (length - slack) / length
  const ex = x + (tx - x) * k
  const ez = z + (tz - z) * k
  if (SOLIDS.some((rect) => segmentHitsRect(x, z, ex, ez, rect))) return true
  return !!options.doorLeaves?.some((leaf) => segmentsCross(x, z, ex, ez, leaf))
}
