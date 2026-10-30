import {
  CEILING,
  WORLD,
  footprint,
  inRect,
  openingRect,
  roomArea,
  wallById,
  type Rect,
  type Wall,
  type WorldObject,
} from '@/content/world/layout'
import { renderedSize } from '@/content/world/scale'
import { canWalk } from '@/content/world/walk'

/**
 * validate:world (FIX_PROMPT §4.3). Fails on: intersections between objects or with walls
 * (except declared containment), floating objects, objects outside their room, scale more
 * than 10 % off the declared real size, blocked doorways, and rooms the player cannot walk
 * to from the entrance. Returns problems plus a short report of the plan's real sizes.
 */
export interface WorldReport {
  errors: string[]
  report: string[]
}

const EPS = 0.02

interface Box3 {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
}

/** Height-aware box of an object (footprint is axis-aligned; furniture is). */
export function objectBox(o: WorldObject): Box3 {
  const f = footprint(o)
  return { ...f, y0: o.position[1], y1: o.position[1] + o.size[1] }
}

function overlap(a: Box3, b: Box3, tolerance = EPS) {
  return (
    a.x0 < b.x1 - tolerance &&
    b.x0 < a.x1 - tolerance &&
    a.y0 < b.y1 - tolerance &&
    b.y0 < a.y1 - tolerance &&
    a.z0 < b.z1 - tolerance &&
    b.z0 < a.z1 - tolerance
  )
}

/** Solid parts of a wall once its openings are cut out (piers, lintels, sills). */
export function wallSolids(w: Wall): Box3[] {
  const along = w.axis === 'x' ? ([w.box.x0, w.box.x1] as const) : ([w.box.z0, w.box.z1] as const)
  const make = (a0: number, a1: number, y0: number, y1: number): Box3 =>
    w.axis === 'x'
      ? { x0: a0, x1: a1, y0, y1, z0: w.box.z0, z1: w.box.z1 }
      : { x0: w.box.x0, x1: w.box.x1, y0, y1, z0: a0, z1: a1 }
  const openings = [...w.openings].sort((a, b) => a.at - b.at)
  const solids: Box3[] = []
  let cursor = along[0]
  for (const o of openings) {
    const a0 = o.at - o.width / 2
    const a1 = o.at + o.width / 2
    if (a0 > cursor) solids.push(make(cursor, a0, 0, w.height))
    if (o.bottom > 0) solids.push(make(a0, a1, 0, o.bottom))
    if (o.top < w.height) solids.push(make(a0, a1, o.top, w.height))
    cursor = a1
  }
  if (cursor < along[1]) solids.push(make(cursor, along[1], 0, w.height))
  return solids
}

const contains = (a: WorldObject, b: WorldObject) =>
  a.contains?.includes(b.id) || b.contains?.includes(a.id)

const supportedBy = (a: WorldObject, b: WorldObject) =>
  (a.support.on === 'object' && a.support.object === b.id) ||
  (b.support.on === 'object' && b.support.object === a.id)

function inside(outer: Rect, inner: Rect, margin: number) {
  return (
    inner.x0 >= outer.x0 - margin &&
    inner.x1 <= outer.x1 + margin &&
    inner.z0 >= outer.z0 - margin &&
    inner.z1 <= outer.z1 + margin
  )
}

function distanceToWall(box: Box3, w: Wall) {
  const dx = Math.max(w.box.x0 - box.x1, box.x0 - w.box.x1, 0)
  const dz = Math.max(w.box.z0 - box.z1, box.z0 - w.box.z1, 0)
  return Math.hypot(dx, dz)
}

/** Whether a finite segment intersects a footprint, expanded for the leaf's thickness. */
function segmentHitsRect(x: number, z: number, dx: number, dz: number, rect: Rect): boolean {
  let from = 0
  let to = 1
  for (const [start, delta, low, high] of [
    [x, dx, rect.x0 - 0.01, rect.x1 + 0.01],
    [z, dz, rect.z0 - 0.01, rect.z1 + 0.01],
  ]) {
    if (Math.abs(delta!) < 1e-9) {
      if (start! < low! || start! > high!) return false
      continue
    }
    const a = (low! - start!) / delta!
    const b = (high! - start!) / delta!
    from = Math.max(from, Math.min(a, b))
    to = Math.min(to, Math.max(a, b))
    if (from > to) return false
  }
  return true
}

export function validateWorld(): WorldReport {
  const errors: string[] = []
  const objects = WORLD.objects
  const ids = new Set<string>()

  for (const o of objects) {
    if (ids.has(o.id)) errors.push(`${o.id}: duplicate id`)
    ids.add(o.id)
    const room = WORLD.rooms.find((r) => r.id === o.room)
    if (!room) {
      errors.push(`${o.id}: unknown room ${o.room}`)
      continue
    }
    const box = objectBox(o)
    const f = footprint(o)

    // Inside its room: wall-mounted items may sit in the wall's thickness (≤ 0.35 m).
    const margin = o.support.on === 'wall' ? 0.35 : 0.005
    if (!room.rects.some((rect) => inside(rect, f, margin))) {
      errors.push(`${o.id}: outside room ${o.room}`)
    }
    if (box.y1 > CEILING + EPS) errors.push(`${o.id}: pokes through the ceiling`)

    // Resting on its support.
    const s = o.support
    if (s.on === 'floor' && Math.abs(o.position[1]) > EPS) {
      errors.push(`${o.id}: floats ${o.position[1].toFixed(2)} m above the floor`)
    }
    if (s.on === 'ceiling' && Math.abs(box.y1 - CEILING) > EPS) {
      errors.push(`${o.id}: does not reach the ceiling (top ${box.y1.toFixed(2)} m)`)
    }
    if (s.on === 'wall') {
      const w = wallById(s.wall)
      if (!w) errors.push(`${o.id}: unknown wall ${s.wall}`)
      else if (distanceToWall(box, w) > EPS) {
        errors.push(`${o.id}: ${distanceToWall(box, w).toFixed(3)} m off wall ${s.wall}`)
      }
    }
    if (s.on === 'object') {
      const base = objects.find((b) => b.id === s.object)
      if (!base) errors.push(`${o.id}: unknown support ${s.object}`)
      else {
        const bb = objectBox(base)
        // Its centre of mass is over the support (a TV may overhang its stand).
        const within = inRect(footprint(base), o.position[0], o.position[2], -EPS)
        const top = Math.abs(box.y0 - bb.y1) <= EPS
        const inSide = contains(o, base) && box.y0 >= bb.y0 - EPS && box.y1 <= bb.y1 + EPS
        if (!within || !(top || inSide)) errors.push(`${o.id}: not resting on ${s.object}`)
      }
    }

    // Real-world scale: every axis within 10 % (or 1 cm for very thin items).
    const rendered = renderedSize(o)
    if (rendered) {
      rendered.forEach((v, i) => {
        const want = o.size[i]!
        if (Math.abs(v - want) > Math.max(0.1 * want, 0.01)) {
          errors.push(
            `${o.id}: ${'xyz'[i]} is ${v.toFixed(3)} m, declared ${want} m (${o.asset} proportions)`,
          )
        }
      })
    }
  }

  // Object–object intersections.
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]!
      const b = objects[j]!
      if (contains(a, b) || supportedBy(a, b)) continue
      if (overlap(objectBox(a), objectBox(b))) errors.push(`${a.id} intersects ${b.id}`)
    }
  }

  // Object–wall intersections (wall-mounted items may touch their own wall).
  const solids = WORLD.walls.flatMap((w) => wallSolids(w).map((box) => ({ w, box })))
  for (const o of objects) {
    const box = objectBox(o)
    for (const { w, box: solid } of solids) {
      // A wall item may sink a few cm into its own wall (frames, carpets), not more.
      const tolerance = o.support.on === 'wall' && o.support.wall === w.id ? 0.06 : EPS
      if (overlap(box, solid, tolerance)) errors.push(`${o.id} intersects wall ${w.id}`)
    }
  }

  // Doorways: 0.5 m each side of every passable opening stays clear of blocking furniture.
  for (const w of WORLD.walls) {
    for (const o of w.openings) {
      if (o.kind === 'window' || o.kind === 'closet' || o.door === 'lift') continue
      const r = openingRect(w, o)
      const passage =
        w.axis === 'x'
          ? { ...r, z0: r.z0 - 0.5, z1: r.z1 + 0.5 }
          : { ...r, x0: r.x0 - 0.5, x1: r.x1 + 0.5 }
      for (const ob of objects.filter((x) => x.blocks)) {
        const f = footprint(ob)
        if (f.x0 < passage.x1 && passage.x0 < f.x1 && f.z0 < passage.z1 && passage.z0 < f.z1) {
          errors.push(`${ob.id} blocks the ${o.door ?? o.kind} doorway in ${w.id}`)
        }
      }
    }
  }

  // Sample each operable leaf's full swing at one-degree intervals. Furniture must clear
  // the swept area, not just the doorway when the leaf is closed.
  for (const door of WORLD.doors) {
    if (door.kind === 'closet' || door.kind === 'metal' || door.kind === 'lift') continue
    const wall = wallById(door.wall)
    const opening = wall?.openings.find((o) => o.door === door.id)
    if (!wall || !opening) continue
    const along = opening.at + ((door.hinge === 'low' ? -1 : 1) * opening.width) / 2
    const x = wall.axis === 'x' ? along : (wall.box.x0 + wall.box.x1) / 2
    const z = wall.axis === 'x' ? (wall.box.z0 + wall.box.z1) / 2 : along
    const dir = door.hinge === 'low' ? 1 : -1
    const width = opening.width - 0.01
    for (const ob of objects.filter((o) => o.blocks && o.position[1] < opening.top)) {
      const f = footprint(ob)
      const hit = Array.from({ length: 82 }, (_, i) => Math.min(1.4, (i * Math.PI) / 180)).some(
        (angle) => {
          const dx =
            width * (wall.axis === 'x' ? dir * Math.cos(angle) : door.swing * Math.sin(angle))
          const dz =
            width * (wall.axis === 'x' ? door.swing * Math.sin(angle) : dir * Math.cos(angle))
          return segmentHitsRect(x, z, dx, dz, f)
        },
      )
      if (hit) errors.push(`${ob.id} intersects the ${door.id} swing`)
    }
  }

  // Navigation: from just inside each entrance, every room of that flat is reachable.
  for (const [flat, start, rooms] of [
    ['47', [0, 4.2], ['room', 'kitchen', 'bathroom', 'corridor', 'hall', 'balcony', 'landing']],
    ['48', [-4.18, 4.2], ['room48', 'kitchen48', 'bathroom48', 'corridor48', 'hall48']],
  ] as const) {
    const opts = { flat48: flat === '48', extension: 0 }
    const reached = flood(start[0], start[1], (x, z) => canWalk(x, z, opts))
    if (reached.size === 0)
      errors.push(`flat ${flat}: entrance at ${start.join(', ')} is not walkable`)
    for (const id of rooms) {
      const room = WORLD.rooms.find((r) => r.id === id)!
      const ok = [...reached].some((key) => {
        const [x, z] = key.split(',').map(Number) as [number, number]
        return room.rects.some((rect) => inRect(rect, x, z))
      })
      if (!ok) errors.push(`flat ${flat}: ${id} cannot be reached on foot from the entrance`)
    }
  }

  const report = [
    `room ${roomArea('room').toFixed(1)} m², kitchen ${roomArea('kitchen').toFixed(1)} m², bathroom ${roomArea('bathroom').toFixed(1)} m², corridor+hall ${(roomArea('corridor') + roomArea('hall')).toFixed(1)} m², closet ${roomArea('closet').toFixed(1)} m²`,
    `flat 47 total ${(['room', 'kitchen', 'bathroom', 'corridor', 'hall', 'closet'] as const).reduce((sum, id) => sum + roomArea(id), 0).toFixed(1)} m², ceiling ${CEILING} m`,
    `${objects.length} objects, ${WORLD.walls.length} walls, ${WORLD.doors.length} doors`,
  ]
  return { errors, report }
}

/** 10 cm grid flood fill over walkable cells. */
function flood(x0: number, z0: number, walkable: (x: number, z: number) => boolean) {
  const step = 0.1
  const key = (x: number, z: number) => `${x.toFixed(1)},${z.toFixed(1)}`
  const seen = new Set<string>()
  const sx = Math.round(x0 / step) * step
  const sz = Math.round(z0 / step) * step
  if (!walkable(sx, sz)) return seen
  const queue: [number, number][] = [[sx, sz]]
  seen.add(key(sx, sz))
  while (queue.length > 0) {
    const [x, z] = queue.shift()!
    for (const [dx, dz] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ] as const) {
      const nx = Math.round((x + dx) * 10) / 10
      const nz = Math.round((z + dz) * 10) / 10
      const k = key(nx, nz)
      if (seen.has(k) || nx < -12 || nx > 6 || nz < -6 || nz > 11) continue
      if (!walkable(nx, nz)) continue
      seen.add(k)
      queue.push([nx, nz])
    }
  }
  return seen
}
