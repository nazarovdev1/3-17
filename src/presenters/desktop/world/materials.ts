import * as THREE from 'three'
import type { Surface } from '@/content/world/layout'
import { loadPbr } from '../assets'
import { softwareMaterial } from './softwareMaterial'

/**
 * PBR materials for architectural surfaces. Geometry carries UVs in metres, so each texture
 * repeats once per `tile` metres of real wall or floor, whatever the box size.
 */
/** `normal` scales the relief: plaster ceilings in panel flats are smooth, not stucco. */
const SOURCES: Record<
  Surface,
  {
    id: string
    tile: number
    color?: string
    roughness?: number
    normal?: number
    /** Gloss-painted: keep the relief and wear (normal, ORM), drop the wood-grain colour. */
    plain?: boolean
  }
> = {
  parquet: { id: 'WoodFloor014', tile: 1.6, color: '#b3a594' },
  boards: { id: 'PaintedWood005', tile: 1.4, color: '#8c7e6c' },
  tiles: { id: 'Tiles107', tile: 1.0, color: '#b9bdb6' },
  wallpaper47: { id: 'Wallpaper001C', tile: 1.1, color: '#9d9583', normal: 0.6 },
  wallpaper48: { id: 'Wallpaper002C', tile: 1.4, color: '#7b7c6e' },
  whitewash: { id: 'PaintedPlaster017', tile: 3.0, color: '#aeaaa0', normal: 0.035 },
  stairwell: { id: 'PaintedPlaster010', tile: 2.2, color: '#6f8274', normal: 0.2, plain: true },
  concrete: { id: 'Concrete034', tile: 2.0, color: '#7a7a76' },
  door_paint: { id: 'PaintedWood007C', tile: 1.0, color: '#cdc8bb', normal: 0.35, plain: true },
}

export type SurfaceMaterials = Record<Surface, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>

export async function loadSurfaces(detailed = true): Promise<SurfaceMaterials> {
  const entries = await Promise.all(
    (Object.keys(SOURCES) as Surface[]).map(async (surface) => {
      const source = SOURCES[surface]
      const repeat = 1 / source.tile
      const maps = await loadPbr(source.id, [repeat, repeat])
      const material = new THREE.MeshStandardMaterial({
        ...maps,
        ...(!detailed
          ? { normalMap: null, roughnessMap: null, metalnessMap: null, aoMap: null }
          : {}),
        ...(source.plain ? { map: null, roughness: 0.55 } : {}),
        color: source.color ?? '#ffffff',
        ...(source.plain ? {} : { roughness: source.roughness ?? 1 }),
        metalness: detailed ? 1 : 0,
        // ORM: metalness lives in the map's blue channel; the scalar is a multiplier.
      })
      material.name = surface
      if (source.normal !== undefined) material.normalScale.setScalar(source.normal)
      if (!detailed) {
        const fallback = softwareMaterial(material)
        material.dispose()
        return [surface, fallback] as const
      }
      return [surface, material] as const
    }),
  )
  return Object.fromEntries(entries) as SurfaceMaterials
}

/**
 * Box with UVs in metres on every face (u along the face's horizontal edge, v up), so one
 * material tiles at real-world scale across boxes of any size.
 */
export function metricBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(w, h, d)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  // BoxGeometry face order: +x, −x, +y, −y, +z, −z; 4 vertices each.
  const faceSize: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let face = 0; face < 6; face++) {
    const [su, sv] = faceSize[face]!
    for (let i = 0; i < 4; i++) {
      const index = face * 4 + i
      uv.setXY(index, uv.getX(index) * su, uv.getY(index) * sv)
    }
  }
  uv.needsUpdate = true
  return geometry
}

/** Horizontal plane (floor or ceiling) with metric UVs. */
export function metricPlane(w: number, d: number): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(w, d)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d)
  uv.needsUpdate = true
  return geometry
}
