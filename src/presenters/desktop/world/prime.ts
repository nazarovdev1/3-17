import * as THREE from 'three'
import { desktopRuntime } from '@/platform/device/desktopRuntime'

/**
 * Uploads an object's geometry and compiles its shaders once, off screen, as soon as it is
 * loaded — so its first appearance (often a scare) does not stall a frame, and GPU
 * resource counts settle during loading instead of mid-story.
 */
export function primeUpload(gl: THREE.WebGLRenderer, root: THREE.Object3D) {
  const copy = root.clone(true)
  copy.traverse((o) => {
    o.visible = true
    o.frustumCulled = false
    o.layers.enableAll()
  })
  const scene = new THREE.Scene()
  scene.add(copy)
  const camera = new THREE.PerspectiveCamera()
  camera.layers.enableAll()
  const target = new THREE.WebGLRenderTarget(1, 1)
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  gl.render(scene, camera)
  gl.setRenderTarget(previous)
  target.dispose()
  desktopRuntime.primes++
}

/**
 * Uploads every geometry under `root`, shown or hidden, by drawing each once into a 1×1
 * target with one plain material. Lights switched off, props not yet needed and the
 * windows' far side all reach the GPU at once, so its resource counts stay flat whatever
 * the night shows first (no materials or reflections are touched).
 */
export function primeGeometries(gl: THREE.WebGLRenderer, root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined
    if (g?.isBufferGeometry && !(o as THREE.InstancedMesh).isInstancedMesh) geometries.add(g)
  })
  const scene = new THREE.Scene()
  const material = new THREE.MeshBasicMaterial()
  for (const geometry of geometries) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    scene.add(mesh)
  }
  const camera = new THREE.PerspectiveCamera()
  const target = new THREE.WebGLRenderTarget(1, 1)
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  gl.render(scene, camera)
  gl.setRenderTarget(previous)
  target.dispose()
  material.dispose()
  desktopRuntime.primes++
}
