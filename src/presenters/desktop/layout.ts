import type { LocationId } from '@/core/state/types'
import type { Choice, StoryNode } from '@/core/engine/types'
import {
  CORRIDOR_SPLIT_Z,
  PARTY_X,
  WORLD,
  inRect,
  mirrorX,
  objectById,
} from '@/content/world/layout'
import type { SfxId } from '@/core/state/types'
import { walk as walkWorld } from '@/content/world/walk'

/**
 * Desktop view of the world layout (src/content/world/layout.ts): spawn points, story
 * interaction anchors, light switches and movement. Everything is derived from the plan;
 * no coordinates of furniture live here.
 */
export type Point = [number, number, number]
export interface Viewpoint {
  position: Point
  yaw: number
  pitch?: number
}

const EYE = 1.6

export const VIEWS: Record<LocationId, Viewpoint> = {
  room: { position: [0.6, EYE, -0.6], yaw: 0 },
  kitchen: { position: [1.04, EYE, 1.55], yaw: -2.0 },
  bathroom: { position: [-0.92, EYE, 2.75], yaw: 0.75 },
  corridor: { position: [0, EYE, 1.0], yaw: Math.PI },
  balcony: { position: [1.7, EYE, -2.6], yaw: 0 },
  stairwell: { position: [-5.3, EYE, 5.6], yaw: -1.8 },
  flat48: { position: [mirrorX(0.6), EYE, -0.6], yaw: 0 },
}

/** Inspection poses used only by the test build's still-capture route. */
export const AUDIT_VIEWS: Record<string, Viewpoint> = {
  'app-inspect': { position: [1.04, EYE, 1.55], yaw: -0.5, pitch: -0.55 },
  fixtures: { position: [0.2, EYE, 3.05], yaw: -2.0, pitch: -0.35 },
  'bath-inspect': { position: [-0.92, EYE, 2.75], yaw: 1.65, pitch: -0.55 },
  neighbours: { position: [-5.3, EYE, 5.6], yaw: 1.9 },
  stairs: { position: [1.1, EYE, 6.65], yaw: Math.PI, pitch: -0.5 },
  // F4 figure evidence.
  'door-gap': { position: [0.12, EYE, 3.25], yaw: Math.PI, pitch: -0.62 },
  'kitchen-glass': { position: [-0.32, EYE, 1.62], yaw: -1.42, pitch: -0.06 },
  'tv-screen': { position: [1.85, EYE, -1.5], yaw: -1.42, pitch: -0.62 },
  prints: { position: [0.4, EYE, 6.4], yaw: 1.264, pitch: -0.5 },
  'door-front': { position: [0, EYE, 4.0], yaw: Math.PI, pitch: 0 },
  'hall-coat': { position: [0.3, EYE, 2.95], yaw: -1.82, pitch: -0.15 },
}

/** Centre of an object's bounding box (its interaction anchor). */
function anchor(id: string): Point {
  const o = objectById(id)
  if (!o) throw new Error(`layout: no object ${id}`)
  return [o.position[0], o.position[1] + o.size[1] / 2, o.position[2]]
}

const FRONT_DOOR_Z = 4.69

export const OBJECTS: Record<string, Point> = {
  clock: anchor('clock'),
  note: anchor('note'),
  phone: anchor('phone'),
  radiator: anchor('room_radiator'),
  tv: anchor('tv'),
  window: anchor('room_window'),
  kettle: anchor('kettle'),
  wardrobe: anchor('wardrobe'),
  mirror: anchor('mirror_cabinet'),
  vent: anchor('vent'),
  // Listening spot on the shared wall, at head height above the sofa's end.
  shared_wall: [PARTY_X + 0.11, 1.5, -0.45],
  carpet: anchor('wall_carpet'),
  front_door: [0, 1.4, FRONT_DOOR_Z],
  peephole: [0, 1.6, FRONT_DOOR_Z],
  bread_bin: anchor('bread_bin'),
  bed: anchor('sofa'),
  calendar: anchor('calendar'),
  belongings: anchor('belongings'),
  chair: anchor('chair48'),
  door48: [mirrorX(0), 1.3, FRONT_DOOR_Z],
  corridor: [0, 1.5, 2.2],
  lamp: anchor('room_switch'),
}

/** Where the clock hangs after it moves unobserved (night 3): on the shared wall. */
export const CLOCK_SHIFTED: Point = [PARTY_X + 0.115, 1.95, -3.05]

const CHOICE_OBJECT: Record<string, string> = {
  tea: 'kettle',
  sleep: 'bed',
  wait317: 'bed',
  wait: 'bed',
  stay: 'bed',
  bathroom: 'vent',
  listen: 'shared_wall',
  kitchen: 'bread_bin',
  chain: 'front_door',
  leave_early: 'front_door',
  leave: 'front_door',
  open48: 'door48',
  wind: 'clock',
  shifted_clock: 'clock',
  enter: 'door48',
  retreat: 'front_door',
  diary: 'chair',
  glitch: 'chair',
  keep: 'front_door',
  stop: 'corridor',
}

/** Corridor stretch: points beyond the split move with the entrance. */
const stretch = (p: Point, extension: number): Point =>
  extension > 0 && p[2] >= CORRIDOR_SPLIT_Z && p[0] > -2.2 && p[0] < 3.2
    ? [p[0], p[1], p[2] + extension]
    : p

export function interactionPoint(
  choice: Choice,
  extension = 0,
  clockShifted = false,
  night = 0,
): Point | null {
  const clock = clockShifted ? CLOCK_SHIFTED : OBJECTS.clock!
  // Night 4: the phone is under the pillow.
  if (choice.id === 'phone' && night === 4) return OBJECTS.bed!
  // Diary 7 is behind the clock; diary 6 under the rug's corner.
  if (choice.to === 'n5_diary7') return [clock[0], clock[1], clock[2]]
  if (choice.to === 'n4_diary6') {
    const rug = objectById('floor_rug')!
    return [rug.position[0] - 0.7, 0.05, rug.position[2] + 0.35]
  }
  const key = CHOICE_OBJECT[choice.id] ?? choice.id
  if (key === 'clock') return clock
  const point = OBJECTS[key]
  return point ? stretch(point, extension) : null
}

export function nodePoint(node: StoryNode): Point | null {
  const zones: Record<string, Point> = {
    landing: [-1.6, EYE, 6.0],
    corridor_loop: [0, EYE, 2.0],
    landing_48: [mirrorX(0), EYE, 5.6],
    flat48: [mirrorX(0.5), EYE, -1.2],
  }
  return OBJECTS[node.desktop?.objectId ?? ''] ?? zones[node.desktop?.zoneId ?? ''] ?? null
}

/** Light switches in circuit order: index i toggles circuit i (room, kitchen, bath, corridor). */
export const SWITCHES: Point[] = [
  'room_switch',
  'kitchen_switch',
  'bath_switch',
  'hall_switch',
].map((id) => anchor(id))

/** Lighting circuit of every ceiling light, from the plan. */
export const CEILING_LIGHTS = WORLD.lights.filter((l) => l.kind === 'ceiling')

export function walk(
  position: Point,
  dx: number,
  dz: number,
  flat48: boolean,
  extension = 0,
): Point {
  return walkWorld(position, dx, dz, { flat48, extension })
}

/** Footstep sound for the floor under a point (corridor stretch undone first). */
const STEP: Record<string, SfxId> = {
  parquet: 'step_wood',
  boards: 'step_board',
  tiles: 'step_tile',
  concrete: 'step_concrete',
}
export function footstepAt(x: number, z: number, extension = 0): SfxId {
  const pz = extension > 0 && z >= CORRIDOR_SPLIT_Z + extension && x > -2.2 ? z - extension : z
  const room = WORLD.rooms.find((r) => r.floor && r.rects.some((rect) => inRect(rect, x, pz)))
  return STEP[room?.floor ?? ''] ?? 'step_wood'
}

/** Interaction reach (FIX_PROMPT §4.5): prompts only for objects within 1.5 m. */
export const REACH = 1.5
