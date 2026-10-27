import { objectById, PARTY_X, WORLD } from '@/content/world/layout'
import type { GameState, SfxId } from '@/core/state/types'
import type { Position } from './engine'

export const SHARED_WALL: Position = [Math.round((PARTY_X + 0.1) * 1000) / 1000, 1.5, -0.45]

const anchor = (id: string, height?: number): Position => {
  const object = objectById(id)!
  return [object.position[0], height ?? object.position[1], object.position[2]]
}
export function doorHinge(id: string): Position {
  const door = WORLD.doors.find((d) => d.id === id)!
  const wall = WORLD.walls.find((w) => w.id === door.wall)!
  const opening = wall.openings.find((o) => o.door === id)!
  const along = opening.at + ((door.hinge === 'low' ? -1 : 1) * opening.width) / 2
  return wall.axis === 'x'
    ? [along, 1, (wall.box.z0 + wall.box.z1) / 2]
    : [(wall.box.x0 + wall.box.x1) / 2, 1, along]
}

/** Story cues share the same real objects as the desktop's animated audio emitters. */
export function cuePosition(id: SfxId, state: GameState): Position | undefined {
  if (id.startsWith('knock') || id === 'whisper') return SHARED_WALL
  if (id === 'door_open' || id === 'door_close' || id === 'chain')
    return doorHinge(
      ['n4_door48', 'n4_inside48'].includes(state.currentNodeId ?? '')
        ? 'front_door48'
        : 'front_door',
    )
  if (id === 'phone_buzz') return state.night === 4 ? anchor('sofa', 0.5) : anchor('phone')
  if (id === 'radiator') return anchor('room_radiator', 0.5)
  if (id === 'fridge_stop') return anchor('fridge', 0.8)
  if (id === 'kettle' || id === 'tea') return anchor('kettle')
  if (id === 'static') return anchor('tv', 0.8)
  return undefined
}
