/** Object anchors are exported by the exact camera used to render each still. */
export interface HotspotDef {
  x: number
  y: number
}
import { coverPoint } from './still-renderer'

const ANCHOR: Record<string, string> = {
  listen: 'shared_wall',
  kitchen: 'bread_bin',
  bathroom: 'vent',
  diary: 'chair',
  tea: 'kettle',
  sleep: 'bed',
  wait: 'bed',
  wait317: 'bed',
  stay: 'bed',
  chain: 'front_door',
  leave: 'front_door',
  leave_early: 'front_door',
  enter: 'door48',
  open48: 'door48',
  wind: 'clock',
  shifted_clock: 'clock',
  retreat: 'front_door',
  keep: 'front_door',
  stop: 'corridor',
}
/** A 48 px hit rectangle must be fully in the visible crop and clear of every other hit. */
export function layoutHotspots(
  choices: { id: string }[],
  anchors: Record<string, HotspotDef>,
  width: number,
  height: number,
) {
  const result: Record<string, HotspotDef> = {}
  for (const choice of choices) {
    const point = anchors[ANCHOR[choice.id] ?? choice.id]
    if (!point) continue
    const at = coverPoint(point.x, point.y, width, height)
    if (at.x < 30 || at.x > width - 30 || at.y < 56 || at.y > height - 48) continue
    if (
      Object.values(result).some(
        (other) => Math.abs(other.x - at.x) < 56 && Math.abs(other.y - at.y) < 56,
      )
    )
      continue
    result[choice.id] = at
  }
  return result
}

/** Vignette ids the story uses, for the presenter's completeness check. */
export const VIGNETTE_IDS = [
  'room_entry',
  'room',
  'room_shifted',
  'room_dark',
  'window',
  'kitchen',
  'bathroom',
  'corridor',
  'stairwell',
  'landing48',
  'flat48',
  'wall',
  'peephole',
  'ending_a',
  'ending_b',
  'ending_c',
] as const
