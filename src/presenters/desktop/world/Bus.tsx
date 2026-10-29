import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { primeUpload } from './prime'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { BUS, GROUND_Y } from '@/content/world/exterior'
import { softwareMaterial } from './softwareMaterial'

/**
 * Ending B's early bus (BEATS ending B #4–7): an old city bus idling by the kerb with its
 * front door open and its tired light on, empty seats in rows. Once it moves, streetlamps
 * slide past the dark windows; the window by the seat is a real mirror where the GPU
 * allows, so the player sees their own reflection, and for a moment who sits at the back.
 */
const LENGTH = BUS.x1 - BUS.x0
const WIDTH = BUS.z1 - BUS.z0
const HEIGHT = 2.9
const BELT = 0.95
const WINDOW_TOP = 2.35

export function Bus({ moving, detailed }: { moving: boolean; detailed: boolean }) {
  const parts = useMemo(() => {
    const mat = (m: THREE.MeshStandardMaterial) => (detailed ? m : softwareMaterial(m))
    const paint = mat(new THREE.MeshStandardMaterial({ color: '#c9b46a', roughness: 0.6 }))
    const dirty = mat(new THREE.MeshStandardMaterial({ color: '#4b4a43', roughness: 0.9 }))
    const inside = mat(new THREE.MeshStandardMaterial({ color: '#8a8676', roughness: 0.85 }))
    const seat = mat(new THREE.MeshStandardMaterial({ color: '#5a2b26', roughness: 0.8 }))
    const glass = new THREE.MeshBasicMaterial({
      color: '#0d1116',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    const lamp = new THREE.MeshBasicMaterial({ color: '#f3ecd2', toneMapped: false })
    const passing = new THREE.MeshBasicMaterial({ color: '#ff9a3d', toneMapped: false })
    return { paint, dirty, inside, seat, glass, lamp, passing }
  }, [detailed])
  useEffect(() => () => Object.values(parts).forEach((m) => m.dispose()), [parts])
  const boxes = useMemo(() => {
    const cx = (BUS.x0 + BUS.x1) / 2
    const cz = (BUS.z0 + BUS.z1) / 2
    const list: {
      size: [number, number, number]
      at: [number, number, number]
      m: keyof typeof parts
    }[] = []
    const y = BUS.floor
    // Floor, roof, the two ends.
    list.push({ size: [LENGTH, 0.12, WIDTH], at: [cx, y - 0.06, cz], m: 'dirty' })
    list.push({ size: [LENGTH, 0.14, WIDTH], at: [cx, y + HEIGHT - 0.4, cz], m: 'paint' })
    for (const x of [BUS.x0, BUS.x1])
      list.push({
        size: [0.08, HEIGHT - 0.4, WIDTH],
        at: [x, y + (HEIGHT - 0.4) / 2, cz],
        m: 'paint',
      })
    // Sides: a belt below the windows, a band above, pillars between; the door on the yard side.
    for (const z of [BUS.z0, BUS.z1]) {
      const yard = z === BUS.z1
      const belt = (x0: number, x1: number) =>
        list.push({ size: [x1 - x0, BELT, 0.06], at: [(x0 + x1) / 2, y + BELT / 2, z], m: 'paint' })
      if (yard) {
        belt(BUS.x0, BUS.door.x0)
        belt(BUS.door.x1, BUS.x1)
      } else belt(BUS.x0, BUS.x1)
      list.push({
        size: [LENGTH, HEIGHT - 0.4 - WINDOW_TOP, 0.06],
        at: [cx, y + WINDOW_TOP + (HEIGHT - 0.4 - WINDOW_TOP) / 2, z],
        m: 'paint',
      })
      for (let x = BUS.x0; x <= BUS.x1 + 0.01; x += 1.5) {
        if (yard && x > BUS.door.x0 - 0.05 && x < BUS.door.x1 + 0.05) continue
        list.push({
          size: [0.1, WINDOW_TOP - BELT, 0.07],
          at: [x, y + (WINDOW_TOP + BELT) / 2, z],
          m: 'paint',
        })
      }
    }
    // Rows of seats along the far side, facing the front.
    for (let x = BUS.x0 + 0.8; x < BUS.door.x0 - 0.6; x += 0.85) {
      list.push({ size: [0.45, 0.45, 0.9], at: [x, y + 0.45, BUS.z0 + 0.55], m: 'seat' })
      list.push({ size: [0.08, 0.55, 0.9], at: [x - 0.24, y + 0.9, BUS.z0 + 0.55], m: 'seat' })
      list.push({ size: [0.45, 0.45, 0.9], at: [x, y + 0.45, BUS.z1 - 0.55], m: 'seat' })
      list.push({ size: [0.08, 0.55, 0.9], at: [x - 0.24, y + 0.9, BUS.z1 - 0.55], m: 'seat' })
    }
    // A rail along the ceiling.
    list.push({ size: [LENGTH - 0.6, 0.04, 0.04], at: [cx, y + 2.05, cz], m: 'inside' })
    return list.map((b) => ({ ...b, geometry: new THREE.BoxGeometry(...b.size) }))
  }, [])
  useEffect(() => () => boxes.forEach((b) => b.geometry.dispose()), [boxes])
  const windowFar = useMemo(() => {
    const width = 1.4
    const height = WINDOW_TOP - BELT - 0.05
    if (!detailed) return null
    return new Reflector(new THREE.PlaneGeometry(width, height), {
      textureWidth: 512,
      textureHeight: 384,
      color: new THREE.Color('#5b6166'),
      clipBias: 0.003,
    })
  }, [detailed])
  useEffect(() => () => windowFar?.dispose(), [windowFar])
  const lights = useRef<THREE.Group>(null)
  const root = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    if (root.current) primeUpload(gl, root.current)
  }, [gl, boxes, windowFar])
  useFrame((_, delta) => {
    const group = lights.current
    if (!group) return
    group.visible = moving
    if (!moving) return
    // Streetlamps slide past outside, front to back, on and on.
    for (const lamp of group.children) {
      lamp.position.x -= delta * 7
      if (lamp.position.x < BUS.x0 - 6) lamp.position.x += LENGTH + 12
    }
  })
  const seatX = 2.4
  return (
    <group name="bus" ref={root}>
      {boxes.map((b, i) => (
        <mesh key={i} geometry={b.geometry} material={parts[b.m]} position={b.at} castShadow />
      ))}
      {/* Glass along both sides (the far window by the seat is a mirror on the GPU). */}
      {[BUS.z0, BUS.z1].map((z) => (
        <mesh
          key={z}
          position={[(BUS.x0 + BUS.x1) / 2, BUS.floor + (BELT + WINDOW_TOP) / 2, z]}
          material={parts.glass}
        >
          <planeGeometry args={[LENGTH, WINDOW_TOP - BELT]} />
        </mesh>
      ))}
      {windowFar && (
        <primitive
          object={windowFar}
          position={[seatX, BUS.floor + (BELT + WINDOW_TOP) / 2, BUS.z0 + 0.045]}
        />
      )}
      {/* Tired ceiling lamps, and the light they give. */}
      {[-2.5, 1, 4.5].map((x) => (
        <mesh
          key={x}
          position={[x, BUS.floor + HEIGHT - 0.48, (BUS.z0 + BUS.z1) / 2]}
          material={parts.lamp}
        >
          <boxGeometry args={[0.6, 0.03, 0.12]} />
        </mesh>
      ))}
      <pointLight
        position={[0.5, BUS.floor + 2.2, (BUS.z0 + BUS.z1) / 2]}
        color="#efe6c8"
        intensity={6}
        distance={9}
        decay={1.6}
      />
      <group ref={lights}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[BUS.x0 + i * 4.5, GROUND_Y + 4.2, BUS.z0 - 3.5]}
            material={parts.passing}
          >
            <sphereGeometry args={[0.16, 10, 8]} />
          </mesh>
        ))}
      </group>
      {/* The open door's light on the snow. */}
      <pointLight
        position={[(BUS.door.x0 + BUS.door.x1) / 2, BUS.floor + 1.6, BUS.z1 + 0.6]}
        color="#efe6c8"
        intensity={3}
        distance={6}
        decay={2}
      />
    </group>
  )
}
