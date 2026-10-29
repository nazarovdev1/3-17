import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD, type DoorDef, type Opening, type Wall } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { audio } from '@/audio/engine'
import { metricBox, type SurfaceMaterials } from './materials'
import { splitWall } from './stretch'
import { softwareMaterial } from './softwareMaterial'

/**
 * Hinged doors from the plan. Each leaf pivots at its hinge and swings toward the side the
 * plan says. Doors open as the player walks up (and close behind); the bathroom stays a
 * hand's width ajar; flat 48's door hangs open from night 4.
 */
interface Placed {
  def: DoorDef
  wall: Wall
  opening: Opening
  hinge: THREE.Vector3
  /** Rotation that lays the leaf (built along local +x) along the wall, closed. */
  base: number
  /** Sign of the opening rotation that swings the free end to the right side. */
  sign: 1 | -1
}

const plates = new Map<string, THREE.CanvasTexture>()
export function numberPlate(label: string) {
  let texture = plates.get(label)
  if (texture) return texture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.fillStyle = '#292b29'
  context.fillRect(0, 0, 256, 128)
  context.fillStyle = '#c8c3ab'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '80px Georgia, serif'
  context.fillText(label, 128, 68)
  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  plates.set(label, texture)
  return texture
}

function place(def: DoorDef, extension: number): Placed | null {
  for (const wall of WORLD.walls.flatMap((w) => splitWall(w, extension))) {
    if (wall.id !== def.wall && !wall.id.startsWith(`${def.wall}:`)) continue
    const opening = wall.openings.find((o) => o.door === def.id)
    if (!opening) continue
    const low = opening.at - opening.width / 2
    const high = opening.at + opening.width / 2
    const along = def.hinge === 'low' ? low : high
    const dir = def.hinge === 'low' ? 1 : -1
    const mid =
      wall.axis === 'x' ? (wall.box.z0 + wall.box.z1) / 2 : (wall.box.x0 + wall.box.x1) / 2
    const hinge =
      wall.axis === 'x' ? new THREE.Vector3(along, 0, mid) : new THREE.Vector3(mid, 0, along)
    // Local +x → along the wall toward the free end.
    const base = wall.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2
    // Pick the rotation sign whose free end moves toward the swing side.
    const probe = (angle: number) => {
      const v = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), base + angle)
      return wall.axis === 'x' ? v.z : v.x
    }
    const sign = probe(0.5) * def.swing > 0 ? 1 : -1
    return { def, wall, opening, hinge, base, sign }
  }
  return null
}

function rest(def: DoorDef, doorAjar: boolean, story?: 'ajar' | 'closed'): number {
  // The night's word on a door: shut (it still opens for the player) or standing ajar.
  if (story === 'closed') return 0
  if (story === 'ajar') return def.kind === 'entrance' ? 0.3 : 0.45
  if (def.id === 'front_door48') return doorAjar ? 0.36 : 0
  if (def.kind === 'entrance' || def.kind === 'metal' || def.kind === 'lift') return 0
  if (def.kind === 'balcony' || def.kind === 'closet') return 0
  if (def.id.startsWith('bath_door')) return 0.22
  if (def.id.startsWith('kitchen_door')) return 0.22
  return 1.45
}

const NO_STORY: Record<string, 'open' | 'ajar' | 'closed'> = {}
const storyRest = (state?: 'open' | 'ajar' | 'closed') =>
  state === 'ajar' || state === 'closed' ? state : undefined

/** The entrance leaf hangs this far above the floor: light (and shadows) show under it. */
export const DOOR_GAP = 0.014

function Leaf({
  p,
  surfaces,
  frosted,
}: {
  p: Placed
  surfaces: SurfaceMaterials
  /** Real blurring glass (GPU transmission) instead of a plain translucent pane. */
  frosted: boolean
}) {
  const { def, opening } = p
  const parts = useMemo(() => {
    const width = opening.width - 0.01
    const height = opening.top - opening.bottom - 0.01 - (def.kind === 'entrance' ? DOOR_GAP : 0)
    const thick = def.kind === 'entrance' ? 0.07 : def.kind === 'metal' ? 0.06 : 0.04
    const brass = new THREE.MeshStandardMaterial({
      color: '#8f7440',
      roughness: 0.35,
      metalness: 1,
    })
    const leather = new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.7 })
    const steel = new THREE.MeshStandardMaterial({
      color: '#4d5250',
      roughness: 0.5,
      metalness: 0.8,
    })
    // Kitchen door: ribbed frosted glass — what stands behind it blurs into a shadow
    // (rough transmission on the GPU; a near-opaque pane on software GL). Balcony: clear.
    const pane =
      def.kind === 'glass' && frosted
        ? new THREE.MeshPhysicalMaterial({
            color: '#c9d0cc',
            roughness: 0.38,
            transmission: 1,
            thickness: 0.004,
            ior: 1.5,
          })
        : new THREE.MeshStandardMaterial({
            color: def.kind === 'balcony' ? '#1c2228' : '#7f8885',
            roughness: def.kind === 'balcony' ? 0.05 : 0.85,
            metalness: def.kind === 'balcony' ? 0.6 : 0,
            transparent: true,
            opacity: def.kind === 'balcony' ? 0.18 : 0.9,
            depthWrite: false,
          })
    const list: {
      geometry: THREE.BufferGeometry
      material: THREE.Material
      position: THREE.Vector3Tuple
    }[] = []
    const body =
      def.kind === 'entrance'
        ? leather
        : def.kind === 'metal' || def.kind === 'lift'
          ? steel
          : surfaces.door_paint
    if (def.kind === 'glass' || def.kind === 'balcony') {
      // Frame around a glazed panel: stiles, rails and the glass.
      const rail = 0.09
      list.push({
        geometry: metricBox(rail, height, thick),
        material: surfaces.door_paint,
        position: [rail / 2, height / 2, 0],
      })
      list.push({
        geometry: metricBox(rail, height, thick),
        material: surfaces.door_paint,
        position: [width - rail / 2, height / 2, 0],
      })
      list.push({
        geometry: metricBox(width, rail, thick),
        material: surfaces.door_paint,
        position: [width / 2, height - rail / 2, 0],
      })
      const bottom = def.kind === 'glass' ? 0.75 : 0.6
      list.push({
        geometry: metricBox(width, bottom, thick),
        material: surfaces.door_paint,
        position: [width / 2, bottom / 2, 0],
      })
      list.push({
        geometry: new THREE.BoxGeometry(width - rail * 2, height - bottom - rail, 0.006),
        material: pane,
        position: [width / 2, bottom + (height - bottom - rail) / 2, 0],
      })
    } else {
      list.push({
        geometry: metricBox(width, height, thick),
        material: body,
        position: [width / 2, height / 2, 0],
      })
    }
    if (def.kind !== 'lift') {
      for (const side of [-1, 1]) {
        list.push({
          geometry: new THREE.BoxGeometry(0.12, 0.02, 0.03),
          material: brass,
          position: [width - 0.1, 1.0, (side * thick) / 2 + side * 0.02],
        })
      }
    }
    if (def.kind === 'entrance') {
      // Peephole lens and the number plate on the landing side.
      list.push({
        geometry: new THREE.CylinderGeometry(0.012, 0.012, thick + 0.02, 16).rotateX(Math.PI / 2),
        material: brass,
        position: [width / 2, 1.6, 0],
      })
    }
    if (def.label) {
      list.push({
        geometry: new THREE.BoxGeometry(0.18, 0.09, thick + 0.004),
        material: new THREE.MeshStandardMaterial({ map: numberPlate(def.label), roughness: 0.7 }),
        position: [width / 2, 1.82, 0],
      })
    }
    if (def.kind === 'lift') {
      list.push({
        geometry: new THREE.BoxGeometry(0.009, height, thick + 0.002),
        material: leather,
        position: [width / 2, height / 2, 0],
      })
      list.push({
        geometry: new THREE.BoxGeometry(0.12, 0.2, 0.025),
        material: steel,
        position: [width + 0.14, 1.2, -0.105],
      })
      list.push({
        geometry: new THREE.CylinderGeometry(0.018, 0.018, 0.016, 16).rotateX(Math.PI / 2),
        material: brass,
        position: [width + 0.14, 1.2, -0.125],
      })
      list.push({
        geometry: new THREE.BoxGeometry(0.16, 0.09, 0.012),
        material: new THREE.MeshStandardMaterial({ map: numberPlate('4'), roughness: 0.65 }),
        position: [width / 2, height + 0.12, -0.105],
      })
    }
    return surfaces.door_paint instanceof THREE.MeshBasicMaterial
      ? list.map((part) => ({
          ...part,
          material:
            part.material instanceof THREE.MeshStandardMaterial
              ? softwareMaterial(part.material)
              : part.material,
        }))
      : list
  }, [def.kind, def.label, opening, surfaces, frosted])
  return (
    <>
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={part.material}
          position={part.position}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}

export function Doors({
  surfaces,
  extension,
  doorAjar,
  closed,
  held = NO_DOORS,
  story = NO_STORY,
  frosted,
}: {
  /** Doors the night has shut or left ajar (world.doors), apart from held and closed. */
  story?: Record<string, 'open' | 'ajar' | 'closed'>
  surfaces: SurfaceMaterials
  extension: number
  doorAjar: boolean
  /** Doors held shut for the current beat (they neither open for the player nor stand ajar). */
  closed: Set<string>
  /** Doors the story holds open (someone opened them and stands there). */
  held?: Set<string>
  frosted: boolean
}) {
  const placed = useMemo(
    () =>
      WORLD.doors
        .filter((d) => d.kind !== 'closet')
        .map((d) => place(d, extension))
        .filter((p): p is Placed => p !== null),
    [extension],
  )
  const pivots = useRef<(THREE.Group | null)[]>([])
  const angles = useRef<number[]>([])
  /** Angular velocity of each leaf (rad/s): doors swing on a damped spring, not a lerp. */
  const speeds = useRef<number[]>([])
  const opening = useRef<boolean[]>([])
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const [px, , pz] = desktopRuntime.position
    placed.forEach((p, i) => {
      const pivot = pivots.current[i]
      if (!pivot) return
      const centre = p.hinge.clone()
      const near = Math.hypot(px! - centre.x, pz! - centre.z) < 1.6
      const opensForPlayer =
        p.def.kind !== 'metal' &&
        p.def.kind !== 'lift' &&
        p.def.id !== 'balcony_door' &&
        (p.def.id !== 'front_door48' || doorAjar)
      // Once the player is fully inside the small kitchen, close the leaf behind
      // them. Holding it open here screened the fridge and washer with frosted glass.
      const kitchenInside =
        p.def.id.startsWith('kitchen_door') &&
        (px! - p.hinge.x) * (p.def.id.endsWith('48') ? -1 : 1) > 0.37
      const shut = closed.has(p.def.id)
      const target = shut
        ? 0
        : held.has(p.def.id) || (near && opensForPlayer && !kitchenInside)
          ? 1.4
          : rest(p.def, doorAjar, storyRest(story[p.def.id]))
      // A door the story holds shut is shut (it does not swing closed in front of you).
      const current = shut
        ? 0
        : (angles.current[i] ?? rest(p.def, doorAjar, storyRest(story[p.def.id])))
      // A heavy leaf: pushed open, it swings and settles with a small overshoot; it
      // falls shut a little faster. Hinge sounds follow the movement.
      let speed = speeds.current[i] ?? 0
      const stiffness = target > current ? 14 : 22
      speed += ((target - current) * stiffness - speed * 6.5) * delta
      const next = Math.max(0, current + speed * delta)
      speeds.current[i] = next === 0 ? 0 : speed
      angles.current[i] = next
      pivot.rotation.y = p.base + p.sign * next
      if (p.def.id in desktopRuntime.entrances) desktopRuntime.entrances[p.def.id] = next > 0.02
      const hinge: [number, number, number] = [p.hinge.x, 1.0, p.hinge.z]
      const wasOpening = opening.current[i] ?? false
      if (target > current + 0.5 && !wasOpening) {
        opening.current[i] = true
        audio.play('door_open', hinge)
      } else if (target < current - 0.5 && wasOpening) {
        opening.current[i] = false
      } else if (!wasOpening && current > 0.12 && next <= 0.12 && target < 0.1) {
        audio.play('door_close', hinge)
      }
    })
  })
  return (
    <group name="doors">
      {placed.map((p, i) => (
        <group
          key={p.def.id}
          ref={(g) => {
            pivots.current[i] = g
          }}
          position={[
            p.hinge.x,
            p.opening.bottom + (p.def.kind === 'entrance' ? DOOR_GAP : 0),
            p.hinge.z,
          ]}
          rotation-y={p.base + p.sign * rest(p.def, doorAjar, storyRest(story[p.def.id]))}
        >
          <Leaf p={p} surfaces={surfaces} frosted={frosted} />
        </group>
      ))}
    </group>
  )
}

const NO_DOORS = new Set<string>()
