import { PARTY_X, WORLD, mirrorX, objectById } from './layout'

/**
 * Every object id the nights use (src/content/nights) → a point in the plan, in metres.
 * Audio places sounds here; presenters measure reach and gaze to it. Ids that are plan
 * objects resolve to their bounding-box centre; the rest are named spots.
 */
export type Point = [number, number, number]

const centre = (id: string): Point => {
  const o = objectById(id)
  if (!o) throw new Error(`objects: no plan object ${id}`)
  return [o.position[0], o.position[1] + o.size[1] / 2, o.position[2]]
}

const FRONT_DOOR_Z = 4.69
const rug = objectById('floor_rug')!

const SPOTS: Record<string, Point> = {
  // The shared wall with 48, at head height above the sofa's end (listening spot).
  party_wall: [PARTY_X + 0.11, 1.5, -0.45],
  party_wall48: [PARTY_X - 0.11, 1.5, -0.45],
  front_door: [0, 1.4, FRONT_DOOR_Z],
  door48: [mirrorX(0), 1.3, FRONT_DOOR_Z],
  peephole: [0, 1.6, FRONT_DOOR_Z],
  // The chain on the inside of 47's entrance, and the key ring left in its lock outside.
  chain: [-0.38, 1.45, FRONT_DOOR_Z - 0.06],
  key_ring: [0.38, 1.05, FRONT_DOOR_Z + 0.08],
  // Rustam aka just inside 47's dark doorway: his breath in the dark, his hand held out
  // over the threshold to whoever comes up the stairs.
  rustam_body: [0.28, 0, 4.15],
  rustam: [0.28, 1.7, 4.3],
  rustam_hand: [0.18, 1.2, 5.02],
  // The raised floorboard in the corridor (night 3/4), under the rug's corner.
  floorboard: [rug.position[0] - 0.7, 0.05, rug.position[2] + 0.35],
}

export function objectPoint(id: string): Point | null {
  if (SPOTS[id]) return SPOTS[id]
  if (id === 'clock_wall' || id === 'keyhole') return centre('clock')
  if (WORLD.objects.some((o) => o.id === id)) return centre(id)
  return null
}

/** Ids that are not places but parts of the phone held in the hand. */
export const PHONE_TARGETS = new Set(['phone_message', 'phone_send', 'phone_call'])
