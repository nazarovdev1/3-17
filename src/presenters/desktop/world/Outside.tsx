import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { metricBox, metricPlane, type SurfaceMaterials } from './materials'

/**
 * What the windows show: the nine-storey block across the courtyard with a few lit
 * windows that go dark one by one after 3:17, the snowy yard four floors down, the
 * streetlamp, falling snow, and the rest of our own building's façade around the flat.
 */
const GROUND_Y = -8.6
const OPPOSITE_Z = -24

export function Outside({
  surfaces,
  windowsDark,
}: {
  surfaces: SurfaceMaterials
  windowsDark: boolean
}) {
  const panes = useRef<THREE.InstancedMesh>(null)
  const snow = useRef<THREE.Points>(null)
  const darkSince = useRef<number | null>(null)
  const lastDark = useRef(-1)

  const shell = useMemo(
    () => ({
      opposite: metricBox(46, 28, 1),
      ground: metricPlane(80, 60),
      // Our façade above and below the 4th floor, and its end wall.
      facadeBelow: metricBox(11, Math.abs(GROUND_Y), 0.3),
      facadeAbove: metricBox(11, 17, 0.3),
      endBelow: metricBox(0.3, Math.abs(GROUND_Y), 8.4),
      endAbove: metricBox(0.3, 17, 8.4),
      pole: new THREE.CylinderGeometry(0.06, 0.08, 6, 12),
    }),
    [],
  )

  // Window grid of the block opposite: 9 floors × 14 windows.
  const PANES = 9 * 14
  const lit = useMemo(() => {
    const list: number[] = []
    for (let i = 0; i < PANES; i++) if ((i * 37) % 11 === 0) list.push(i)
    return list
  }, [PANES])
  useLayoutEffect(() => {
    const mesh = panes.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    for (let floor = 0; floor < 9; floor++) {
      for (let col = 0; col < 14; col++) {
        dummy.position.set(-19 + col * 2.9, GROUND_Y + 1.6 + floor * 2.8, OPPOSITE_Z + 0.52)
        dummy.scale.set(1.3, 1.35, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(floor * 14 + col, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  const flakes = useMemo(() => {
    const count = 1400
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = ((i * 7.13) % 24) - 14
      positions[i * 3 + 1] = GROUND_Y + ((i * 3.17) % 22)
      positions[i * 3 + 2] = -4.5 - ((i * 1.37) % 18)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  useFrame(({ clock }) => {
    if (snow.current) snow.current.position.y = -((clock.elapsedTime * 0.45) % 22) + 11
    const mesh = panes.current
    if (!mesh) return
    if (windowsDark && darkSince.current === null) darkSince.current = clock.elapsedTime
    if (!windowsDark) darkSince.current = null
    const dark =
      darkSince.current === null ? 0 : Math.floor((clock.elapsedTime - darkSince.current) * 1.4)
    if (dark === lastDark.current) return
    lastDark.current = dark
    const warm = new THREE.Color('#c48a48')
    const off = new THREE.Color('#0b1018')
    let on = 0
    for (let i = 0; i < PANES; i++) {
      const rank = lit.indexOf(i)
      const isOn = rank >= dark && rank >= 0
      mesh.setColorAt(i, isOn ? warm : off)
      if (isOn) on++
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    desktopRuntime.windowsLit = on
  })

  return (
    <group name="outside">
      <color attach="background" args={['#05070b']} />
      <fogExp2 attach="fog" args={['#0a0e15', 0.018]} />
      <mesh
        position={[0, GROUND_Y + 14 - 0.2, OPPOSITE_Z]}
        geometry={shell.opposite}
        material={surfaces.concrete}
      />
      <instancedMesh ref={panes} args={[undefined, undefined, PANES]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh
        position={[0, GROUND_Y, -12]}
        rotation-x={-Math.PI / 2}
        geometry={shell.ground}
        receiveShadow
      >
        <meshStandardMaterial color="#c9ced6" roughness={0.95} />
      </mesh>
      <mesh
        position={[-2.05, GROUND_Y / 2, -3.75]}
        geometry={shell.facadeBelow}
        material={surfaces.concrete}
      />
      <mesh
        position={[-2.05, 2.6 + 8.5, -3.75]}
        geometry={shell.facadeAbove}
        material={surfaces.concrete}
      />
      <mesh
        position={[3.45, GROUND_Y / 2, 0.6]}
        geometry={shell.endBelow}
        material={surfaces.concrete}
      />
      <mesh
        position={[3.45, 2.6 + 8.5, 0.6]}
        geometry={shell.endAbove}
        material={surfaces.concrete}
      />
      <mesh position={[4.5, GROUND_Y + 3, -16]} geometry={shell.pole}>
        <meshStandardMaterial color="#2c2f31" roughness={0.6} metalness={0.6} />
      </mesh>
      <mesh position={[4.5, GROUND_Y + 6.05, -16]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color="#d9853a" />
      </mesh>
      <points ref={snow} geometry={flakes}>
        <pointsMaterial color="#c8d0da" size={0.045} transparent opacity={0.7} depthWrite={false} />
      </points>
    </group>
  )
}
