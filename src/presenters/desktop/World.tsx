import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import {
  Box3,
  Frustum,
  Matrix4,
  Vector3,
  Color,
  Object3D,
  type InstancedMesh,
  type Group,
  type PointLight,
} from 'three'
import { SWITCHES, type Point } from './layout'
import { type Resources, type Surface, SURFACES } from './textures'
import { desktopRuntime } from '@/platform/device/desktopRuntime'

interface Box {
  p: Point
  s: Point
  kind: Surface
  color?: string
}
const CEILING_LIGHTS: Point[] = [
  [0, 2.5, -0.8],
  [0, 2.5, 2.5],
  [0, 2.5, 5.5],
  [2, 2.5, 2.5],
  [-2, 2.5, 2.5],
]
function apartment(x: number, decayed: boolean): Box[] {
  const boxes: Box[] = []
  const add = (p: Point, s: Point, kind: Surface = 'wood', color?: string) =>
    boxes.push({
      p: [p[0] + x, p[1], p[2]],
      s,
      kind,
      color: color ?? (decayed ? '#7a8076' : '#ffffff'),
    })
  add([0, -0.09, 2], [6, 0.18, 10], 'wood')
  add([0, 2.8, 2], [6, 0.15, 10], 'concrete')
  add([-3, 1.35, 2], [0.16, 2.7, 10], 'wall')
  add([3, 1.35, 2], [0.16, 2.7, 10], 'wall')
  // Window opening and balcony door. Interior partitions leave real doorways.
  add([-1.2, 1.35, -3], [3.6, 2.7, 0.16], 'wall')
  add([2.92, 1.35, -3], [0.16, 2.7, 0.16], 'wall')
  add([1.8, 2.55, -3], [2.2, 0.3, 0.16], 'wall')
  add([1.05, 0.45, -3], [0.8, 0.9, 0.16], 'wall')
  add([-1.85, 1.35, 1], [2.3, 2.7, 0.13], 'wall')
  add([1.85, 1.35, 1], [2.3, 2.7, 0.13], 'wall')
  for (const side of [-1, 1]) {
    add([side * 0.8, 1.35, 1.45], [0.12, 2.7, 0.9], 'wall')
    add([side * 0.8, 1.35, 3.55], [0.12, 2.7, 0.9], 'wall')
    add([side * 1.9, 1.35, 4], [2.2, 2.7, 0.12], 'wall')
    add([side * 1.85, 1.35, 7], [2.3, 2.7, 0.18], 'concrete')
  }
  add([0, 2.5, 7], [1.4, 0.4, 0.2], 'concrete')
  for (const point of SWITCHES) add(point, [0.1, 0.15, 0.06], 'paper')
  add([0, -0.08, -3.8], [6, 0.15, 1.6], 'concrete')
  add([0, 0.85, -4.5], [6, 0.06, 0.06], 'metal')
  for (let i = -3; i <= 3; i++) add([i, 0.43, -4.5], [0.04, 0.85, 0.04], 'metal')
  // Carpet, bed, pillow, bedside table and landlord's note.
  add([-2.89, 1.5, -0.3], [0.06, 1.7, 1.9], 'carpet')
  add([1.9, 0.32, -0.2], [1.5, 0.5, 2.1], 'wood')
  add([1.9, 0.62, -0.25], [1.45, 0.15, 2], 'carpet')
  add([1.9, 0.74, -1.0], [1, 0.1, 0.4], 'paper')
  add([-2.1, 0.39, -0.9], [0.9, 0.75, 0.7], 'wood')
  add([-2.1, 0.79, -0.9], [0.44, 0.02, 0.3], 'paper')
  // Rubin TV and cabinet, knobs and aerial.
  add([-2.55, 0.35, -1.8], [0.7, 0.7, 0.65], 'wood')
  add([-2.55, 0.93, -1.8], [0.65, 0.48, 0.44], 'wood')
  add([-2.55, 0.95, -1.56], [0.48, 0.32, 0.025], 'metal', decayed ? '#101414' : '#273f40')
  add([-2.24, 0.94, -1.55], [0.035, 0.1, 0.035], 'metal')
  add([-2.6, 1.34, -1.8], [0.02, 0.38, 0.02], 'metal')
  // Wardrobe doors, mirror-like panel and brass handle.
  add([-2.4, 1.05, 0.3], [0.9, 2.1, 0.6], 'wood')
  add([-2.4, 1.05, 0.62], [0.025, 1.95, 0.02], 'metal')
  add([-2.32, 1.1, 0.64], [0.025, 0.13, 0.04], 'metal')
  // Cast-iron radiator.
  for (let i = 0; i < 8; i++) add([1.02 + i * 0.19, 0.4, -2.82], [0.12, 0.66, 0.2], 'metal')
  add([1.7, 0.32, -2.8], [2, 0.04, 0.1], 'metal')
  // Kitchen: tile floor, enamel stove, burners, kettle, table, bread box, fridge.
  add([1.9, 0.015, 2.5], [2.1, 0.03, 2.8], 'tile')
  add([2.5, 0.47, 3.35], [0.8, 0.9, 0.65], 'metal')
  add([2.5, 0.43, 3.0], [0.6, 0.4, 0.02], 'metal', '#171d22')
  for (const dx of [-0.2, 0.2]) add([2.5 + dx, 0.94, 3.35], [0.14, 0.015, 0.2], 'metal', '#121518')
  add([2.25, 1.04, 3.32], [0.26, 0.2, 0.24], 'metal')
  add([2.4, 1.1, 3.32], [0.18, 0.04, 0.04], 'metal')
  add([2.35, 0.87, 1.5], [1, 0.1, 0.6], 'wood')
  add([2.6, 1.04, 1.5], [0.4, 0.25, 0.35], 'wood')
  add([2.6, 1.04, 2.3], [0.65, 2.05, 0.65], 'metal', '#b7bdad')
  add([2.24, 1.3, 2.3], [0.03, 0.5, 0.04], 'metal')
  // Bathroom tiles, bath rim, tap, sink and vent.
  add([-1.9, 0.01, 2.5], [2.1, 0.03, 2.8], 'tile')
  add([-2.9, 1.2, 2.5], [0.03, 2.4, 2.9], 'tile')
  add([-2.15, 0.35, 3.45], [1.4, 0.65, 0.7], 'tile')
  add([-2.15, 0.68, 3.45], [1.2, 0.02, 0.5], 'metal', '#202f2e')
  add([-2.1, 0.8, 1.45], [0.7, 0.2, 0.5], 'paper')
  add([-2.1, 1, 1.3], [0.05, 0.3, 0.05], 'metal')
  add([-2.85, 2.1, 3.1], [0.08, 0.35, 0.4], 'metal', '#262f2d')
  // Door frame, chain and switch.
  add([0.7, 1.2, 6.85], [0.05, 2.4, 0.08], 'wood')
  add([-0.7, 1.2, 6.85], [0.05, 2.4, 0.08], 'wood')
  add([0.4, 1.5, 6.85], [0.3, 0.025, 0.025], 'metal')
  add([0.6, 1.45, 0.88], [0.1, 0.15, 0.05], 'paper')
  if (decayed) {
    add([-2.4, 1.9, -2.87], [0.6, 0.75, 0.04], 'calendar')
    add([-2.1, 0.85, -0.9], [0.55, 0.1, 0.35], 'metal')
    add([1.5, 0.38, -0.3], [0.55, 0.06, 0.55], 'wood')
    add([1.5, 0.58, -0.55], [0.55, 0.5, 0.04], 'wood')
    add([1.5, 0.43, -0.3], [0.38, 0.015, 0.3], 'paper')
    for (let i = 0; i < 6; i++)
      add([-2.1 + i * 0.6, 1.1, -2.88], [0.15, 0.4 + (i % 3) * 0.3, 0.05], 'wall', '#343d32')
  }
  return boxes
}
function buildBoxes(extension: number) {
  const flat47 = apartment(0, false)
  for (const box of flat47) {
    if (box.s[2] === 10) {
      box.p[2] += extension / 2
      box.s[2] += extension
    } else if (box.p[2] >= 4) box.p[2] += extension
  }
  const boxes = [...flat47, ...apartment(6, true)]
  if (extension > 0)
    for (const side of [-1, 1])
      boxes.push({
        p: [side * 0.8, 1.35, 4 + extension / 2],
        s: [0.12, 2.7, extension],
        kind: 'wall',
      })
  boxes.push(
    { p: [3, -0.1, 9], s: [12, 0.2, 4], kind: 'concrete' },
    { p: [3, 1.4, 11], s: [12, 2.8, 0.15], kind: 'concrete' },
    { p: [3, 2.8, 9], s: [12, 0.15, 4], kind: 'concrete' },
    { p: [-3, 1.4, 9], s: [0.15, 2.8, 4], kind: 'concrete' },
    { p: [9, 1.4, 9], s: [0.15, 2.8, 4], kind: 'concrete' },
  )
  for (let i = 0; i < 8; i++)
    boxes.push({ p: [7.8, -i * 0.17, 10.5 + i * 0.35], s: [2, 0.17, 0.35], kind: 'concrete' })
  // Opposite panel building and sodium lamp. Window panes are instanced separately.
  boxes.push(
    { p: [0, 3, -13], s: [18, 12, 1], kind: 'concrete', color: '#55606d' },
    { p: [4, 1.5, -8], s: [0.08, 5, 0.08], kind: 'metal' },
  )
  return boxes
}
function BoxBatch({
  boxes,
  resources,
  kind,
}: {
  boxes: Box[]
  resources: Resources
  kind: Surface
}) {
  const ref = useRef<InstancedMesh>(null)
  const subset = useMemo(() => boxes.filter((box) => box.kind === kind), [boxes, kind])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    subset.forEach((box, i) => {
      dummy.position.set(...box.p)
      dummy.scale.set(...box.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new Color(box.color ?? '#ffffff'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    return () => mesh.dispose()
  }, [subset])
  return (
    <instancedMesh
      ref={ref}
      args={[resources.geometry, resources.materials[kind], subset.length]}
      dispose={null}
    />
  )
}
function PaneWindows({ outage }: { outage: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const start = useRef(outage ? Number.NEGATIVE_INFINITY : 0)
  const previous = useRef(outage)
  const lastDark = useRef(-1)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    let index = 0
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 6; x++) {
        dummy.position.set(-7 + x * 2.8, y * 1.8 - 0.8, -12.45)
        dummy.scale.set(0.65, 0.9, 0.02)
        dummy.updateMatrix()
        mesh.setMatrixAt(index++, dummy.matrix)
      }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    if (previous.current !== outage) {
      start.current = clock.elapsedTime
      previous.current = outage
    }
    const dark = outage ? Math.min(5, Math.floor((clock.elapsedTime - start.current) * 1.4)) : 0
    if (dark === lastDark.current) return
    lastDark.current = dark
    let lit = 0
    for (let i = 0; i < 30; i++) {
      const rank = [2, 8, 15, 21, 28].indexOf(i)
      const on = rank >= dark && rank >= 0
      mesh.setColorAt(i, new Color(on ? '#9b6c32' : '#101821'))
      if (on) lit++
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    desktopRuntime.windowsLit = lit
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 30]}>
      <boxGeometry />
      <meshBasicMaterial />
    </instancedMesh>
  )
}
export function World({
  resources,
  outage,
  doorAjar,
  corridorLength,
  peephole,
  windowsDark,
  lightsOff,
  neighbor,
  clockRequested,
}: {
  resources: Resources
  outage: boolean
  doorAjar: boolean
  corridorLength: number
  peephole: boolean
  windowsDark: boolean
  lightsOff: Set<number>
  neighbor: boolean
  clockRequested: boolean
}) {
  const camera = useThree((state) => state.camera)
  const [initialShift] = useState(clockRequested)
  const clockGroups = useRef<(Group | null)[]>([])
  const shifted = useRef([initialShift, initialShift])
  const view = useRef(new Frustum())
  const projection = useRef(new Matrix4())
  const clockBounds = useRef(new Box3())
  const extension = corridorLength - 1
  const boxes = useMemo(() => buildBoxes(extension), [extension])
  const figure = useRef<Group>(null)
  const mirrors = useRef<(Group | null)[]>([])
  const figureStart = useRef(0)
  const snow = useRef<Group>(null)
  const doors = useRef<(Group | null)[]>([])
  const ceilingLight = useRef<PointLight>(null)
  useEffect(() => {
    figureStart.current = performance.now()
  }, [peephole])
  useFrame(({ clock }) => {
    // Interior walls hide the other rooms' lamps. Shade with the nearest fixture
    // instead of evaluating five point lights for every visible PS1 pixel.
    if (ceilingLight.current) {
      let nearest = 0
      let distance = Infinity
      CEILING_LIGHTS.forEach((position, i) => {
        const d = Math.hypot(
          desktopRuntime.position[0]! - position[0],
          desktopRuntime.position[2]! - position[2],
        )
        if (d < distance) {
          nearest = i
          distance = d
        }
      })
      ceilingLight.current.position.set(...CEILING_LIGHTS[nearest]!)
      const circuit = nearest === 4 ? 2 : nearest === 3 ? 1 : nearest === 2 ? 3 : 0
      ceilingLight.current.intensity = outage || lightsOff.has(circuit) ? 0 : nearest === 0 ? 9 : 4
    }
    if (figure.current)
      figure.current.visible = peephole && performance.now() - figureStart.current < 1500
    for (const mirror of mirrors.current)
      if (mirror) {
        mirror.position.x = -2.1 + desktopRuntime.mirrorOffset
        mirror.rotation.y = Math.max(-0.6, Math.min(0.6, -(desktopRuntime.mirrorYaw - 0.65) * 0.4))
        mirror.rotation.x = desktopRuntime.mirrorPitch * 0.3
      }
    if (clockRequested && shifted.current.some((value) => !value)) {
      camera.updateMatrixWorld()
      projection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      view.current.setFromProjectionMatrix(projection.current)
      clockGroups.current.forEach((clock, index) => {
        if (!clock || shifted.current[index]) return
        clockBounds.current.setFromCenterAndSize(
          new Vector3(index * 6 - 1.1, 1.95, -2.8),
          new Vector3(0.6, 0.6, 0.2),
        )
        if (!view.current.intersectsBox(clockBounds.current)) {
          clock.position.x = 0.9
          shifted.current[index] = true
        }
      })
    }
    desktopRuntime.clockShifted = shifted.current[0]!
    doors.current.forEach((door, index) => {
      if (!door) return
      const distance = Math.hypot(
        desktopRuntime.position[0]! - index * 6,
        desktopRuntime.position[2]! - 6.9 - (index === 0 ? extension : 0),
      )
      const target =
        distance < 1.8 && (index === 0 || doorAjar) ? 1.35 : index === 1 && doorAjar ? 0.36 : 0
      door.rotation.y += (target - door.rotation.y) * 0.12
    })
    if (snow.current) snow.current.position.y = -((clock.elapsedTime * 0.3) % 4)
  })
  const snowPositions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 600 }, (_, i) =>
          i % 3 === 0
            ? ((i * 7.13) % 18) - 9
            : i % 3 === 1
              ? (i * 3.17) % 12
              : -6 - ((i * 1.11) % 7),
        ),
      ),
    [],
  )
  return (
    <>
      <color attach="background" args={['#0b1019']} />
      <fog attach="fog" args={['#0e151e', 7, 24]} />
      <hemisphereLight args={['#a7b3bb', '#292118', outage ? 0.55 : 1.35]} />
      <ambientLight intensity={outage ? 0.12 : 0.28} />
      {SURFACES.map((kind) => (
        <BoxBatch key={kind} boxes={boxes} kind={kind} resources={resources} />
      ))}
      <pointLight ref={ceilingLight} color="#bdc6a0" distance={5} decay={2} />
      <pointLight position={[4, 2, -7]} color="#d98a2b" intensity={22} distance={14} decay={2} />
      {[0, 6].flatMap((x) =>
        [
          [-0.0, 2.6, -0.8],
          [0, 2.6, 2.5],
          [0, 2.6, 5.5],
          [2, 2.6, 2.5],
          [-2, 2.6, 2.5],
        ].map((p, i) => (
          <mesh key={`${x}-${i}`} position={[p[0]! + x, p[1]!, p[2]!]}>
            <cylinderGeometry args={[0.23, 0.3, 0.09, 8]} />
            <meshBasicMaterial color={x === 0 && !outage ? '#a9aa7d' : '#292d2c'} />
          </mesh>
        )),
      )}
      {[0, 6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <group
            ref={(value) => {
              doors.current[x === 0 ? 0 : 1] = value
            }}
            position={[-0.67, 0, 6.9 + (x === 0 ? extension : 0)]}
            rotation={[0, x === 6 && doorAjar ? 0.36 : 0, 0]}
          >
            <mesh position={[0.67, 1.2, 0]}>
              <boxGeometry args={[1.32, 2.4, 0.1]} />
              <meshLambertMaterial color={x === 0 ? '#4f3c2d' : '#272c27'} />
            </mesh>
            <mesh
              geometry={resources.geometry}
              material={resources.materials[x === 0 ? 'door47' : 'door48']}
              position={[0.67, 1.95, 0.065]}
              scale={[0.32, 0.2, 0.015]}
              dispose={null}
            />
            {Array.from({ length: 6 }, (_, i) => (
              <mesh
                key={i}
                position={[0.88 + i * 0.045, 1.5 - Math.sin(i * 0.5) * 0.04, -0.08]}
                rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}
              >
                <torusGeometry args={[0.035, 0.006, 4, 8]} />
                <meshLambertMaterial color="#8e8772" />
              </mesh>
            ))}
            <mesh position={[1.15, 1.2, -0.08]}>
              <sphereGeometry args={[0.05, 6, 4]} />
              <meshBasicMaterial color="#8d8162" />
            </mesh>
            <mesh position={[0.67, 1.7, -0.065]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
              <meshBasicMaterial color="#c1aa76" />
            </mesh>
          </group>
          <group
            ref={(value) => {
              clockGroups.current[x === 0 ? 0 : 1] = value
            }}
            position={[initialShift ? 0.9 : 0, 0, 0]}
          >
            <mesh position={[-1.1, 1.95, -2.84]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.27, 0.27, 0.09, 12]} />
              <meshLambertMaterial color="#d1c4a1" />
            </mesh>
            <mesh position={[-1.027, 1.939, -2.77]} rotation={[0, 0, -1.719]}>
              <boxGeometry args={[0.014, 0.15, 0.015]} />
              <meshBasicMaterial color="#242522" />
            </mesh>
            <mesh position={[-1.002, 1.929, -2.77]} rotation={[0, 0, -1.78]}>
              <boxGeometry args={[0.012, 0.2, 0.015]} />
              <meshBasicMaterial color="#242522" />
            </mesh>
          </group>
          <mesh position={[-1.1, 1.95, -2.895]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.008, 12]} />
            <meshLambertMaterial color="#424940" />
          </mesh>
          <mesh position={[-2.1, 1.6, 1.17]}>
            <boxGeometry args={[0.75, 0.85, 0.025]} />
            <meshLambertMaterial color="#506b6c" />
          </mesh>
          <group
            ref={(value) => {
              mirrors.current[x === 0 ? 0 : 1] = value
            }}
            position={[-2.1, 1.5, 1.14]}
          >
            <mesh>
              <boxGeometry args={[0.22, 0.35, 0.025]} />
              <meshBasicMaterial color="#233335" />
            </mesh>
            <mesh position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.1, 6, 4]} />
              <meshBasicMaterial color="#233335" />
            </mesh>
          </group>
        </group>
      ))}
      <PaneWindows outage={windowsDark} />
      {neighbor && (
        <group position={[-1.1, 0, 8]} rotation={[0, -0.6, 0]}>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.48, 1.15, 0.3]} />
            <meshLambertMaterial color="#4d574a" />
          </mesh>
          <mesh position={[0, 1.42, 0]}>
            <sphereGeometry args={[0.17, 7, 5]} />
            <meshLambertMaterial color="#a39478" />
          </mesh>
          <mesh position={[0, 1.55, -0.04]}>
            <coneGeometry args={[0.25, 0.3, 6]} />
            <meshLambertMaterial color="#6e6b60" />
          </mesh>
          <mesh position={[0.04, 1.41, 0.16]}>
            <boxGeometry args={[0.05, 0.06, 0.06]} />
            <meshLambertMaterial color="#9a896e" />
          </mesh>
          <mesh position={[0.28, 0.97, 0.22]}>
            <cylinderGeometry args={[0.16, 0.13, 0.04, 8]} />
            <meshLambertMaterial color="#a18a56" />
          </mesh>
        </group>
      )}
      <group ref={snow}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[snowPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#8a99a4"
            size={0.035}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </points>
      </group>
      <group ref={figure} position={[0, 0, 8.9]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.4, 1.4, 0.2]} />
          <meshBasicMaterial color="#080c10" />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.19, 7, 5]} />
          <meshBasicMaterial color="#080c10" />
        </mesh>
      </group>
      <Billboard position={[4, 4, -8]}>
        <mesh>
          <planeGeometry args={[0.55, 0.18]} />
          <meshBasicMaterial color="#d98a2b" />
        </mesh>
      </Billboard>
    </>
  )
}
