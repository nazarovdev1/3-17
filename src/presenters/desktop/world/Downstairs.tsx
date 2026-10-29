import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Surface } from '@/content/world/layout'
import {
  BREAD_SILL,
  DOOR43,
  FLIGHT,
  HALF_LANDING_Y,
  LANDING3_Y,
  STOREY,
} from '@/content/world/stairwell'
import { objectPoint } from '@/content/world/objects'
import { metricBox, metricPlane, type SurfaceMaterials } from './materials'
import { numberPlate } from './Doors'
import { softwareMaterial } from './softwareMaterial'
import type { Models } from './Furniture'

/**
 * The stairwell under the 4th floor (stairwell.ts): both flights down to the half-landing
 * and on to the 3rd floor, its landing with four doors and the dead lift, a window over
 * each half-landing, and the next flight down, blocked by somebody's moving boxes.
 * Muhabbat opa opens 43 on its chain (night 2's day); a bag of bread waits on the sill.
 */
const Y3 = LANDING3_Y
/** Height of the oil-paint dado on stairwell walls. */
const DADO = 1.5
const TOP = -0.2
/** The shaft walls go down past the next half-landing; below that it is dark. */
const SHAFT_BOTTOM = Y3 - STOREY / 2 - 0.4

interface Box {
  position: [number, number, number]
  size: [number, number, number]
  surface: Surface
}

/** A wall from y0 to y1 with the dado split: paint below, whitewash above. */
function wallBox(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y0: number,
  y1: number,
  floor: number,
): Box[] {
  const out: Box[] = []
  const split = Math.min(y1, Math.max(y0, floor + DADO))
  const part = (a: number, b: number, surface: Surface) => {
    if (b - a < 0.001) return
    out.push({
      position: [(x0 + x1) / 2, (a + b) / 2, (z0 + z1) / 2],
      size: [x1 - x0, b - a, z1 - z0],
      surface,
    })
  }
  part(y0, split, 'stairwell')
  part(split, y1, 'whitewash')
  return out
}

/** A wall along x (constant z) with door holes [centre, width, height]. */
function wallAlongX(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  holes: [number, number, number][],
): Box[] {
  const out: Box[] = []
  let from = x0
  for (const [at, width, height] of [...holes].sort((a, b) => a[0] - b[0])) {
    out.push(...wallBox(from, at - width / 2, z0, z1, Y3, TOP, Y3))
    out.push(...wallBox(at - width / 2, at + width / 2, z0, z1, Y3 + height, TOP, Y3))
    from = at + width / 2
  }
  out.push(...wallBox(from, x1, z0, z1, Y3, TOP, Y3))
  return out
}

function wallAlongZ(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y0: number,
  y1: number,
  holes: [number, number, number][],
): Box[] {
  const out: Box[] = []
  let from = z0
  for (const [at, width, height] of holes) {
    out.push(...wallBox(x0, x1, from, at - width / 2, y0, y1, Y3))
    out.push(...wallBox(x0, x1, at - width / 2, at + width / 2, Y3 + height, y1, Y3))
    out.push(...wallBox(x0, x1, at - width / 2, at + width / 2, y0, Y3, Y3))
    from = at + width / 2
  }
  out.push(...wallBox(x0, x1, from, z1, y0, y1, Y3))
  return out
}

/** Where the stair windows sit in the outer wall (y ranges, one per half-landing). */
const WINDOWS: [number, number][] = [
  [HALF_LANDING_Y + 0.35, HALF_LANDING_Y + 1.35],
  [Y3 - STOREY / 2 + 0.35, Y3 - STOREY / 2 + 1.35],
]
const WINDOW_X: [number, number] = [0.7, 1.9]

function shellBoxes(): Box[] {
  const boxes: Box[] = []
  // Back wall of the landing: 44 (under 48) and 43 (under 47).
  boxes.push(
    ...wallAlongX(-6.4, 3.0, 4.6, 4.78, [
      [-4.18, 0.9, 2.05],
      [DOOR43.x, DOOR43.width, 2.05],
    ]),
  )
  // West: 45, under 46. East: 42, under 49; the same wall goes on down the shaft.
  boxes.push(...wallAlongZ(-6.58, -6.4, 4.78, 7.38, Y3, TOP, [[6.0, 0.9, 2.05]]))
  boxes.push(...wallAlongZ(3.0, 3.18, 4.78, 7.38, Y3, TOP, [[6.0, 0.9, 2.05]]))
  boxes.push(...wallBox(3.0, 3.18, 7.38, 10.18, SHAFT_BOTTOM, 0, Y3))
  boxes.push(...wallBox(3.0, 3.18, 4.78, 7.38, SHAFT_BOTTOM, Y3, Y3))
  // South: the lift shaft wall, with the lift's doors.
  boxes.push(...wallAlongX(-6.4, 0.2, 7.2, 7.38, [[-2.6, 1.0, 2.0]]))
  // The shaft's inner wall beside the flights.
  boxes.push(...wallBox(0.02, 0.2, 7.2, 10.18, SHAFT_BOTTOM, 0, Y3))
  // Outer wall with a window over each half-landing.
  const [wx0, wx1] = WINDOW_X
  let y = SHAFT_BOTTOM
  for (const [w0, w1] of [...WINDOWS].reverse()) {
    boxes.push(...wallBox(0.2, 3.0, 10.0, 10.3, y, w0, Y3))
    boxes.push(...wallBox(0.2, wx0, 10.0, 10.3, w0, w1, Y3))
    boxes.push(...wallBox(wx1, 3.0, 10.0, 10.3, w0, w1, Y3))
    y = w1
  }
  boxes.push(...wallBox(0.2, 3.0, 10.0, 10.3, y, 0, Y3))
  // Window sills (concrete, deep enough for a bag of bread).
  for (const [w0] of WINDOWS)
    boxes.push({ position: [1.3, w0 - 0.03, 9.9], size: [1.3, 0.06, 0.24], surface: 'concrete' })
  // Half-landings, and the 3rd floor's slab under the shaft at the head of the next flight.
  const half = FLIGHT.top + FLIGHT.risers * FLIGHT.run
  for (const level of [HALF_LANDING_Y, Y3 - STOREY / 2])
    boxes.push({
      position: [1.6, level - 0.1, (half + 10.0) / 2],
      size: [2.8, 0.2, 10.0 - half],
      surface: 'concrete',
    })
  boxes.push({
    position: [2.3, Y3 - 0.1, (7.2 + FLIGHT.top) / 2 + 0.2],
    size: [1.4, 0.2, FLIGHT.top - 7.2 + 0.4],
    surface: 'concrete',
  })
  // Treads: flight A and C go down beside the inner wall, flight B (and D) back up.
  const { rise, run, risers, top } = FLIGHT
  for (const [x, start] of [
    [0.88, 0],
    [0.88, Y3],
  ] as const) {
    for (let i = 0; i < risers; i++) {
      const tread = start - rise * (i + 1)
      boxes.push({
        position: [x, tread - 0.11, top + run * i + run / 2],
        size: [1.3, 0.22, run],
        surface: 'concrete',
      })
    }
  }
  for (const start of [HALF_LANDING_Y, Y3 - STOREY / 2]) {
    for (let i = 0; i < risers; i++) {
      const tread = start - rise * (i + 1)
      boxes.push({
        position: [2.33, tread - 0.11, half - run * i - run / 2],
        size: [1.3, 0.22, run],
        surface: 'concrete',
      })
    }
  }
  return boxes
}

function mergeBySurface(boxes: Box[]) {
  const batches = new Map<Surface, THREE.BufferGeometry[]>()
  for (const box of boxes) {
    const geometry = metricBox(...box.size).toNonIndexed()
    geometry.clearGroups()
    geometry.translate(...box.position)
    const list = batches.get(box.surface) ?? []
    list.push(geometry)
    batches.set(box.surface, list)
  }
  // The 3rd-floor landing's floor and ceiling, and darkness at the bottom of the shaft.
  const plane = (w: number, d: number, x: number, y: number, z: number, up: boolean) => {
    const g = metricPlane(w, d).toNonIndexed()
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2).translate(x, y, z)
    return g
  }
  batches.get('concrete')?.push(plane(9.4, 2.42, -1.7, Y3, 5.99, true))
  batches.get('whitewash')?.push(plane(9.4, 2.42, -1.7, TOP - 0.005, 5.99, false))
  return [...batches].map(([surface, parts]) => {
    const geometry = mergeGeometries(parts, false)
    parts.forEach((p) => p.dispose())
    return { surface, geometry }
  })
}

/** Steel handrails: between the flights, and across the 4th-floor landing over the shaft. */
const FLIGHT_RUN = FLIGHT.risers * FLIGHT.run
const RAILS: {
  position: [number, number, number]
  tilt: number
  length: number
  yaw?: number
}[] = [
  {
    position: [1.6, 0.9 - STOREY / 4, FLIGHT.top + FLIGHT_RUN / 2],
    tilt: Math.atan2(STOREY / 2, FLIGHT_RUN),
    length: Math.hypot(STOREY / 2, FLIGHT_RUN),
  },
  {
    position: [1.6, HALF_LANDING_Y + 0.9 - STOREY / 4, FLIGHT.top + FLIGHT_RUN / 2],
    tilt: -Math.atan2(STOREY / 2, FLIGHT_RUN),
    length: Math.hypot(STOREY / 2, FLIGHT_RUN),
  },
  { position: [2.3, 0.9, 7.22], tilt: 0, length: 1.4, yaw: Math.PI / 2 },
]

/** Closed leaves of the other flats and the lift, with their number plates. */
const LEAVES: { position: [number, number, number]; yaw: number; label: string; lift?: boolean }[] =
  [
    { position: [-4.18, Y3 + 1.02, 4.7], yaw: 0, label: '44' },
    { position: [-6.47, Y3 + 1.02, 6.0], yaw: Math.PI / 2, label: '45' },
    { position: [3.07, Y3 + 1.02, 6.0], yaw: -Math.PI / 2, label: '42' },
    { position: [-2.6, Y3 + 1.0, 7.26], yaw: Math.PI, label: '3', lift: true },
  ]

/** Muhabbat opa's chain gap: a warm lit hallway, her flowered scarf and one eye. */
function scarfTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 256
  const c = canvas.getContext('2d')!
  c.fillStyle = '#3b1f1c'
  c.fillRect(0, 0, 64, 256)
  for (let i = 0; i < 26; i++) {
    c.fillStyle = i % 3 ? 'rgba(168, 112, 64, 0.55)' : 'rgba(120, 140, 90, 0.5)'
    c.beginPath()
    c.arc((i * 23) % 64, (i * 47) % 256, 4 + (i % 3) * 2, 0, Math.PI * 2)
    c.fill()
  }
  // The face in the gap: a warm cheek in shadow and one dark, wet eye.
  const face = c.createLinearGradient(0, 120, 0, 220)
  face.addColorStop(0, '#8a6450')
  face.addColorStop(1, '#4a3328')
  c.fillStyle = face
  c.fillRect(18, 118, 46, 110)
  c.fillStyle = '#e7dccb'
  c.beginPath()
  c.ellipse(40, 150, 11, 5, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#20150f'
  c.beginPath()
  c.arc(38, 150, 4.5, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = 'rgba(255,255,255,0.8)'
  c.fillRect(36, 147, 2, 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function Downstairs({
  surfaces,
  models,
  daylight,
  muhabbat,
  bread,
  halva,
  detailed,
}: {
  surfaces: SurfaceMaterials
  models: Models
  daylight: boolean
  /** 'closed' (default), 'chain' (open on its chain, talking), 'gone' (shut, no light). */
  muhabbat: string
  /** The bag of bread on the half-landing sill until taken. */
  bread: boolean
  /** Where the plate of halva is: in her hand at 43, on 47's threshold, or gone. */
  halva: string
  detailed: boolean
}) {
  const shell = useMemo(() => mergeBySurface(shellBoxes()), [])
  useEffect(() => () => shell.forEach(({ geometry }) => geometry.dispose()), [shell])
  const props = useMemo(() => {
    const mat = (m: THREE.MeshStandardMaterial) => (detailed ? m : softwareMaterial(m))
    const leather = mat(new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.7 }))
    const steel = mat(
      new THREE.MeshStandardMaterial({ color: '#4d5250', roughness: 0.5, metalness: 0.8 }),
    )
    const chain = mat(
      new THREE.MeshStandardMaterial({ color: '#8a8a84', roughness: 0.4, metalness: 0.9 }),
    )
    const paperBag = mat(new THREE.MeshStandardMaterial({ color: '#b08a5a', roughness: 0.95 }))
    const loaf = mat(new THREE.MeshStandardMaterial({ color: '#9b6a34', roughness: 0.8 }))
    const plate = mat(new THREE.MeshStandardMaterial({ color: '#e8e2d6', roughness: 0.35 }))
    const halvaMat = mat(new THREE.MeshStandardMaterial({ color: '#c49a62', roughness: 0.9 }))
    const skin = mat(new THREE.MeshStandardMaterial({ color: '#8a6450', roughness: 0.7 }))
    const sleeve = mat(new THREE.MeshStandardMaterial({ color: '#5a2e36', roughness: 1 }))
    const glass = new THREE.MeshStandardMaterial({
      color: '#9fb0b8',
      roughness: 0.1,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
    // Grey sky behind each stair window: bright by day, a dim orange city glow by night.
    const sky = new THREE.MeshBasicMaterial({ color: '#c9d2dc' })
    const warm = new THREE.MeshBasicMaterial({ color: '#f2c98d' })
    const scarf = new THREE.MeshBasicMaterial({ map: scarfTexture(), color: '#b9a597' })
    const plates = new Map(
      LEAVES.map((l) => [
        l.label,
        new THREE.MeshStandardMaterial({ map: numberPlate(l.label), roughness: 0.7 }),
      ]),
    )
    plates.set('43', new THREE.MeshStandardMaterial({ map: numberPlate('43'), roughness: 0.7 }))
    return {
      leather,
      steel,
      chain,
      paperBag,
      loaf,
      plate,
      halvaMat,
      skin,
      sleeve,
      glass,
      sky,
      warm,
      scarf,
      plates,
      leaf: new THREE.BoxGeometry(0.89, 2.04, 0.06),
      liftLeaf: new THREE.BoxGeometry(0.99, 1.99, 0.04),
      plateBox: new THREE.BoxGeometry(0.18, 0.09, 0.07),
      pane: new THREE.PlaneGeometry(WINDOW_X[1] - WINDOW_X[0], 1.0),
      bag: new THREE.BoxGeometry(0.22, 0.3, 0.14),
      bun: new THREE.SphereGeometry(0.07, 12, 8),
      dish: new THREE.CylinderGeometry(0.11, 0.08, 0.02, 20),
      lump: new THREE.BoxGeometry(0.05, 0.035, 0.05),
      hand: new THREE.SphereGeometry(0.04, 12, 8),
      arm: new THREE.CylinderGeometry(0.045, 0.05, 0.3, 12),
      link: new THREE.TorusGeometry(0.008, 0.0018, 4, 8),
      slit: new THREE.PlaneGeometry(0.11, 2.0),
      rail: new THREE.BoxGeometry(0.045, 0.045, 1),
    }
  }, [detailed])
  useEffect(
    () => () => {
      for (const value of Object.values(props)) {
        if (value instanceof THREE.BufferGeometry) value.dispose()
        else if (value instanceof THREE.Material) value.dispose()
      }
      props.plates.forEach((m) => m.dispose())
      props.scarf.map?.dispose()
    },
    [props],
  )
  const boxes = useMemo(() => {
    const model = models.get('cardboard_box_01')
    if (!model) return []
    // Somebody's move, stacked across the head of the flight down: nobody passes.
    const spots: [number, number, number, number][] = [
      [0.5, 0, 7.0, 0.2],
      [0.95, 0, 7.05, -0.15],
      [1.35, 0, 6.95, 0.35],
      [0.7, 0.34, 7.02, -0.3],
      [1.15, 0.34, 7.0, 0.1],
      [0.9, 0.68, 7.0, 0.5],
    ]
    return spots.map(([x, y, z, yaw]) => {
      const copy = model.scene.clone(true)
      const bounds = new THREE.Box3().setFromObject(copy)
      const size = bounds.getSize(new THREE.Vector3())
      copy.scale.setScalar(0.42 / Math.max(size.x, size.z))
      copy.position.set(x, Y3 + y, z)
      copy.rotation.y = yaw
      return copy
    })
  }, [models])
  const door = useRef<THREE.Group>(null)
  const glow = useRef<THREE.PointLight>(null)
  const day = useRef<THREE.PointLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  const open = useRef(0)
  useFrame(({ clock }, delta) => {
    const chain = muhabbat === 'chain'
    // On the chain the leaf swings a hand's width and stops with a jerk.
    open.current += ((chain ? 0.2 : 0) - open.current) * Math.min(1, delta * 6)
    if (door.current) door.current.rotation.y = open.current
    if (glow.current) glow.current.intensity = chain ? 2.2 : muhabbat === 'gone' ? 0 : 0.15
    if (day.current) day.current.intensity = daylight ? 9 : 0.4
    if (fill.current) fill.current.intensity = daylight ? 5 : 0.2
    props.sky.color.set(daylight ? '#c9d2dc' : '#2a2018')
    const hand = handRef.current
    if (hand) {
      hand.visible = chain && halva === 'hand'
      hand.position.y = Y3 + 1.08 + Math.sin(clock.elapsedTime * 1.3) * 0.004
    }
    if (scarfRef.current) scarfRef.current.visible = chain
  })
  const handRef = useRef<THREE.Group>(null)
  const scarfRef = useRef<THREE.Mesh>(null)
  const sill = WINDOWS[0]![0]
  const threshold = objectPoint('halva_47')!
  return (
    <group name="downstairs">
      {shell.map(({ surface, geometry }) => (
        <mesh
          key={surface}
          geometry={geometry}
          material={surfaces[surface]}
          castShadow
          receiveShadow
        />
      ))}
      {WINDOWS.map(([w0, w1]) => (
        <group key={w0}>
          <mesh
            geometry={props.pane}
            material={props.sky}
            position={[(WINDOW_X[0] + WINDOW_X[1]) / 2, (w0 + w1) / 2, 10.28]}
            rotation-y={Math.PI}
          />
          <mesh
            geometry={props.pane}
            material={props.glass}
            position={[(WINDOW_X[0] + WINDOW_X[1]) / 2, (w0 + w1) / 2, 10.12]}
            rotation-y={Math.PI}
          />
        </group>
      ))}
      {LEAVES.map((l) => (
        <group key={l.label} position={l.position} rotation-y={l.yaw}>
          <mesh
            geometry={l.lift ? props.liftLeaf : props.leaf}
            material={l.lift ? props.steel : props.leather}
          />
          <mesh
            geometry={props.plateBox}
            material={props.plates.get(l.label)}
            position={[0, l.lift ? 1.12 : 0.8, 0]}
          />
        </group>
      ))}
      {/* 43: hinged at its west side, opening toward the landing. */}
      <group position={[DOOR43.x - DOOR43.width / 2, Y3 + 1.02, DOOR43.z + 0.01]}>
        <group ref={door}>
          <mesh geometry={props.leaf} material={props.leather} position={[0.445, 0, 0]} />
          <mesh
            geometry={props.plateBox}
            material={props.plates.get('43')}
            position={[0.445, 0.8, 0]}
          />
        </group>
      </group>
      {/* The lit hallway behind the gap, her scarf and one eye, the chain across. */}
      <mesh
        geometry={props.slit}
        material={props.warm}
        position={[DOOR43.x + DOOR43.width / 2 - 0.08, Y3 + 1.02, DOOR43.z - 0.12]}
      />
      <mesh
        ref={scarfRef}
        geometry={props.slit}
        material={props.scarf}
        scale={[0.6, 0.32, 1]}
        position={[DOOR43.x + DOOR43.width / 2 - 0.1, Y3 + 1.56, DOOR43.z - 0.06]}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          geometry={props.link}
          material={props.chain}
          visible={muhabbat === 'chain'}
          position={[
            DOOR43.x + 0.3 + i * 0.016,
            Y3 + 1.45 - Math.sin((i / 6) * Math.PI) * 0.01,
            DOOR43.z + 0.12,
          ]}
          rotation-y={i % 2 ? Math.PI / 2 : 0}
        />
      ))}
      <group ref={handRef} position={[DOOR43.x + 0.36, Y3 + 1.08, DOOR43.z + 0.2]}>
        <mesh
          geometry={props.arm}
          material={props.sleeve}
          position={[0, -0.02, -0.16]}
          rotation-x={Math.PI / 2}
        />
        <mesh geometry={props.hand} material={props.skin} scale={[1.1, 0.6, 1.3]} />
        <mesh geometry={props.dish} material={props.plate} position={[0, 0.03, 0.08]} />
        {[-0.03, 0.03, 0].map((dx, i) => (
          <mesh
            key={i}
            geometry={props.lump}
            material={props.halvaMat}
            position={[dx, 0.055, 0.08 + (i === 2 ? 0.04 : 0)]}
          />
        ))}
      </group>
      {halva === 'threshold' && (
        <group position={[threshold[0], 0.01, threshold[2]]}>
          <mesh geometry={props.dish} material={props.plate} />
          {[-0.03, 0.03, 0].map((dx, i) => (
            <mesh
              key={i}
              geometry={props.lump}
              material={props.halvaMat}
              position={[dx, 0.025, i === 2 ? 0.04 : 0]}
            />
          ))}
        </group>
      )}
      {bread && (
        <group position={[BREAD_SILL[0], sill + 0.15, BREAD_SILL[2]]} rotation-y={0.3}>
          <mesh geometry={props.bag} material={props.paperBag} castShadow />
          <mesh
            geometry={props.bun}
            material={props.loaf}
            position={[0, 0.17, 0]}
            scale={[1.3, 0.7, 1]}
          />
        </group>
      )}
      {RAILS.map((rail, i) => (
        <mesh
          key={`rail${i}`}
          geometry={props.rail}
          material={props.steel}
          position={rail.position}
          rotation={[rail.tilt, rail.yaw ?? 0, 0, 'YXZ']}
          scale={[1, 1, rail.length]}
        />
      ))}
      {boxes.map((box, i) => (
        <primitive key={i} object={box} />
      ))}
      <pointLight
        ref={glow}
        color="#f2c98d"
        distance={4}
        decay={2}
        position={[DOOR43.x + 0.3, Y3 + 1.4, DOOR43.z + 0.25]}
      />
      <pointLight
        ref={fill}
        color="#b9c3cf"
        distance={8}
        decay={1.4}
        position={[0.3, Y3 + 2.3, 6.2]}
      />
      <pointLight
        ref={day}
        color="#c7d0dc"
        distance={9}
        decay={1.6}
        position={[1.6, HALF_LANDING_Y + 1.0, 9.6]}
      />
    </group>
  )
}
