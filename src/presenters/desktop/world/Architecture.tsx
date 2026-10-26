import { useMemo } from 'react'
import type * as THREE from 'three'
import {
  CEILING,
  CORRIDOR_SPLIT_Z,
  WORLD,
  inRect,
  type Rect,
  type Surface,
  type Wall,
} from '@/content/world/layout'
import { wallSolids } from '@/core/validate/world'
import { metricBox, metricPlane, type SurfaceMaterials } from './materials'
import { insertedWalls, splitRect, splitWall } from './stretch'

/**
 * Walls, floors and ceilings from the plan. Each wall is cut into solid pieces around its
 * openings; every face takes the surface of the room it faces (wallpaper in the room,
 * tiles in the bathroom, bare concrete outside, whitewash inside door and window reveals).
 */
interface Piece {
  key: string
  position: [number, number, number]
  size: [number, number, number]
  faces: Surface[]
}

function roomSurfaceAt(x: number, y: number, z: number, extension: number): Surface | null {
  for (const room of WORLD.rooms) {
    for (const rect of room.rects.flatMap((r) => splitRect(r, extension))) {
      if (inRect(rect, x, z) && y >= 0 && y <= room.height) return room.walls
    }
  }
  if (
    extension > 0 &&
    Math.abs(x) < 0.6 &&
    z > CORRIDOR_SPLIT_Z &&
    z < CORRIDOR_SPLIT_Z + extension
  ) {
    return 'wallpaper47'
  }
  return null
}

/** Soviet stairwell walls: oil paint up to 1.5 m, whitewash above. */
const DADO = 1.5

function withDado(pieces: Piece[]): Piece[] {
  return pieces.flatMap((p) => {
    const bottom = p.position[1] - p.size[1] / 2
    const top = p.position[1] + p.size[1] / 2
    if (!p.faces.includes('stairwell') || bottom >= DADO || top <= DADO) return [p]
    const lower: Piece = {
      ...p,
      key: `${p.key}-lo`,
      position: [p.position[0], (bottom + DADO) / 2, p.position[2]],
      size: [p.size[0], DADO - bottom, p.size[2]],
    }
    const upper: Piece = {
      key: `${p.key}-hi`,
      position: [p.position[0], (DADO + top) / 2, p.position[2]],
      size: [p.size[0], top - DADO, p.size[2]],
      faces: p.faces.map((f) => (f === 'stairwell' ? 'whitewash' : f)),
    }
    return [lower, upper]
  })
}

function wallPieces(w: Wall, extension: number): Piece[] {
  return withDado(wallSolidPieces(w, extension))
}

/**
 * Wall solids cut wherever a room on either side begins or ends, so a long wall (the
 * shared wall runs past the room, the closet and the bathroom) gets each room's finish.
 */
function cutAtRooms(w: Wall, extension: number) {
  const cuts = new Set<number>()
  for (const room of WORLD.rooms) {
    for (const r of room.rects.flatMap((rect) => splitRect(rect, extension))) {
      if (w.axis === 'x') [r.x0, r.x1].forEach((v) => cuts.add(+v.toFixed(3)))
      else [r.z0, r.z1].forEach((v) => cuts.add(+v.toFixed(3)))
    }
  }
  return wallSolids(w).flatMap((s) => {
    const [a0, a1] = w.axis === 'x' ? [s.x0, s.x1] : [s.z0, s.z1]
    const points = [
      a0,
      ...[...cuts].filter((c) => c > a0 + 0.01 && c < a1 - 0.01).sort((p, q) => p - q),
      a1,
    ]
    return points
      .slice(1)
      .map((end, i) =>
        w.axis === 'x' ? { ...s, x0: points[i]!, x1: end } : { ...s, z0: points[i]!, z1: end },
      )
  })
}

function wallSolidPieces(w: Wall, extension: number): Piece[] {
  return cutAtRooms(w, extension).map((s, i) => {
    const size: [number, number, number] = [s.x1 - s.x0, s.y1 - s.y0, s.z1 - s.z0]
    const c: [number, number, number] = [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.z0 + s.z1) / 2]
    const probe = (dx: number, dz: number): Surface => {
      const x = c[0] + dx
      const z = c[2] + dz
      const room = roomSurfaceAt(x, c[1], z, extension)
      if (room) return room
      // Inside the wall's own footprint means a door or window reveal.
      if (inRect(w.box, x, z, -0.001)) return 'whitewash'
      return w.kind === 'stair' ? 'stairwell' : 'concrete'
    }
    const e = 0.06
    return {
      key: `${w.id}-${i}`,
      position: c,
      size,
      faces: [
        probe(size[0] / 2 + e, 0),
        probe(-size[0] / 2 - e, 0),
        'whitewash',
        'whitewash',
        probe(0, size[2] / 2 + e),
        probe(0, -size[2] / 2 - e),
      ],
    }
  })
}

export function Architecture({
  surfaces,
  extension,
}: {
  surfaces: SurfaceMaterials
  extension: number
}) {
  const pieces = useMemo(() => {
    const walls = [
      ...WORLD.walls.flatMap((w) => splitWall(w, extension)),
      ...insertedWalls(extension),
    ]
    return walls.flatMap((w) => wallPieces(w, extension))
  }, [extension])

  const floors = useMemo(() => {
    type Floor = { key: string; rect: Rect; floor: Surface | null; ceiling: Surface | null }
    const list: Floor[] = WORLD.rooms.flatMap((room) =>
      room.rects
        .flatMap((r) => splitRect(r, extension))
        .map((r, i) => ({
          key: `${room.id}-${i}`,
          rect: r,
          // The stair well has flights instead of a floor slab.
          floor: room.id === 'stairs' ? null : room.floor,
          ceiling: room.ceiling,
        })),
    )
    // Thresholds under every doorway, and the inserted corridor piece.
    for (const w of WORLD.walls.flatMap((wall) => splitWall(wall, extension))) {
      for (const o of w.openings.filter((op) => op.bottom === 0)) {
        const half = o.width / 2
        const rect =
          w.axis === 'x'
            ? { x0: o.at - half, x1: o.at + half, z0: w.box.z0, z1: w.box.z1 }
            : { x0: w.box.x0, x1: w.box.x1, z0: o.at - half, z1: o.at + half }
        list.push({ key: `${w.id}-${o.at}`, rect, floor: 'boards', ceiling: null })
      }
    }
    if (extension > 0) {
      list.push({
        key: 'stretch',
        rect: { x0: -0.6, x1: 0.6, z0: CORRIDOR_SPLIT_Z, z1: CORRIDOR_SPLIT_Z + extension },
        floor: 'boards',
        ceiling: 'whitewash',
      })
    }
    return list
  }, [extension])

  const geometries = useMemo(() => {
    const cache = new Map<string, THREE.BufferGeometry>()
    const box = (size: [number, number, number]) => {
      const key = size.map((v) => v.toFixed(3)).join('x')
      let g = cache.get(key)
      if (!g) cache.set(key, (g = metricBox(...size)))
      return g
    }
    const plane = (w: number, d: number) => {
      const key = `p${w.toFixed(3)}x${d.toFixed(3)}`
      let g = cache.get(key)
      if (!g) cache.set(key, (g = metricPlane(w, d)))
      return g
    }
    return { box, plane, dispose: () => cache.forEach((g) => g.dispose()) }
  }, [])

  return (
    <group name="architecture">
      {pieces.map((p) => (
        <mesh
          key={p.key}
          position={p.position}
          geometry={geometries.box(p.size)}
          material={p.faces.map((f) => surfaces[f])}
          castShadow
          receiveShadow
        />
      ))}
      {floors.map(({ key, rect, floor, ceiling }) => {
        const w = rect.x1 - rect.x0
        const d = rect.z1 - rect.z0
        const cx = (rect.x0 + rect.x1) / 2
        const cz = (rect.z0 + rect.z1) / 2
        return (
          <group key={key}>
            {floor && (
              <mesh
                position={[cx, 0, cz]}
                rotation-x={-Math.PI / 2}
                geometry={geometries.plane(w, d)}
                material={surfaces[floor]}
                receiveShadow
              />
            )}
            {ceiling && (
              <mesh
                position={[cx, CEILING, cz]}
                rotation-x={Math.PI / 2}
                geometry={geometries.plane(w, d)}
                material={surfaces[ceiling]}
              />
            )}
          </group>
        )
      })}
      <Stairs surfaces={surfaces} />
      <Balcony surfaces={surfaces} />
    </group>
  )
}

/** Flight down to the half-landing and on toward the floor below, under the stair window. */
function Stairs({ surfaces }: { surfaces: SurfaceMaterials }) {
  const steps = useMemo(() => {
    const list: { position: [number, number, number]; size: [number, number, number] }[] = []
    // (geometry built once below)
    const rise = 0.163
    const run = 0.28
    for (let i = 0; i < 8; i++) {
      const top = -rise * (i + 1)
      list.push({
        position: [0.88, top - 0.1, 7.4 + run * i + run / 2],
        size: [1.3, 0.2 + rise, run],
      })
    }
    // Half-landing and the flight back up to the 5th floor beside it.
    list.push({ position: [1.6, -1.3 - 0.1, 9.75], size: [2.8, 0.2, 0.5] })
    for (let i = 0; i < 8; i++) {
      list.push({
        position: [2.33, -1.3 + rise * (i + 1) - 0.1 - rise / 2, 9.5 - run * i - run / 2],
        size: [1.3, 0.2 + rise, run],
      })
    }
    return list.map((step) => ({ ...step, geometry: metricBox(...step.size) }))
  }, [])
  const rail = useMemo(() => metricBox(0.05, 0.05, 2.6), [])
  return (
    <group name="stairs">
      {steps.map((step, i) => (
        <mesh
          key={i}
          position={step.position}
          geometry={step.geometry}
          material={surfaces.concrete}
          castShadow
          receiveShadow
        />
      ))}
      {/* Steel rail between the flights. */}
      <mesh
        position={[1.6, -0.35, 8.5]}
        rotation-x={Math.atan2(1.3, 2.24)}
        geometry={rail}
        material={surfaces.concrete}
      />
    </group>
  )
}

function Balcony({ surfaces }: { surfaces: SurfaceMaterials }) {
  // Slab, a low concrete parapet and its two side returns.
  const parts = useMemo(
    () =>
      (
        [
          [
            [1.65, -0.1, -4.2],
            [2.5, 0.2, 1.2],
          ],
          [
            [1.65, 0.5, -4.78],
            [2.5, 1.0, 0.06],
          ],
          [
            [0.43, 0.5, -4.2],
            [0.06, 1.0, 1.2],
          ],
          [
            [2.87, 0.5, -4.2],
            [0.06, 1.0, 1.2],
          ],
        ] as const
      ).map(([position, size]) => ({ position, geometry: metricBox(size[0], size[1], size[2]) })),
    [],
  )
  return (
    <group name="balcony">
      {parts.map((part, i) => (
        <mesh
          key={i}
          position={part.position}
          geometry={part.geometry}
          material={surfaces.concrete}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}
