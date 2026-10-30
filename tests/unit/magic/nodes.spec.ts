import { describe, expect, it } from 'vitest'
import { EDGES, MAGIC_NODES, NODE_BY_ID, TAP_REACH, pathOf } from '@/presenters/magic/nodes'
import { MOBILE_VIEWS } from '@/presenters/mobile/views'
import { canWalk, sightBlocked } from '@/content/world/walk'
import { stairHeight } from '@/content/world/stairwell'
import { yardHeight } from '@/content/world/exterior'
import { objectPoint } from '@/content/world/objects'

const OPEN = { flat48: true, extension: 0 }

describe('magic-window viewpoints', () => {
  it('every viewpoint is a place a body can stand', () => {
    const bad = MAGIC_NODES.filter((n) => {
      if (n.lying) return false
      if (n.feet === 0) return !canWalk(n.x, n.z, OPEN)
      if (n.feet < -5) return yardHeight(n.x, n.z, n.feet) === null
      const h = stairHeight(n.x, n.z, n.feet)
      return h === null || Math.abs(h - n.feet) > 0.12
    }).map((n) => n.id)
    expect(bad).toEqual([])
  })

  it('every edge is two-way and its path stays on the floor', () => {
    const problems: string[] = []
    for (const a of MAGIC_NODES)
      for (const edge of EDGES[a.id]!) {
        const b = NODE_BY_ID[edge.to]!
        if (!EDGES[b.id]!.some((e) => e.to === a.id && e.door?.id === edge.door?.id))
          problems.push(`${a.id}→${b.id}: not linked back alike`)
        if (a.feet !== 0 || b.feet !== 0 || a.lying || b.lying) continue
        const path = pathOf(a, edge)
        for (let i = 0; i + 1 < path.length; i++) {
          const [x0, z0] = path[i]!
          const [x1, z1] = path[i + 1]!
          for (let t = 0.05; t < 1; t += 0.05) {
            const x = x0 + (x1 - x0) * t
            const z = z0 + (z1 - z0) * t
            if (!canWalk(x, z, OPEN)) {
              problems.push(`${a.id}→${b.id}: blocked at ${x.toFixed(2)},${z.toFixed(2)}`)
              break
            }
          }
        }
      }
    expect(problems).toEqual([])
  })

  it('a door on an edge is on the way between its two nodes', () => {
    const off: string[] = []
    for (const a of MAGIC_NODES)
      for (const edge of EDGES[a.id]!) {
        if (!edge.door) continue
        const b = NODE_BY_ID[edge.to]!
        const [dx, dz] = edge.door.at
        // The door's own point is on the path by construction; it must also be close to the
        // straight line (a doorway behind a detour would be a door the player never meets).
        const length2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2
        const t = ((dx - a.x) * (b.x - a.x) + (dz - a.z) * (b.z - a.z)) / length2
        const px = a.x + (b.x - a.x) * t
        const pz = a.z + (b.z - a.z) * t
        if (t < 0 || t > 1 || Math.hypot(px - dx, pz - dz) > 0.6)
          off.push(`${a.id}→${b.id} (${edge.door.id})`)
      }
    expect(off).toEqual([])
  })

  it('everything a fixed view offered can be tapped from some viewpoint, in plain view', () => {
    const lost: string[] = []
    const ids = new Set(Object.values(MOBILE_VIEWS).flatMap((v) => v.objects.map((o) => o.id)))
    for (const id of ids) {
      const point = objectPoint(id)
      // Wall and door targets are taped through their own controls.
      if (!point) continue
      const seen = MAGIC_NODES.some(
        (n) =>
          Math.abs(n.feet - (point[1] > 3 ? 0 : n.feet)) < 0.5 &&
          Math.hypot(point[0] - n.x, point[2] - n.z) <= TAP_REACH &&
          (n.feet !== 0 || !sightBlocked(n.x, n.z, point[0], point[2], {})),
      )
      if (!seen) lost.push(id)
    }
    expect(lost).toEqual([])
  })

  it('every object a night can ask the player to use is tappable from some viewpoint', () => {
    // Collected from the nights' beats (on.use / on.hold / on.knock targets), less the body's
    // own inputs and the parts of the phone held in the hand.
    const targets = [
      'belongings',
      'bread_bag',
      'bread_bin',
      'calendar',
      'chain',
      'clock',
      'front_door',
      'halva',
      'halva_47',
      'kettle',
      'key_ring',
      'keyhole',
      'note',
      'parcel',
      'party_wall48',
      'peephole',
      'phone',
      'pillow',
      'room_radiator',
      'rustam_hand',
      'sofa',
      'tv',
      'wardrobe',
      'party_wall',
    ]
    const lost: string[] = []
    for (const id of targets) {
      const point = objectPoint(id)
      if (!point) {
        lost.push(`${id}: no point`)
        continue
      }
      const seen = MAGIC_NODES.some((n) => {
        if (Math.abs(point[1] - (n.feet + 1.6)) > 3.5) return false
        if (Math.hypot(point[0] - n.x, point[2] - n.z) > TAP_REACH) return false
        return n.feet < -0.3 || !sightBlocked(n.x, n.z, point[0], point[2], {})
      })
      if (!seen) lost.push(id)
    }
    expect(lost).toEqual([])
  })
})
