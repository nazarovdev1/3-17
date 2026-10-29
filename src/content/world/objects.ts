import { PARTY_X, WORLD, mirrorX, objectById } from './layout'
import { BREAD_SILL, DOOR43, LANDING3_Y, HALF_LANDING_Y } from './stairwell'

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
  // Night 2's day: the bag of bread on the half-landing sill, Muhabbat opa at 43's chain
  // with a plate of halva, the same plate left on 47's threshold, and the flight below her.
  bread_bag: [BREAD_SILL[0], BREAD_SILL[1] + 0.15, BREAD_SILL[2]],
  muhabbat: [DOOR43.x + 0.33, LANDING3_Y + 1.5, DOOR43.z + 0.05],
  halva: [DOOR43.x + 0.36, LANDING3_Y + 1.1, DOOR43.z + 0.28],
  halva_47: [0.3, 0.05, 5.0],
  stair_gap: [1.6, HALF_LANDING_Y - 1.4 + 0.9, 9.6],
  // Night 2: the black coat inside the wardrobe and its pocket; the tally marks behind it.
  coat_pocket: [-1.25, 1.05, 0.95],
  // Night 3/4: the pillow end of the sofa (the phone buzzes under it on night 4).
  pillow: [-1.5, 0.55, -2.6],
  // Night 3: the bathroom, for the tap that runs while nobody looks.
  bathroom: [-1.35, 1.2, 3.2],
  bath_door: [-0.6, 1.0, 2.5],
  // Night 4: the parcel from home on 47's threshold.
  parcel: [0.32, 0.15, 5.08],
}

export function objectPoint(id: string): Point | null {
  if (SPOTS[id]) return SPOTS[id]
  if (id === 'clock_wall' || id === 'keyhole') return centre('clock')
  if (WORLD.objects.some((o) => o.id === id)) return centre(id)
  return null
}

/** Inputs the presenter sends for what the body does, not for a place (night 3's corridor). */
export const BODY_TARGETS = new Set(['corridor_ran', 'corridor_turned'])

/** Ids that are not places but parts of the phone held in the hand. */
export const PHONE_TARGETS = new Set(['phone_message', 'phone_send', 'phone_call'])
