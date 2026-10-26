import type { LocationId } from '@/core/state/types'
import type { Choice, StoryNode } from '@/core/engine/types'
export type Point = [number, number, number]
export interface Viewpoint {
  position: Point
  yaw: number
}
export const VIEWS: Record<LocationId, Viewpoint> = {
  room: { position: [0, 1.6, 0.2], yaw: 0 },
  kitchen: { position: [1.15, 1.6, 3.65], yaw: -1.3 },
  bathroom: { position: [-1.4, 1.6, 3.25], yaw: 0.65 },
  corridor: { position: [0, 1.6, 4.3], yaw: Math.PI },
  balcony: { position: [1.8, 1.6, -3.7], yaw: 0 },
  stairwell: { position: [0.8, 1.6, 9.3], yaw: 0.75 },
  flat48: { position: [6, 1.6, 0.2], yaw: 0 },
}
export const OBJECTS: Record<string, Point> = {
  clock: [-1.1, 1.95, -2.86],
  note: [-2.1, 0.83, -0.9],
  radiator: [1.7, 0.5, -2.8],
  tv: [-2.55, 0.9, -1.8],
  window: [1.8, 1.5, -2.95],
  kettle: [2.25, 1.05, 2.8],
  wardrobe: [-2.5, 1.1, 0.25],
  mirror: [-2.1, 1.6, 1.18],
  vent: [-2.85, 2.1, 3.1],
  shared_wall: [2.88, 1.5, -1],
  carpet: [-2.85, 1.2, -0.3],
  front_door: [0, 1.4, 6.85],
  peephole: [0, 1.7, 6.85],
  bread_bin: [2.6, 1.0, 1.5],
  bed: [2.25, 0.6, -0.3],
  calendar: [3.6, 1.8, -2.86],
  belongings: [3.9, 0.85, -0.9],
  chair: [7.5, 0.7, -0.3],
  door48: [6, 1.3, 6.85],
  corridor: [0, 1.5, 5.7],
  lamp: [0.6, 1.45, 0.9],
}
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
export function interactionPoint(choice: Choice, extension = 0, clockOffset = 0): Point | null {
  if (choice.to === 'n5_diary7') return [-1.1 + clockOffset, 0.1, -2.55]
  if (choice.to === 'n4_diary6') return [-1.8, 0.1, -0.2]
  const point = OBJECTS[CHOICE_OBJECT[choice.id] ?? choice.id]
  return point
    ? [
        point[0] + ((CHOICE_OBJECT[choice.id] ?? choice.id) === 'clock' ? clockOffset : 0),
        point[1],
        point[2] + (point[0] > -3 && point[0] < 3 && point[2] >= 4 ? extension : 0),
      ]
    : null
}
export function nodePoint(node: StoryNode): Point | null {
  const zones: Record<string, Point> = {
    landing: [-1.1, 1.6, 8],
    corridor_loop: [0, 1.6, 5.3],
    landing_48: [6, 1.6, 7.8],
    flat48: [6, 1.6, -0.6],
  }
  return OBJECTS[node.desktop?.objectId ?? ''] ?? zones[node.desktop?.zoneId ?? ''] ?? null
}
function rect(x: number, z: number, left: number, right: number, back: number, front: number) {
  return x >= left && x <= right && z >= back && z <= front
}
function insideFlat(x: number, z: number) {
  return (
    rect(x, z, -2.8, 2.8, -2.8, 0.82) ||
    rect(x, z, -0.6, 0.6, 0.7, 4.3) ||
    rect(x, z, -2.8, 2.8, 4.2, 6.8) ||
    rect(x, z, 0.98, 2.8, 1.2, 3.8) ||
    rect(x, z, -2.8, -0.98, 1.2, 3.8) ||
    rect(x, z, -1.2, 1.2, 2.05, 2.95) ||
    rect(x, z, -0.6, 0.6, 6.6, 7.5) ||
    rect(x, z, -2.8, 2.8, -4.3, -3.2) ||
    rect(x, z, 1.55, 2.5, -3.4, -2.6)
  )
}
const FURNITURE = [
  [1.05, 2.75, -1.35, 0.9],
  [-2.95, -1.85, -0.1, 0.75],
  [-2.95, -2.1, -2.2, -1.4],
  [-2.65, -1.55, -1.35, -0.45],
  [2.05, 2.95, 1.9, 2.75],
  [1.95, 2.95, 2.95, 3.9],
  [-2.95, -1.45, 3, 3.9],
  [-2.6, -1.6, 1.15, 1.85],
]
function clearOfFurniture(x: number, z: number) {
  return !FURNITURE.some(([left, right, back, front]) => rect(x, z, left!, right!, back!, front!))
}
export const SWITCHES: Point[] = [
  [0.6, 1.45, 0.88],
  [1.02, 1.45, 2.9],
  [-1.02, 1.45, 2.9],
  [0.6, 1.45, 6.7],
]
export function canWalk(x: number, z: number, flat48: boolean, extension = 0): boolean {
  const hall = extension > 0 && z >= 4 && z < 4 + extension
  const main = hall
    ? rect(x, z, -0.6, 0.6, 3.8, 4.3 + extension)
    : insideFlat(x, z >= 4 + extension ? z - extension : z)
  return (
    (main && clearOfFurniture(x, z)) ||
    (flat48 && insideFlat(x - 6, z) && clearOfFurniture(x - 6, z)) ||
    (!extension && rect(x, z, -2.8, 8.8, 7.3, 10.7))
  )
}
/** Sliding along walls is deterministic and independent of frame rate. */
export function walk(
  position: Point,
  dx: number,
  dz: number,
  flat48: boolean,
  extension = 0,
): Point {
  let x = position[0]
  const y = position[1]
  let z = position[2]
  if (canWalk(x + dx, z, flat48, extension)) x += dx
  if (canWalk(x, z + dz, flat48, extension)) z += dz
  return [x, y, z]
}
