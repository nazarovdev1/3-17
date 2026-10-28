import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { WORLD, type WorldObject } from '@/content/world/layout'
import { zonesAt } from '@/content/world/zones'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { uniformScale } from '@/content/world/scale'
import { metricBox, type SurfaceMaterials } from './materials'
import { shiftZ } from './stretch'
import { softwareMaterial } from './softwareMaterial'

/**
 * Every object of the plan, at its declared real size: models are scaled uniformly (the
 * proportions validate:world checks), stood on their support and turned to face the room.
 * A handful of simple fixtures are built here (paper, bread box, switch plates, vent,
 * mirror cabinet, built-in wardrobe doors, calendar).
 */
export type Models = Map<string, GLTF>

/** Places a model so its footprint centre is at (x, z) and its base at y. */
export function placeModel(o: WorldObject, gltf: GLTF, detailed = true): THREE.Object3D {
  const inner = gltf.scene.clone(true)
  const s = uniformScale(o) ?? 1
  inner.scale.setScalar(s)
  if (o.orient) inner.rotation.set(...o.orient)
  inner.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(inner)
  const centre = box.getCenter(new THREE.Vector3())
  inner.position.set(-centre.x, -box.min.y, -centre.z)
  const outer = new THREE.Group()
  outer.add(inner)
  outer.rotation.y = o.rotation
  outer.name = o.id
  if (o.asset === 'wall_clock') setClockHands(outer, o.size)
  inner.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = o.support.on !== 'ceiling'
    mesh.receiveShadow = true
    if (!detailed) {
      // The software fallback keeps the scanned geometry/albedo. Normal and ORM
      // sampling is reserved for native GPUs and the explicit HD audit profile.
      const simple = (material: THREE.Material) => {
        const source = material as THREE.MeshStandardMaterial
        return softwareMaterial(source)
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(simple)
        : simple(mesh.material)
    }
    if (o.asset === 'window') {
      // This scan baked opaque black panes into the frame's single material. Keep the
      // painted frame and dirt, but let the courtyard show through the dark glass.
      const glaze = (material: THREE.Material) => {
        const copy = material.clone() as THREE.MeshStandardMaterial
        copy.transparent = true
        copy.depthWrite = false
        copy.onBeforeCompile = (shader, renderer) => {
          material.onBeforeCompile(shader, renderer)
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            #ifdef USE_MAP
            float pane = max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b));
            diffuseColor.a *= smoothstep(0.025, 0.16, pane);
            #endif`,
          )
        }
        copy.customProgramCacheKey = () => 'window-glazing'
        return copy
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(glaze) : glaze(mesh.material)
    }
    if (o.tint) {
      const tint = new THREE.Color(o.tint)
      const tinted = (m: THREE.Material) => {
        const copy = m.clone() as THREE.MeshStandardMaterial
        copy.onBeforeCompile = (shader, renderer) => m.onBeforeCompile(shader, renderer)
        copy.customProgramCacheKey = () => m.customProgramCacheKey()
        if (copy.color) copy.color.multiply(tint)
        if ('roughness' in copy) copy.roughness = Math.min(1, copy.roughness + 0.2)
        return copy
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(tinted)
        : tinted(mesh.material)
    }
  })
  return outer
}

/**
 * Flat 48's wall calendar: a yellowed page for a February years ago, one day ringed. Drawn
 * once on a canvas (Uzbek month and weekday abbreviations).
 */
let calendar: THREE.CanvasTexture | null = null
function calendarTexture(): THREE.CanvasTexture {
  if (calendar) return calendar
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 500
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d8cdb0'
  ctx.fillRect(0, 0, 360, 500)
  ctx.fillStyle = 'rgba(90, 70, 40, 0.18)'
  for (let i = 0; i < 60; i++) ctx.fillRect((i * 53) % 360, (i * 97) % 500, 18, 9)
  ctx.fillStyle = '#6b2a22'
  ctx.fillRect(0, 0, 360, 150)
  ctx.fillStyle = '#e9dfc7'
  ctx.font = '600 44px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('FEVRAL', 180, 85)
  ctx.font = '24px Georgia, serif'
  ctx.fillText('2019', 180, 125)
  ctx.fillStyle = '#3d342a'
  ctx.font = '600 15px Arial, sans-serif'
  ;['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].forEach((d, i) => ctx.fillText(d, 35 + i * 48, 185))
  ctx.font = '22px Arial, sans-serif'
  for (let day = 1; day <= 28; day++) {
    const cell = day + 3
    const x = 35 + (cell % 7) * 48
    const y = 225 + Math.floor(cell / 7) * 52
    ctx.fillStyle = cell % 7 >= 5 ? '#8a2b22' : '#3d342a'
    ctx.fillText(String(day), x, y)
    if (day === 17) {
      ctx.strokeStyle = '#7a1d17'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y - 8, 21, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  calendar = new THREE.CanvasTexture(canvas)
  calendar.colorSpace = THREE.SRGBColorSpace
  return calendar
}

/** The clock's hands, stopped at 3:17 (hours, minutes; the second hand at 12). */
function setClockHands(root: THREE.Object3D, size: WorldObject['size']) {
  // The scanned hands have off-centre pivots and already point to another time.
  // Keep the scanned case/face, hide those hands, and pivot clean hands at the dial centre.
  for (const name of ['hours', 'minute', 'second']) {
    const hand = root.getObjectByName(`wall_clock_${name}_hand`)
    if (hand) hand.visible = false
  }
  const material = new THREE.MeshStandardMaterial({ color: '#242522', roughness: 0.7 })
  let handIndex = 0
  for (const [length, width, fraction] of [
    [0.073, 0.008, (3 + 17 / 60) / 12],
    [0.112, 0.005, 17 / 60],
    [0.12, 0.002, 0],
  ]) {
    const pivot = new THREE.Group()
    pivot.name = `clock-hand-${handIndex++}`
    pivot.position.set(0, size[1] / 2, size[2] / 2 + 0.002)
    pivot.rotation.z = -fraction! * Math.PI * 2
    const hand = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.001), material)
    hand.position.y = length! / 2
    pivot.add(hand)
    root.add(pivot)
  }
}

function Procedural({
  o,
  surfaces,
  mirrors,
}: {
  o: WorldObject
  surfaces: SurfaceMaterials
  mirrors: boolean
}) {
  const [w, h, d] = o.size
  const parts = useMemo(() => {
    const list: {
      geometry: THREE.BufferGeometry
      material: THREE.Material
      position: THREE.Vector3Tuple
    }[] = []
    const paper = new THREE.MeshStandardMaterial({ color: '#e7e1d2', roughness: 0.95 })
    const plastic = new THREE.MeshStandardMaterial({ color: '#d8d3c4', roughness: 0.55 })
    const dark = new THREE.MeshStandardMaterial({
      color: '#2a2c2b',
      roughness: 0.8,
      metalness: 0.3,
    })
    const glass = new THREE.MeshStandardMaterial({
      color: '#c9d2d4',
      roughness: 0.04,
      metalness: 1,
    })
    const brass = new THREE.MeshStandardMaterial({
      color: '#9c7b3e',
      roughness: 0.35,
      metalness: 1,
    })
    switch (o.asset) {
      case 'proc:paper':
        list.push({
          geometry: new THREE.BoxGeometry(w, h, d),
          material: paper,
          position: [0, h / 2, 0],
        })
        break
      case 'proc:calendar':
        list.push({
          geometry: new THREE.BoxGeometry(w, h, d),
          material: new THREE.MeshStandardMaterial({ map: calendarTexture(), roughness: 0.95 }),
          position: [0, h / 2, 0],
        })
        break
      case 'proc:bread_bin':
        list.push({
          geometry: metricBox(w, h, d),
          material: surfaces.door_paint,
          position: [0, h / 2, 0],
        })
        list.push({
          geometry: new THREE.BoxGeometry(0.08, 0.015, 0.015),
          material: brass,
          position: [0, h * 0.75, d / 2 + 0.008],
        })
        break
      case 'proc:switch':
        list.push({
          geometry: new THREE.BoxGeometry(w, h, 0.012),
          material: plastic,
          position: [0, h / 2, -d / 2 + 0.006],
        })
        list.push({
          geometry: new THREE.BoxGeometry(0.022, 0.035, 0.016),
          material: plastic,
          position: [0, h / 2, -d / 2 + 0.018],
        })
        break
      case 'proc:vent':
        list.push({
          geometry: new THREE.BoxGeometry(w, h, d),
          material: dark,
          position: [0, h / 2, 0],
        })
        for (let i = 1; i < 7; i++) {
          list.push({
            geometry: new THREE.BoxGeometry(w * 0.86, 0.008, 0.012),
            material: plastic,
            position: [0, (h * i) / 7, d / 2],
          })
        }
        break
      case 'proc:mirror_cabinet':
        list.push({
          geometry: metricBox(w, h, d),
          material: surfaces.whitewash,
          position: [0, h / 2, 0],
        })
        // The glass itself is a live reflector (see <Mirror/>) where the GPU allows.
        if (!mirrors) {
          list.push({
            geometry: new THREE.BoxGeometry(w * 0.9, h * 0.86, 0.004),
            material: glass,
            position: [0, h / 2, d / 2 + 0.002],
          })
        }
        break
      case 'proc:closet_doors': {
        // Two flush leaves with a gap, painted, with small brass knobs.
        const leaf = w / 2 - 0.004
        for (const side of [-1, 1]) {
          list.push({
            geometry: metricBox(leaf, h, d),
            material: surfaces.door_paint,
            position: [(side * w) / 4, h / 2, 0],
          })
          list.push({
            geometry: new THREE.SphereGeometry(0.018, 12, 8),
            material: brass,
            position: [side * 0.06, 1.0, d / 2 + 0.015],
          })
        }
        break
      }
    }
    return surfaces.whitewash instanceof THREE.MeshBasicMaterial
      ? list.map((part) => ({
          ...part,
          material:
            part.material instanceof THREE.MeshStandardMaterial
              ? softwareMaterial(part.material)
              : part.material,
        }))
      : list
  }, [o.asset, w, h, d, surfaces, mirrors])
  return (
    <>
      {mirrors && o.asset === 'proc:mirror_cabinet' && (
        <Mirror width={w * 0.9} height={h * 0.86} position={[0, h / 2, d / 2 + 0.003]} />
      )}
      {parts.map((p, i) => (
        <mesh
          key={i}
          geometry={p.geometry}
          material={p.material}
          position={p.position}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

/** A real mirror: renders the scene from the reflected viewpoint (three.js Reflector). */
function Mirror({
  width,
  height,
  position,
}: {
  width: number
  height: number
  position: THREE.Vector3Tuple
}) {
  const reflector = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(width, height), {
      textureWidth: 512,
      textureHeight: 640,
      color: new THREE.Color('#8f9694'),
      clipBias: 0.003,
    })
    return r
  }, [width, height])
  useEffect(
    () => () => {
      reflector.dispose()
    },
    [reflector],
  )
  return <primitive object={reflector} position={position} />
}

const ENTRANCES = [
  ['47', 'front_door'],
  ['48', 'front_door48'],
] as const
const ROOMS_OF: Record<string, string[]> = Object.fromEntries(
  ['47', '48'].map((flat) => [flat, WORLD.rooms.filter((r) => r.flat === flat).map((r) => r.id)]),
)
/** Rooms seen from the landing through a flat's open entrance (the straight line in). */
const THROUGH_ENTRANCE = new Set(['hall', 'corridor', 'room'])

export function Furniture({
  models,
  surfaces,
  extension,
  skip,
  mirrors,
}: {
  models: Models
  surfaces: SurfaceMaterials
  extension: number
  /** Objects drawn elsewhere (the clock, which moves). */
  skip: Set<string>
  /** Live mirror reflections (off on software GL, where they cost too much). */
  mirrors: boolean
}) {
  const placed = useMemo(
    () =>
      WORLD.objects
        .filter((o) => !skip.has(o.id))
        .map((o) => {
          const gltf = o.asset.startsWith('proc:') ? null : models.get(o.asset)
          return { o, node: gltf ? placeModel(o, gltf, mirrors) : null }
        }),
    [models, skip, mirrors],
  )
  // Nothing occludes in three.js: from the landing every object of both flats was drawn
  // through the walls (230k triangles on software GL). A flat's furniture is drawn whole from
  // inside it; from outside, only the rooms in line with its open entrance (hall, corridor,
  // room) can be seen, and nothing while that leaf is shut.
  const groups = useRef<Record<string, THREE.Group | null>>({})
  const here = useRef<string>('common')
  // The first frames draw everything once, so every room's buffers are on the GPU before it is
  // culled (no upload hitch the first time a room comes into view, no growth across nights).
  const warm = useRef(0)
  useFrame(() => {
    if (warm.current < 3) {
      // Frustum culling off too, or what is behind the first view would upload later.
      const warming = warm.current < 2
      for (const group of Object.values(groups.current))
        group?.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return
          if (warming) {
            o.userData.frustumCulled ??= o.frustumCulled
            o.frustumCulled = false
          } else o.frustumCulled = (o.userData.frustumCulled as boolean | undefined) ?? true
        })
      warm.current++
      return
    }
    const [x, , z] = desktopRuntime.position
    const room = WORLD.rooms.find((r) => zonesAt(x!, z!).includes(r.id))
    if (room) here.current = room.flat
    const drawn: string[] = []
    for (const [flat, door] of ENTRANCES) {
      const inside = here.current === flat
      const open = !!desktopRuntime.entrances[door]
      for (const id of ROOMS_OF[flat]!) {
        const group = groups.current[id]
        const visible = inside || (open && THROUGH_ENTRANCE.has(id.replace(/48$/, '')))
        if (group) group.visible = visible
        if (visible) drawn.push(id)
      }
    }
    desktopRuntime.flatsDrawn = drawn.join(',')
  })
  const rooms = useMemo(() => [...new Set(placed.map(({ o }) => o.room as string))], [placed])
  return (
    <group name="furniture">
      {rooms.map((room) => (
        <group
          key={room}
          ref={(g) => {
            groups.current[room] = g
          }}
        >
          {placed
            .filter(({ o }) => o.room === room)
            .map(({ o, node }) => (
              <group
                key={o.id}
                position={[
                  o.position[0],
                  o.position[1],
                  shiftZ(o.position[0], o.position[2], extension),
                ]}
                rotation-y={node ? 0 : o.rotation}
              >
                {node ? (
                  <primitive object={node} />
                ) : (
                  <Procedural o={o} surfaces={surfaces} mirrors={mirrors} />
                )}
              </group>
            ))}
        </group>
      ))}
    </group>
  )
}

/** The clock as its own object: it is the one that moves when no one is looking. */
export function placeClock(o: WorldObject, gltf: GLTF, detailed = true): THREE.Object3D {
  return placeModel(o, gltf, detailed)
}
