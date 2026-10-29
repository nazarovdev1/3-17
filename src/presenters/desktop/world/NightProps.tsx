/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTY_X, mirrorX, objectById } from '@/content/world/layout'
import { objectPoint } from '@/content/world/objects'
import { REFLECTION_LAYER } from '../figure'
import { tvScreen } from './Figure'
import { softwareMaterial } from './softwareMaterial'
import type { SurfaceMaterials } from './materials'

/**
 * What the nights change in the flat without a word (docs/BEATS.md nights 2–5): the
 * wardrobe and the tally marks inside it, the TV's static and the picture of this room
 * from its top corner, the mirror cabinet standing open, a palm of breath on the shared
 * wall, frost on the glass, the raised floorboard, the seal on 48 and the pale square the
 * clock leaves on the wallpaper. Every state comes from the Director's world objects.
 */
type Objects = Record<string, string>

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Scratched tally marks in fives, row after row: somebody counted days in the dark. */
function tallyTexture() {
  return canvasTexture(512, 640, (c) => {
    c.clearRect(0, 0, 512, 640)
    c.strokeStyle = 'rgba(230, 222, 200, 0.85)'
    c.lineCap = 'round'
    let n = 0
    for (let row = 0; row < 11; row++) {
      for (let group = 0; group < 5; group++) {
        const x0 = 24 + group * 96 + (row % 2) * 6
        const y0 = 30 + row * 56
        for (let i = 0; i < 4; i++) {
          c.lineWidth = 2 + ((n + i) % 3) * 0.6
          c.beginPath()
          c.moveTo(x0 + i * 14, y0 + ((n * 7 + i) % 5))
          c.lineTo(x0 + i * 14 + ((i * 3 + n) % 5) - 2, y0 + 40)
          c.stroke()
        }
        c.beginPath()
        c.moveTo(x0 - 6, y0 + 34)
        c.lineTo(x0 + 52, y0 + 6)
        c.stroke()
        n++
        // The last row breaks off part-way.
        if (row === 10 && group === 2) return
      }
    }
  })
}

/** A palm of condensation: a soft hand print, fingers up. */
function palmTexture() {
  return canvasTexture(256, 320, (c) => {
    c.clearRect(0, 0, 256, 320)
    c.fillStyle = 'rgba(235, 240, 245, 0.55)'
    c.filter = 'blur(6px)'
    c.beginPath()
    c.ellipse(128, 215, 62, 72, 0, 0, Math.PI * 2)
    c.fill()
    const fingers: [number, number, number, number][] = [
      [72, 120, 14, 46],
      [104, 95, 15, 58],
      [138, 92, 15, 60],
      [170, 108, 14, 52],
      [204, 190, 13, 40],
    ]
    for (const [x, y, rx, ry] of fingers) {
      c.beginPath()
      c.ellipse(x, y, rx, ry, x > 190 ? -0.7 : (x - 128) / 600, 0, Math.PI * 2)
      c.fill()
    }
  })
}

/** Frost flowers growing in from the corners of the pane. */
function frostTexture() {
  return canvasTexture(512, 512, (c) => {
    c.clearRect(0, 0, 512, 512)
    c.strokeStyle = 'rgba(225, 235, 245, 0.5)'
    c.lineWidth = 1.4
    const branch = (x: number, y: number, a: number, len: number, depth: number) => {
      if (depth === 0 || len < 4) return
      const x2 = x + Math.cos(a) * len
      const y2 = y + Math.sin(a) * len
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x2, y2)
      c.stroke()
      branch(x2, y2, a - 0.55, len * 0.62, depth - 1)
      branch(x2, y2, a + 0.5, len * 0.6, depth - 1)
      branch(x2, y2, a + 0.05, len * 0.7, depth - 1)
    }
    for (const [x, y, a] of [
      [0, 512, -0.8],
      [512, 512, -2.3],
      [0, 0, 0.7],
      [512, 0, 2.4],
      [0, 300, -0.2],
      [512, 260, 3.3],
    ] as const)
      branch(x, y, a, 70, 6)
    const edge = c.createRadialGradient(256, 256, 120, 256, 256, 380)
    edge.addColorStop(0, 'rgba(220,230,240,0)')
    edge.addColorStop(1, 'rgba(220,230,240,0.35)')
    c.fillStyle = edge
    c.fillRect(0, 0, 512, 512)
  })
}

/** The paper seal of 48: a stamped strip glued across the gap of the leaf. */
function sealTexture() {
  return canvasTexture(512, 96, (c) => {
    c.fillStyle = '#d8d1bd'
    c.fillRect(0, 0, 512, 96)
    c.fillStyle = 'rgba(120, 90, 50, 0.25)'
    for (let i = 0; i < 18; i++) c.fillRect((i * 97) % 512, (i * 31) % 96, 30, 6)
    c.strokeStyle = 'rgba(70, 60, 140, 0.75)'
    c.lineWidth = 4
    c.beginPath()
    c.arc(256, 48, 34, 0, Math.PI * 2)
    c.stroke()
    c.beginPath()
    c.arc(256, 48, 22, 0, Math.PI * 2)
    c.stroke()
    c.fillStyle = 'rgba(40, 40, 60, 0.7)'
    for (let i = 0; i < 10; i++) c.fillRect(40 + i * 18, 40 + (i % 3) * 4, 10, 3)
    for (let i = 0; i < 9; i++) c.fillRect(320 + i * 18, 44 - (i % 2) * 4, 10, 3)
  })
}

/** TV static, redrawn a few times a second. */
function useStatic(active: boolean) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 72
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.magFilter = THREE.NearestFilter
    return t
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  const tick = useRef(0)
  useFrame(() => {
    if (!active || tick.current++ % 3) return
    const canvas = texture.image
    const c = canvas.getContext('2d')!
    const image = c.createImageData(canvas.width, canvas.height)
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 200 + 30
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v
      image.data[i + 3] = 255
    }
    c.putImageData(image, 0, 0)
    texture.needsUpdate = true
  })
  return texture
}

/** The room as the TV shows it on night 3: from its own top corner, over the sofa. */
function useRoomCamera(active: boolean) {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const { target, camera } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(256, 192)
    const camera = new THREE.PerspectiveCamera(78, 4 / 3, 0.05, 12)
    // High in the corner by the window and the shared wall, looking down at the sofa.
    camera.position.set(-1.8, 2.45, -3.2)
    camera.lookAt(-1.2, 0.6, -1.2)
    camera.layers.enable(REFLECTION_LAYER)
    return { target, camera }
  }, [])
  useEffect(() => () => target.dispose(), [target])
  const frame = useRef(0)
  useFrame(() => {
    if (!active || frame.current++ % 2) return
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(previous)
  })
  return target.texture
}

function TvScreen({ state, detailed }: { state: string; detailed: boolean }) {
  const screen = tvScreen()
  // Without the GPU for a second view (software GL) the picture is static too.
  const noise = useStatic(state === 'static' || (state === 'cam' && !detailed))
  const room = useRoomCamera(state === 'cam' && detailed)
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => material.dispose(), [material])
  const shown = state === 'static' || state === 'cam'
  // An old set: the picture is grey-green and a little dim.
  material.map = state === 'cam' && detailed ? room : noise
  material.color.set(state === 'cam' ? '#9fb3a2' : '#b9bdb8')
  material.needsUpdate = true
  return (
    <mesh
      visible={shown}
      position={[screen.centre[0] - 0.012, screen.centre[1], screen.centre[2]]}
      rotation-y={-Math.PI / 2}
      material={material}
    >
      <planeGeometry args={[screen.width, screen.height]} />
    </mesh>
  )
}

export function NightProps({
  objects,
  surfaces,
  detailed,
  extension,
}: {
  objects: Objects
  surfaces: SurfaceMaterials
  detailed: boolean
  /** Night 3's corridor stretch: the landing (48's seal) moves with the hall. */
  extension: number
}) {
  const parts = useMemo(() => {
    const mat = (m: THREE.MeshStandardMaterial) => (detailed ? m : softwareMaterial(m))
    const decal = (map: THREE.Texture, opacity = 1) =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    return {
      tally: decal(tallyTexture(), 0.75),
      palm: decal(palmTexture(), 0),
      frost: decal(frostTexture(), 0.9),
      seal: mat(new THREE.MeshStandardMaterial({ map: sealTexture(), roughness: 0.9 })),
      pale: new THREE.MeshBasicMaterial({
        color: '#e9dcc0',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
      dark: new THREE.MeshBasicMaterial({ color: '#0c0b0a' }),
      glass: mat(
        new THREE.MeshStandardMaterial({ color: '#8f9694', roughness: 0.08, metalness: 0.7 }),
      ),
      board: mat(new THREE.MeshStandardMaterial({ color: '#5a3d26', roughness: 0.8 })),
      paper: mat(new THREE.MeshStandardMaterial({ color: '#ddd5c2', roughness: 0.9 })),
    }
  }, [detailed])
  useEffect(
    () => () => {
      for (const m of Object.values(parts)) {
        ;(m as THREE.MeshBasicMaterial).map?.dispose()
        m.dispose()
      }
    },
    [parts],
  )
  const palmAt = useRef(-1)
  useFrame(({ clock }) => {
    // The print fades over twelve seconds once it has appeared.
    if (objects['party_wall'] === 'palm') {
      if (palmAt.current < 0) palmAt.current = clock.elapsedTime
      const t = clock.elapsedTime - palmAt.current
      parts.palm.opacity = Math.max(0, Math.min(1, t / 1.5) * (1 - t / 12)) * 0.8
    } else {
      palmAt.current = -1
      parts.palm.opacity = 0
    }
  })
  const wardrobe = objectById('wardrobe')!
  const leaf = wardrobe.size[0] / 2 - 0.004
  const open = objects['wardrobe'] === 'open'
  const cabinet = objectById('mirror_cabinet')!
  const window = objectById('room_window')!
  const clock = objectById('clock')!
  const board = objectPoint('floorboard')!
  const seal = objects['seal'] ?? 'intact'
  return (
    <group name="night-props">
      {/* The wardrobe: two leaves on the corridor wall; open, they show the back wall. */}
      {[-1, 1].map((side) => {
        // Hinged at the outer edges, swinging out into the corridor.
        const hingeZ = wardrobe.position[2] + (side * wardrobe.size[0]) / 2
        return (
          <group
            key={side}
            position={[wardrobe.position[0] + 0.02, 0, hingeZ]}
            rotation-y={open ? -side * 1.25 : 0}
          >
            <mesh
              position={[0, wardrobe.size[1] / 2, (-side * leaf) / 2]}
              material={surfaces.door_paint}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wardrobe.size[2], wardrobe.size[1], leaf]} />
            </mesh>
          </group>
        )
      })}
      <mesh
        position={[PARTY_X + 0.095, 1.2, wardrobe.position[2]]}
        rotation-y={Math.PI / 2}
        material={parts.tally}
      >
        <planeGeometry args={[1.0, 1.25]} />
      </mesh>
      <TvScreen state={objects['tv'] ?? 'off'} detailed={detailed} />
      {objects['mirror_cabinet'] === 'open' && (
        <group position={cabinet.position}>
          {/* Inside: dark shelves where the glass was; the door swung out to the left. */}
          <mesh
            position={[0, cabinet.size[1] / 2, cabinet.size[2] / 2 + 0.006]}
            material={parts.dark}
          >
            <planeGeometry args={[cabinet.size[0] * 0.92, cabinet.size[1] * 0.88]} />
          </mesh>
          <group position={[-cabinet.size[0] / 2, 0, cabinet.size[2] / 2 + 0.01]} rotation-y={-1.9}>
            <mesh position={[cabinet.size[0] / 2, cabinet.size[1] / 2, 0]} material={parts.glass}>
              <boxGeometry args={[cabinet.size[0] * 0.95, cabinet.size[1] * 0.9, 0.015]} />
            </mesh>
          </group>
        </group>
      )}
      <mesh
        position={[PARTY_X + 0.112, 1.42, -0.45]}
        rotation-y={Math.PI / 2}
        material={parts.palm}
      >
        <planeGeometry args={[0.2, 0.25]} />
      </mesh>
      {objects['room_window'] === 'frost' && (
        <mesh
          position={[
            window.position[0],
            window.position[1] + window.size[1] / 2,
            window.position[2] + 0.06,
          ]}
          material={parts.frost}
        >
          <planeGeometry args={[window.size[0] * 0.92, window.size[1] * 0.9]} />
        </mesh>
      )}
      {objects['floorboard'] === 'raised' && (
        <group position={[board[0], 0, board[2]]} rotation-y={0.2}>
          <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} material={parts.dark}>
            <planeGeometry args={[0.12, 0.7]} />
          </mesh>
          <mesh position={[0, 0.045, 0.08]} rotation-x={0.12} material={parts.board} castShadow>
            <boxGeometry args={[0.12, 0.022, 0.72]} />
          </mesh>
        </group>
      )}
      {/* 48's seal across the leaf's gap on the landing side; torn, half of it on the floor. */}
      <group position={[mirrorX(0) + 0.42, 1.25, 4.79 + extension]}>
        {seal === 'intact' ? (
          <mesh rotation-z={-0.12} material={parts.seal}>
            <planeGeometry args={[0.36, 0.07]} />
          </mesh>
        ) : (
          <mesh position={[0.1, 0.01, 0]} rotation-z={-0.4} material={parts.seal}>
            <planeGeometry args={[0.16, 0.065]} />
          </mesh>
        )}
      </group>
      {seal !== 'intact' && (
        <mesh
          position={[mirrorX(0) + 0.15, 0.003, 5.05 + extension]}
          rotation={[-Math.PI / 2, 0, 0.7]}
          material={parts.seal}
        >
          <planeGeometry args={[0.2, 0.065]} />
        </mesh>
      )}
      {/* Where the clock hung: the wallpaper under it kept its colour. */}
      {(objects['clock'] === 'shifted' || objects['clock'] === 'in_hand') && (
        <mesh
          position={[
            clock.position[0],
            clock.position[1] + clock.size[1] / 2,
            clock.position[2] - 0.02,
          ]}
          material={parts.pale}
        >
          <circleGeometry args={[clock.size[0] / 2 + 0.01, 32]} />
        </mesh>
      )}
      {objects['clock'] === 'in_hand' && objects['diary_7'] !== 'taken' && (
        <mesh
          position={[
            clock.position[0] + 0.03,
            clock.position[1] + clock.size[1] / 2 - 0.02,
            clock.position[2] - 0.015,
          ]}
          rotation-z={0.15}
          material={parts.paper}
        >
          <planeGeometry args={[0.1, 0.14]} />
        </mesh>
      )}
    </group>
  )
}
