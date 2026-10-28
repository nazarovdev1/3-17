/** Object anchors are exported by the exact camera used to render each still. */
export interface HotspotDef {
  x: number
  y: number
}
import { coverPoint } from './still-renderer'

/** A tappable object: the Director's id, and where it is in the still (anchor or point). */
export interface HotspotTarget {
  id: string
  anchor?: string
  /** Normalised still coordinates when the still has no exported anchor for it. */
  at?: HotspotDef
}

/** A 48 px hit rectangle must be fully in the visible crop and clear of every other hit. */
export function layoutHotspots(
  targets: HotspotTarget[],
  anchors: Record<string, HotspotDef>,
  width: number,
  height: number,
) {
  const result: Record<string, HotspotDef> = {}
  for (const target of targets) {
    const point = target.at ?? anchors[target.anchor ?? target.id]
    if (!point) continue
    const at = coverPoint(point.x, point.y, width, height)
    if (at.x < 30 || at.x > width - 30 || at.y < 56 || at.y > height - 48) continue
    if (
      Object.values(result).some(
        (other) => Math.abs(other.x - at.x) < 56 && Math.abs(other.y - at.y) < 56,
      )
    )
      continue
    result[target.id] = at
  }
  return result
}
