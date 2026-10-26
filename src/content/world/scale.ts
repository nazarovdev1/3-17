import manifestJson from '@/assets/manifest.gen.json' with { type: 'json' }
import type { AssetManifest } from '@/assets/types'
import type { Vec3, WorldObject } from './layout'

const manifest = manifestJson as unknown as AssetManifest

/** Rotation matrix for Euler XYZ (three.js default order): R = Rx · Ry · Rz. */
function rotation([rx, ry, rz]: Vec3): number[][] {
  const [cx, sx, cy, sy, cz, sz] = [
    Math.cos(rx),
    Math.sin(rx),
    Math.cos(ry),
    Math.sin(ry),
    Math.cos(rz),
    Math.sin(rz),
  ]
  return [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
    [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
  ]
}

/** Axis-aligned extent of a box of size `b` after rotating it by `orient`. */
export function orientedExtent(b: Vec3, orient: Vec3 = [0, 0, 0]): Vec3 {
  const m = rotation(orient)
  return m.map((row) => row.reduce((sum, v, i) => sum + Math.abs(v) * b[i]!, 0)) as Vec3
}

/** Model bounds (source units) for an object, or null for procedural pieces. */
export function modelBounds(o: WorldObject): Vec3 | null {
  if (o.asset.startsWith('proc:')) return null
  const found = manifest.assets.find((a) => a.id === o.asset)
  return found?.boundsM ?? null
}

/**
 * Uniform scale that maps the model to the object's declared size. Taken from the largest
 * declared dimension (the most reliable one); the other axes are checked against it.
 */
export function uniformScale(o: WorldObject): number | null {
  const bounds = modelBounds(o)
  if (!bounds) return null
  const extent = orientedExtent(bounds, o.orient)
  const axis = [0, 1, 2].reduce((best, i) => (o.size[i]! > o.size[best]! ? i : best), 0)
  return o.size[axis]! / extent[axis]!
}

/** Rendered size per axis after uniform scaling, for the ±10 % check. */
export function renderedSize(o: WorldObject): Vec3 | null {
  const bounds = modelBounds(o)
  const s = uniformScale(o)
  if (!bounds || s === null) return null
  return orientedExtent(bounds, o.orient).map((v) => v * s) as Vec3
}
