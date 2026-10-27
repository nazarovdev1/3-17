/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mirrorX, objectById } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import type { GameState } from '@/core/state/types'
import { loadModel } from '../assets'
import { softwareModel } from './software'
import { placeModel, type Models } from './Furniture'
import { softwareMaterial } from './softwareMaterial'
import { primeUpload } from './prime'
import { CHAIR_MOVED, changesFor } from '../changes'

/**
 * Things that change while nobody is looking (fear-design.md): the night's state says what
 * should be different; each change waits until its spot is out of view before it happens,
 * so the player only ever finds it changed. Plus the evidence that stays: the bundle by
 * the door, wet footprints to 48, breath in the cold corridor.
 */
function useUnobserved(
  want: boolean,
  centre: THREE.Vector3Tuple,
  radius: number,
  instant: boolean,
): boolean {
  const camera = useThree((s) => s.camera)
  instant ||=
    (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
    new URLSearchParams(window.location.search).get('render') === 'still' &&
    new URLSearchParams(window.location.search).has('cam')
  // Keyed by the wish, so a new night (or a new wish) starts over without an effect.
  const key = `${want}:${instant}`
  const [mark, setMark] = useState({ key, done: want && instant })
  const done = mark.key === key ? mark.done : want && instant
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const sphere = useMemo(
    () => new THREE.Sphere(new THREE.Vector3(...centre), radius),
    [centre, radius],
  )
  useFrame(() => {
    if (!want || done) return
    camera.updateMatrixWorld()
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix)
    if (!frustum.intersectsSphere(sphere)) setMark({ key, done: true })
  })
  return done
}

const COAT_AT: THREE.Vector3Tuple = [1.43, 0.09, 3.24]

export function Changes({
  state,
  node,
  models,
  detailed,
}: {
  state: GameState
  node: string
  models: Models
  detailed: boolean
}) {
  const c = changesFor(node, state)
  const chairObject = objectById('room_chair')!
  const chairModel = models.get(chairObject.asset)
  const chair = useMemo(
    () => (chairModel ? placeModel(chairObject, chairModel, detailed) : null),
    [chairModel, chairObject, detailed],
  )
  const chairMoved = useUnobserved(
    c.chairMoved,
    [chairObject.position[0], 0.6, chairObject.position[2]],
    1.2,
    !c.chairMovedTonight,
  )
  const coatShown = useUnobserved(c.coat, [COAT_AT[0], 1.1, COAT_AT[2]], 0.8, !c.coatTonight)
  const chainLoose = useUnobserved(c.chainLoose, [-0.45, 1.45, 4.6], 0.4, false)
  const [figure, setFigure] = useState<GLTF | null>(null)
  // Loaded (and primed) up front, so the coat can appear the moment nobody looks.
  useEffect(() => {
    let live = true
    // The CPU rasterizer gets the same reduced LOD as the furniture.
    void loadModel('figure')
      .then((source) => (detailed ? source : softwareModel(source)))
      .then((m) => live && setFigure(m))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [detailed])
  const coat = useMemo(() => {
    const source = figure?.scene.getObjectByName('hanging_coat')
    if (!source) return null
    const copy = source.clone(true)
    const wool = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = detailed ? wool : softwareMaterial(wool)
      mesh.castShadow = mesh.receiveShadow = true
    })
    return copy
  }, [figure, detailed])
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    if (coat) primeUpload(gl, coat)
  }, [gl, coat])
  // three.js shares one quad among all sprites; upload it now, not at night 5's first breath.
  useEffect(() => primeUpload(gl, new THREE.Sprite()), [gl])
  useEffect(() => {
    desktopRuntime.changes = [
      chairMoved && 'chair',
      coatShown && c.coat && 'coat',
      chainLoose && 'chain',
      c.bundle && 'bundle',
      c.footprints && 'footprints',
      c.breath && 'breath',
    ]
      .filter(Boolean)
      .join(',')
  })
  return (
    <group name="changes">
      {chair && (
        <group
          position={chairMoved ? CHAIR_MOVED.position : chairObject.position}
          rotation-y={chairMoved ? CHAIR_MOVED.rotation - chairObject.rotation : 0}
        >
          <primitive object={chair} />
        </group>
      )}
      {coat && c.coat && coatShown && (
        // The node keeps its own (dequantization) transform: place it from outside.
        <group position={COAT_AT} rotation-y={-Math.PI / 2}>
          <primitive object={coat} />
        </group>
      )}
      <DoorChain loose={chainLoose} detailed={detailed} />
      {c.bundle && <Bundle detailed={detailed} />}
      {c.footprints && <Footprints detailed={detailed} />}
      <Breath active={c.breath} node={node} />
    </group>
  )
}

/** The entrance chain: across the gap when fastened, hanging from the frame when not. */
function DoorChain({ loose, detailed }: { loose: boolean; detailed: boolean }) {
  // One merged mesh (plates and thirteen links): a single draw call.
  const { geometry, material } = useMemo(() => {
    // On the inner faces: the slot plate on the leaf near its free edge, the anchor on the frame.
    const frame = new THREE.Vector3(-0.53, 1.47, 4.597)
    const leaf = new THREE.Vector3(-0.36, 1.47, 4.652)
    const parts: THREE.BufferGeometry[] = [frame, leaf].map((at) =>
      new THREE.BoxGeometry(0.03, 0.07, 0.006).translate(at.x, at.y, at.z),
    )
    for (let i = 0; i < 13; i++) {
      const t = i / 12
      const p = loose
        ? frame.clone().add(new THREE.Vector3(0.004 * Math.sin(i), -t * 0.2, 0.004))
        : frame
            .clone()
            .lerp(leaf, t)
            .add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 0.035, 0))
      const link = new THREE.TorusGeometry(0.0085, 0.0021, 6, 12)
      link.rotateX(i % 2 ? Math.PI / 2 : 0)
      if (loose) link.rotateZ(Math.PI / 2)
      parts.push(link.translate(p.x, p.y, p.z))
    }
    const geometry = mergeGeometries(parts)
    parts.forEach((part) => part.dispose())
    const material = detailed
      ? new THREE.MeshStandardMaterial({ color: '#8a8d8a', roughness: 0.35, metalness: 1 })
      : new THREE.MeshBasicMaterial({ color: '#3d3f3d' })
    return { geometry, material }
  }, [loose, detailed])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return <mesh name="door-chain" geometry={geometry} material={material} />
}

/** A cloth bundle (tugun) on the landing outside 47: food from home, still warm. */
function Bundle({ detailed }: { detailed: boolean }) {
  const { geometry, knot, material } = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 28, 18)
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      // Flat base, gathered top, soft cloth wrinkles.
      const wrinkle = 1 + 0.05 * Math.sin(x * 9 + z * 7) * Math.sin(y * 6)
      position.setXYZ(
        i,
        x * 0.17 * wrinkle,
        Math.max(y, -0.55) * 0.09 * wrinkle + 0.05,
        z * 0.14 * wrinkle,
      )
    }
    geometry.computeVertexNormals()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const c2 = canvas.getContext('2d')!
    c2.fillStyle = '#5a2f2a'
    c2.fillRect(0, 0, 256, 256)
    c2.fillStyle = '#b89a5e'
    for (let i = 0; i < 256; i += 32) {
      c2.fillRect(i, 0, 6, 256)
      c2.fillRect(0, i + 12, 256, 4)
    }
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(2, 2)
    const material = detailed
      ? new THREE.MeshStandardMaterial({ map, roughness: 0.95 })
      : new THREE.MeshBasicMaterial({ map, color: '#7a7a7a' })
    const knot = new THREE.SphereGeometry(0.035, 16, 12).scale(1.4, 0.8, 1)
    return { geometry, knot, material }
  }, [detailed])
  useEffect(
    () => () => {
      geometry.dispose()
      knot.dispose()
      material.map?.dispose()
      material.dispose()
    },
    [geometry, knot, material],
  )
  return (
    <group position={[0.32, 0, 5.08]} rotation-y={0.4} name="bundle">
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh geometry={knot} material={material} position={[0, 0.135, 0]} castShadow />
      <mesh
        geometry={knot}
        material={material}
        position={[0.03, 0.15, 0.01]}
        rotation-z={0.9}
        castShadow
      />
    </group>
  )
}

/** Wet shoe prints from the head of the stairs to door 48, glossy on the concrete. */
function Footprints({ detailed }: { detailed: boolean }) {
  // All prints in one mesh (one draw call); glossy where the GPU can afford it.
  const { geometry, material } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 256
    const c2 = canvas.getContext('2d')!
    c2.fillStyle = '#fff'
    c2.beginPath()
    c2.ellipse(64, 80, 40, 70, 0, 0, Math.PI * 2)
    c2.fill()
    c2.beginPath()
    c2.ellipse(64, 200, 32, 42, 0, 0, Math.PI * 2)
    c2.fill()
    const alpha = new THREE.CanvasTexture(canvas)
    const shared = {
      color: '#1b1d1f',
      transparent: true,
      opacity: 0.6,
      alphaMap: alpha,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }
    const material = detailed
      ? new THREE.MeshStandardMaterial({ ...shared, roughness: 0.08, metalness: 0.2 })
      : new THREE.MeshBasicMaterial(shared)
    // A long stride, curving from the stairs to the door of 48.
    const from = new THREE.Vector2(1.05, 7.1)
    const bend = new THREE.Vector2(-1.2, 5.9)
    const to = new THREE.Vector2(mirrorX(0) + 0.05, 4.95)
    const curve = new THREE.QuadraticBezierCurve(from, bend, to)
    const steps = Math.floor(curve.getLength() / 0.42)
    const prints = Array.from({ length: steps }, (_, i) => {
      const t = (i + 0.5) / steps
      const p = curve.getPointAt(t)
      const d = curve.getTangentAt(t)
      const side = i % 2 ? 1 : -1
      const yaw = Math.atan2(d.x, d.y)
      return new THREE.PlaneGeometry(0.11, 0.29)
        .rotateX(-Math.PI / 2)
        .rotateY(yaw + Math.PI)
        .translate(p.x + Math.cos(yaw) * 0.09 * side, 0.003, p.y - Math.sin(yaw) * 0.09 * side)
    })
    const geometry = mergeGeometries(prints)
    prints.forEach((print) => print.dispose())
    return { geometry, material }
  }, [detailed])
  useEffect(
    () => () => {
      geometry.dispose()
      material.alphaMap?.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return <mesh name="footprints" geometry={geometry} material={material} receiveShadow />
}

/** Night 5: breath shows in the cold that comes in from 48. */
function Breath({ active, node }: { active: boolean; node: string }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const c2 = canvas.getContext('2d')!
    const g = c2.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c2.fillStyle = g
    c2.fillRect(0, 0, 128, 128)
    const map = new THREE.CanvasTexture(canvas)
    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map,
        color: '#c7d0da',
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    )
  }, [])
  useEffect(() => primeUpload(gl, sprite), [gl, sprite])
  useEffect(
    () => () => {
      sprite.material.map?.dispose()
      sprite.material.dispose()
    },
    [sprite],
  )
  const origin = useRef(new THREE.Vector3())
  const forward = useMemo(() => new THREE.Vector3(), [])
  const last = useRef(-10)
  const previousNode = useRef(node)
  useFrame(({ clock }) => {
    sprite.visible = active
    if (previousNode.current !== node) {
      previousNode.current = node
      last.current = -10
    }
    if (!active) return
    const t = clock.elapsedTime
    const [x, , z] = desktopRuntime.position
    // Only where the cold is: corridor, hall and landing.
    const cold = z! > 0.1 && x! > -0.7
    if (cold && t - last.current > 3.6) {
      last.current = t
      camera.getWorldDirection(forward)
      origin.current.copy(camera.position).addScaledVector(forward, 0.22)
      origin.current.y -= 0.07
    }
    const age = t - last.current
    const material = sprite.material
    material.opacity = age < 1.8 ? Math.sin((Math.PI * age) / 1.8) * 0.16 : 0
    sprite.position.copy(origin.current).addScaledVector(forward, age * 0.12)
    sprite.position.y += age * 0.05
    sprite.scale.setScalar(0.08 + age * 0.14)
  })
  return <primitive object={sprite} />
}
