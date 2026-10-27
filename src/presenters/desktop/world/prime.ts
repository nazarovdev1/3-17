import * as THREE from 'three'

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
}
