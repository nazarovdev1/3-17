import { describe, expect, it } from 'vitest'
import { WORLD } from '@/content/world/layout'
import { objectPoint } from '@/content/world/objects'
import { canWalk, sightBlocked } from '@/content/world/walk'
import { REACH } from '@/presenters/desktop/layout'

const OPEN = { flat48: true, extension: 0 }

describe('interaction sight (nothing is reached through a wall or a shut door)', () => {
  it('a wall between two rooms blocks sight, the same room does not', () => {
    const kettle = objectPoint('kettle')!
    // From inside the kitchen the kettle is in plain view…
    expect(sightBlocked(kettle[0] + 0.5, kettle[2] + 0.2, kettle[0], kettle[2], {})).toBe(false)
    // …from the sleeping room on the other side of the wall it is not.
    expect(sightBlocked(0.6, -0.6, kettle[0], kettle[2], {})).toBe(true)
  })

  it('the shared wall blocks 48 from 47 but not the player standing at it', () => {
    const wall = objectPoint('party_wall')!
    expect(sightBlocked(wall[0] + 0.7, wall[2], wall[0], wall[2], {})).toBe(false)
    expect(sightBlocked(wall[0] - 0.7, wall[2], wall[0], wall[2], {})).toBe(true)
  })

  it('a door leaf across the line stops it', () => {
    const target = [0, 3.0] as const
    const leaf = { x0: -0.4, z0: 2.0, x1: 0.4, z1: 2.0 }
    expect(sightBlocked(0, 1.0, target[0], target[1], {})).toBe(false)
    expect(sightBlocked(0, 1.0, target[0], target[1], { doorLeaves: [leaf] })).toBe(true)
  })

  it('every object of the flat can be stood at, within reach, in plain view', () => {
    const unreachable: string[] = []
    for (const object of WORLD.objects.filter( // Windows are looked at (gaze), never operated, and sit inside the facade itself.
      (o) => o.room !== 'stairs' && !o.id.includes('window'),
    )) {
      const point = objectPoint(object.id)
      if (!point || object.support.on === 'ceiling') continue
      let found = false
      for (let x = point[0] - REACH; x <= point[0] + REACH && !found; x += 0.1)
        for (let z = point[2] - REACH; z <= point[2] + REACH && !found; z += 0.1)
          found =
            Math.hypot(x - point[0], z - point[2]) <= REACH &&
            canWalk(x, z, OPEN) &&
            !sightBlocked(x, z, point[0], point[2], {})
      if (!found) unreachable.push(object.id)
    }
    expect(unreachable).toEqual([])
  })
})
