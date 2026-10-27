import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptSimplifier } from 'meshoptimizer/simplifier'

const cache = new WeakMap<GLTF, Promise<GLTF>>()

/** Textured mesh LOD for a CPU rasterizer; full models remain cached separately. */
export function softwareModel(source: GLTF): Promise<GLTF> {
  let pending = cache.get(source)
  if (!pending) {
    pending = MeshoptSimplifier.ready.then(() => {
      const scene = source.scene.clone(true)
      const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>()
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        const original = (object as THREE.Mesh<THREE.BufferGeometry>).geometry
        let geometry = geometries.get(original)
        if (!geometry) {
          geometry = original.clone()
          const position = original.getAttribute('position')
          const indices = original.index
          if (indices && indices.count > 12000 && original.groups.length <= 1) {
            const vertices = new Float32Array(position.count * 3)
            for (let i = 0; i < position.count; i++) {
              vertices[i * 3] = position.getX(i)
              vertices[i * 3 + 1] = position.getY(i)
              vertices[i * 3 + 2] = position.getZ(i)
            }
            const [reduced] = MeshoptSimplifier.simplify(
              Uint32Array.from(indices.array),
              vertices,
              3,
              Math.max(1800, Math.floor((indices.count * 0.025) / 3) * 3),
              0.08,
              ['Permissive'],
            )
            geometry.setIndex(new THREE.BufferAttribute(reduced, 1))
            geometry.clearGroups()
          }
          geometries.set(original, geometry)
        }
        object.geometry = geometry
      })
      return { ...source, scene }
    })
    cache.set(source, pending)
  }
  return pending
}
