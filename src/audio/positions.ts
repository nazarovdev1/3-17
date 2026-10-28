import { PARTY_X, WORLD } from '@/content/world/layout'
import { objectPoint } from '@/content/world/objects'
import type { Point } from '@/core/director/types'
import type { Position } from './engine'

export const SHARED_WALL: Position = [Math.round((PARTY_X + 0.1) * 1000) / 1000, 1.5, -0.45]

export function doorHinge(id: string): Position {
  const door = WORLD.doors.find((d) => d.id === id)!
  const wall = WORLD.walls.find((w) => w.id === door.wall)!
  const opening = wall.openings.find((o) => o.door === id)!
  const along = opening.at + ((door.hinge === 'low' ? -1 : 1) * opening.width) / 2
  return wall.axis === 'x'
    ? [along, 1, (wall.box.z0 + wall.box.z1) / 2]
    : [(wall.box.x0 + wall.box.x1) / 2, 1, along]
}

/**
 * Where a Director sound plays: a point it names, or the object it names. Doors sound at
 * their hinge, the wall at its listening spot; unknown ids play without a position.
 */
export function soundPosition(at: string | Point | undefined): Position | undefined {
  if (!at) return undefined
  if (Array.isArray(at)) return at
  if (at === 'front_door') return doorHinge('front_door')
  if (at === 'door48') return doorHinge('front_door48')
  if (at === 'party_wall') return SHARED_WALL
  return objectPoint(at) ?? undefined
}
