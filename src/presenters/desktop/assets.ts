import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { asset, fetchFile } from '@/assets/loader'
import type { ManifestFile } from '@/assets/types'

/**
 * Turns preloaded asset bytes into three.js objects. Everything is parsed from memory (the
 * shell's loader already fetched it); a file that was not preloaded is fetched on demand.
 * Results are cached per id; callers clone models before adding them to a scene.
 */
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const models = new Map<string, Promise<GLTF>>()
const textures = new Map<string, Promise<THREE.Texture>>()

export function loadModel(id: string): Promise<GLTF> {
  let pending = models.get(id)
  if (!pending) {
    const file = asset(id).files.model
    if (!file) throw new Error(`${id} is not a model`)
    pending = fetchFile(file).then(
      (data) => new Promise<GLTF>((resolve, reject) => gltfLoader.parse(data, '', resolve, reject)),
    )
    models.set(id, pending)
  }
  return pending
}

function loadImage(file: ManifestFile, srgb: boolean): Promise<THREE.Texture> {
  let pending = textures.get(file.path)
  if (!pending) {
    pending = fetchFile(file).then(async (data) => {
      const bitmap = await createImageBitmap(new Blob([data], { type: 'image/webp' }), {
        imageOrientation: 'flipY',
      })
      const texture = new THREE.Texture(bitmap)
      texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.anisotropy = 8
      texture.needsUpdate = true
      return texture
    })
    textures.set(file.path, pending)
  }
  return pending
}

export interface PbrMaps {
  map: THREE.Texture
  normalMap: THREE.Texture
  /** One ORM texture used for ao (R), roughness (G) and metalness (B). */
  aoMap: THREE.Texture
  roughnessMap: THREE.Texture
  metalnessMap: THREE.Texture
}

/**
 * PBR texture set for a surface, tiled `repeat` times. Each call returns its own texture
 * objects (sharing the decoded image) so surfaces can tile differently.
 */
export async function loadPbr(id: string, repeat: [number, number] = [1, 1]): Promise<PbrMaps> {
  const files = asset(id).files
  if (!files.color || !files.normal || !files.orm) throw new Error(`${id} is not a texture set`)
  const [color, normal, orm] = await Promise.all([
    loadImage(files.color, true),
    loadImage(files.normal, false),
    loadImage(files.orm, false),
  ])
  const tiled = (t: THREE.Texture) => {
    const copy = t.clone()
    copy.repeat.set(repeat[0], repeat[1])
    copy.needsUpdate = true
    return copy
  }
  const ormTiled = tiled(orm)
  return {
    map: tiled(color),
    normalMap: tiled(normal),
    aoMap: ormTiled,
    roughnessMap: ormTiled,
    metalnessMap: ormTiled,
  }
}

/** Equirectangular HDR environment, ready for PMREM or `scene.environment`. */
export async function loadHdri(id: string): Promise<THREE.DataTexture> {
  const file = asset(id).files.hdr
  if (!file) throw new Error(`${id} is not an HDRI`)
  const data = await fetchFile(file)
  const parsed = new HDRLoader().parse(data)
  const texture = new THREE.DataTexture(parsed.data, parsed.width, parsed.height)
  texture.type = parsed.type ?? THREE.HalfFloatType
  texture.format = THREE.RGBAFormat
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.flipY = true
  texture.needsUpdate = true
  return texture
}
