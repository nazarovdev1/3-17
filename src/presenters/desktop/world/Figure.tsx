/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { objectById } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { loadModel } from '../assets'
import { softwareModel } from './software'
import { primeUpload } from './prime'
import { REFLECTION_LAYER, type Appearance } from '../figure'
import type { Point } from '../layout'

/**
 * The figure (FIX_PROMPT §4.4). One original model (scripts/figure/figure.ts), shown only
 * as the story allows (../figure.ts): dark, lit from behind, partly hidden, and gone once
 * seen. It breathes, sways a little and turns its head slowly; it never walks on screen.
 *
 * Its light stays mounted (intensity 0 when unused) so the scene's shader set never
 * changes while playing.
 */
const BACKLIGHT: Partial<
  Record<Appearance['id'], { position: Point; color: string; power: number }>
> = {
  // Kitchen window behind the shape, through the ribbed glass.
  frosted: { position: [2.55, 1.55, 1.45], color: '#a9bdd8', power: 7 },
  // Daylight from the stair window, coming up the stairwell behind it.
  stairwell: { position: [2.2, -0.5, 8.6], color: '#b4c6de', power: 14 },
  // Behind the door: only what little comes up the stairwell, a rim on the head.
  under_door: { position: [0.7, 1.9, 6.6], color: '#8ea3c0', power: 5 },
  // The grey day through the half-landing window behind it.
  below: { position: [1.3, -3.4, 10.05], color: '#c7d0dc', power: 4 },
  // From the stairs, beyond it: a rim on the shoulders, nothing on the back.
  peephole: { position: [1.15, 1.25, 8.3], color: '#9fb2cc', power: 2.6 },
}

/**
 * The TV's picture tube, measured on the model: the set faces −x (rotation −π/2) and the
 * tube sits left of the knobs, i.e. toward −z from the viewer.
 */
export function tvScreen(): { centre: Point; width: number; height: number } {
  const tv = objectById('tv')!
  return {
    centre: [
      tv.position[0] - tv.size[2] / 2 - 0.004,
      tv.position[1] + 0.252,
      tv.position[2] - 0.06,
    ],
    width: 0.39,
    height: 0.29,
  }
}

/** Test builds only: `?figureHold=1` keeps an appearance up for still captures. */
const HOLD =
  import.meta.env.VITE_GAME_API === '1' &&
  new URLSearchParams(window.location.search).get('figureHold') === '1'

function prepare(gltf: GLTF, detailed: boolean): THREE.Group {
  const root = (gltf.scene.getObjectByName('figure') ?? gltf.scene).clone(true) as THREE.Group
  const cloth = new THREE.MeshStandardMaterial({
    vertexColors: true,
    // Darker than its colours: a face in the dark is a pale smudge, not a portrait.
    color: '#8c8c8c',
    roughness: 0.92,
    metalness: 0,
  })
  // Software GL is unlit: keep the shape a shade above black, and the skin dull.
  const flat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#3a3a3a' })
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.material = detailed ? cloth : flat
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  // The shipped head node is centred for compression, not at the neck: hang it from a
  // pivot at the neck so turning the head turns it about the spine.
  const head = root.getObjectByName('figure_head')
  if (head) {
    const neck = new THREE.Group()
    neck.name = 'figure_neck'
    neck.position.set(...NECK_PIVOT)
    root.add(neck)
    root.updateMatrixWorld(true)
    neck.attach(head)
  }
  return root
}

/** Where the head turns (scripts/figure/figure.ts NECK_PIVOT). */
const NECK_PIVOT: Point = [0, 1.62, -0.012]

export function Figure({
  appearance,
  node,
  detailed,
  outage,
}: {
  appearance: Appearance | null
  /** Node id: a new node restarts the appearance. */
  node: string
  detailed: boolean
  outage: boolean
}) {
  const camera = useThree((s) => s.camera)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  useEffect(() => {
    let live = true
    // The CPU rasterizer gets the same reduced LOD as the furniture.
    void loadModel('figure')
      .then((source) => (detailed ? source : softwareModel(source)))
      .then((model) => live && setGltf(model))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [detailed])
  const body = useMemo(() => (gltf ? prepare(gltf, detailed) : null), [gltf, detailed])
  const head = useMemo(() => body?.getObjectByName('figure_neck') ?? null, [body])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (body) primeUpload(gl, body)
  }, [gl, body])
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const run = useRef({ key: '', start: -1, seen: 0, gone: false, placed: false })
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const sphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 0.55), [])

  useEffect(() => {
    if (!body) return
    const layer = appearance?.reflectionOnly ? REFLECTION_LAYER : 0
    body.traverse((o) => o.layers.set(layer))
  }, [body, appearance?.reflectionOnly])

  useFrame(({ clock }, delta) => {
    const g = group.current
    const key = `${node}:${appearance?.id ?? ''}`
    const r = run.current
    if (r.key !== key) {
      run.current = { key, start: clock.elapsedTime, seen: 0, gone: false, placed: false }
    }
    const active = !!appearance && !!body && !r.gone
    if (g) g.visible = active
    const back = appearance ? BACKLIGHT[appearance.id] : undefined
    if (light.current) {
      light.current.intensity = active && back ? back.power : 0
      if (back) {
        light.current.position.set(...back.position)
        light.current.color.set(back.color)
      }
    }
    desktopRuntime.figure = active ? appearance.id : ''
    if (!active || !g) return
    const t = clock.elapsedTime - r.start
    if (!r.placed) {
      g.position.set(...appearance.position)
      g.rotation.set(0, appearance.yaw, 0)
      r.placed = true
    }
    // Breath and a slow, slight sway; the head turns over a few seconds.
    g.scale.set(1, 1 + Math.sin(t * 1.3) * 0.0035, 1)
    g.rotation.z = Math.sin(t * 0.37) * 0.008
    if (head) {
      const ease = THREE.MathUtils.smoothstep(t, 1.5, 6)
      head.rotation.set(
        (appearance.headPitch ?? 0) * Math.max(ease, 0.6),
        appearance.headYaw * ease,
        0,
      )
    }

    // Seen? (in view for a moment) — then gone once out of view.
    camera.updateMatrixWorld()
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix)
    sphere.center.set(g.position.x, g.position.y + 1.2, g.position.z)
    const inView = !appearance.reflectionOnly && frustum.intersectsSphere(sphere)
    if (inView) r.seen += delta
    const [px, , pz] = desktopRuntime.position
    const near =
      appearance.vanishWithin > 0 &&
      Math.hypot(px! - g.position.x, pz! - g.position.z) < appearance.vanishWithin
    if (
      !HOLD &&
      (t > appearance.maxSeconds ||
        near ||
        (appearance.vanishWhenUnseen && r.seen > 0.6 && !inView))
    ) {
      r.gone = true
      g.visible = false
      desktopRuntime.figure = ''
    }
  })

  return (
    <>
      {detailed && <pointLight ref={light} intensity={0} distance={5} decay={2} />}
      <group ref={group} visible={false} name="figure">
        {body && <primitive object={body} />}
      </group>
      {appearance?.id === 'under_door' && <DoorGap outage={outage} />}
      {appearance?.id === 'tv_reflection' && detailed && <TvGlass />}
    </>
  )
}

/**
 * The light under the entrance door (the leaf hangs 14 mm above the floor) with two feet
 * standing in it: a strip in the gap and a fan of light on the hall floor, cut by two
 * shadows that spread as they come in. The weight shifts now and then.
 */
function DoorGap({ outage }: { outage: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          feet: { value: new THREE.Vector2(-0.065, 0.145) },
          colour: { value: new THREE.Color() },
          strength: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec2 feet; uniform vec3 colour; uniform float strength;
          varying vec2 vUv;
          void main() {
            // x across the door (metres from its centre), depth into the hall (metres).
            // (The plane lies flat: uv.y = 0 is its edge against the door.)
            float x = (vUv.x - 0.5) * 1.6;
            float depth = vUv.y * 1.3;
            float spread = 1.0 + depth * 1.4;
            float light = exp(-depth * 4.2) * smoothstep(0.46 * spread, 0.3 * spread, abs(x));
            // The bright sliver right at the gap.
            light += 0.6 * exp(-depth * 90.0) * smoothstep(0.45, 0.4, abs(x));
            for (int i = 0; i < 2; i++) {
              float f = i == 0 ? feet.x : feet.y;
              float w = 0.042 * (1.0 + depth * 3.0);
              float s = smoothstep(w, w * 0.3, abs(x - f * (1.0 + depth * 1.5)));
              light *= 1.0 - 0.94 * s;
            }
            gl_FragColor = vec4(colour * light * strength, 1.0);
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Weight shifts: one foot lifts a little (shadow narrows) every few seconds.
    const shift = Math.max(0, Math.sin(t * 0.55)) ** 8 * 0.03
    ;(material.uniforms.feet!.value as THREE.Vector2).set(-0.065 + shift, 0.145 - shift * 0.5)
    ;(material.uniforms.colour!.value as THREE.Color).set(outage ? '#7f95b4' : '#ffcf94')
    material.uniforms.strength!.value = outage ? 1.3 : 1.1
  })
  // The leaf's inner face is at z 4.655; the fan starts under it and lies on the hall floor.
  return (
    <mesh position={[0, 0.004, 4.655 - 0.65]} rotation-x={-Math.PI / 2} material={material}>
      <planeGeometry args={[1.6, 1.3]} />
    </mesh>
  )
}

/**
 * The switched-off picture tube as what it is: a dark, convex mirror. A cube camera at the
 * tube sees the room (and the reflection-only layer) and the bulging glass shows a wide,
 * bent view of it — the player's own back, the room behind, and what stands there.
 */
function TvGlass() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const screen = tvScreen()
  const { target, cube, glass } = useMemo(() => {
    const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
    const cube = new THREE.CubeCamera(0.05, 12, target)
    cube.children.forEach((c) => c.layers.enable(REFLECTION_LAYER))
    // A gently bulged pane whose normals bend like a much rounder tube: a wide-angle mirror.
    const geometry = new THREE.PlaneGeometry(screen.width, screen.height, 16, 12)
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const normal = geometry.getAttribute('normal') as THREE.BufferAttribute
    const curve = 0.32
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      position.setZ(
        i,
        0.018 * (1 - ((2 * x) / screen.width) ** 2) * (1 - ((2 * y) / screen.height) ** 2),
      )
      const n = new THREE.Vector3(x / curve, y / curve, 1).normalize()
      normal.setXYZ(i, n.x, n.y, n.z)
    }
    const glass = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        // Dark glass reflects about a fifth of the light: grey "metal" over the env map.
        color: '#6c7479',
        metalness: 1,
        roughness: 0.1,
        envMap: target.texture,
        envMapIntensity: 2.6,
      }),
    )
    return { target, cube, glass }
  }, [screen.width, screen.height])
  useEffect(
    () => () => {
      target.dispose()
      glass.geometry.dispose()
      ;(glass.material as THREE.Material).dispose()
    },
    [target, glass],
  )
  const frame = useRef(0)
  useFrame(() => {
    // Every other frame is plenty for a dim reflection.
    if (frame.current++ % 2) return
    glass.visible = false
    cube.position.set(screen.centre[0] - 0.02, screen.centre[1], screen.centre[2])
    cube.update(gl, scene)
    glass.visible = true
  })
  return <primitive object={glass} position={screen.centre} rotation-y={-Math.PI / 2} />
}
