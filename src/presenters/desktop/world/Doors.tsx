import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD, type DoorDef, type Opening, type Wall } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { metricBox, type SurfaceMaterials } from './materials'
import { splitWall } from './stretch'

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

function rest(def: DoorDef, doorAjar: boolean): number {
  if (def.id === 'front_door48') return doorAjar ? 0.36 : 0
  if (def.kind === 'entrance' || def.kind === 'metal' || def.kind === 'lift') return 0
  if (def.kind === 'balcony' || def.kind === 'closet') return 0
  if (def.id.startsWith('bath_door')) return 0.22
  if (def.id.startsWith('kitchen_door')) return 1.1
  return 1.45
}

function Leaf({ p, surfaces }: { p: Placed; surfaces: SurfaceMaterials }) {
  const { def, opening } = p
  const parts = useMemo(() => {
    const width = opening.width - 0.01
    const height = opening.top - opening.bottom - 0.01
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
    // Kitchen door: ribbed frosted glass (shapes behind it blur to shadows). Balcony: clear.
    const frosted = new THREE.MeshStandardMaterial({
      color: def.kind === 'balcony' ? '#1c2228' : '#7f8885',
      roughness: def.kind === 'balcony' ? 0.05 : 0.85,
      metalness: def.kind === 'balcony' ? 0.6 : 0,
      transparent: true,
      opacity: def.kind === 'balcony' ? 0.18 : 0.62,
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
        material: frosted,
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
    return list
  }, [def.kind, opening, surfaces])
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
}: {
  surfaces: SurfaceMaterials
  extension: number
  doorAjar: boolean
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
  useFrame(() => {
    const [px, , pz] = desktopRuntime.position
    placed.forEach((p, i) => {
      const pivot = pivots.current[i]
      if (!pivot) return
      const centre = p.hinge.clone()
      const near = Math.hypot(px! - centre.x, pz! - centre.z) < 1.6
      const opensForPlayer =
        p.def.kind !== 'metal' && p.def.kind !== 'lift' && p.def.id !== 'balcony_door'
      const target = near && opensForPlayer ? 1.4 : rest(p.def, doorAjar)
      const current = angles.current[i] ?? rest(p.def, doorAjar)
      const next = current + (target - current) * 0.1
      angles.current[i] = next
      pivot.rotation.y = p.base + p.sign * next
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
          position={[p.hinge.x, p.opening.bottom, p.hinge.z]}
          rotation-y={p.base + p.sign * rest(p.def, doorAjar)}
        >
          <Leaf p={p} surfaces={surfaces} />
        </group>
      ))}
    </group>
  )
}
