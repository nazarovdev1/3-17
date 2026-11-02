/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { objectPoint } from '@/content/world/objects'
import { onDirectorEvents } from '@/ui/gameStore'

/**
 * Rustam aka on the dark landing (owner decision R0 §4): no body at all. In the weak phone
 * torch only his gloved hand and a coat sleeve reach out of the dark corner, and his breath
 * rises in the cold; the phone's light dies before it reaches where the rest of him stands.
 * When he has gone, the key ring may hang in the lock of 47.
 */
/** 'at_door' | 'offer_form' | 'offer_keys' | 'gone' (the Director's object state). */
type State = string

const FEET = objectPoint('rustam_body')!
const BODY: THREE.Vector3Tuple = [FEET[0], 0.9, FEET[2]]
const HEAD = objectPoint('rustam')!
const HAND = objectPoint('rustam_hand')!
const LOCK = objectPoint('key_ring')!

function radial(inner: string, outer: string): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const c = canvas.getContext('2d')!
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.55, inner)
  g.addColorStop(1, outer)
  c.fillStyle = g
  c.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function keyRing(material: { steel: THREE.Material; brass: THREE.Material }): THREE.Group {
  const ring = new THREE.Group()
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0016, 6, 18), material.steel))
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.058, 0.0025), material.steel)
  door.position.set(0.004, -0.04, 0)
  door.rotation.z = 0.18
  const small = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.034, 0.002), material.brass)
  small.position.set(-0.01, -0.028, 0.002)
  small.rotation.z = -0.35
  ring.add(door, small)
  return ring
}

/** A printed form: a heading, ruled lines and tick boxes, so the sheet reads as a form in the dark. */
function formTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 150
  canvas.height = 210
  const c = canvas.getContext('2d')!
  c.fillStyle = '#b9b3a2'
  c.fillRect(0, 0, 150, 210)
  c.fillStyle = '#3b3a36'
  c.fillRect(30, 16, 90, 8)
  c.fillStyle = '#6d6a62'
  for (let y = 44; y < 190; y += 18) {
    c.fillRect(14, y, 86 - ((y / 18) % 3) * 14, 3)
    c.strokeStyle = '#4a4943'
    c.strokeRect(112, y - 4, 10, 10)
  }
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

/**
 * A gloved hand pinching a sheet by its top edge. Local +z points along the arm, away from the
 * body; the paper hangs below the pinch and faces whoever stands in front of it.
 */
function gloveHand(
  glove: THREE.Material,
  paper: THREE.Material,
): { hand: THREE.Group; sheet: THREE.Mesh } {
  const hand = new THREE.Group()
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.032, 0.085), glove)
  palm.position.z = 0.012
  hand.add(palm)
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.045, 3, 8), glove)
    finger.rotation.x = Math.PI / 2 + 0.25
    finger.position.set(-0.03 + i * 0.02, -0.006, 0.086)
    hand.add(finger)
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.04, 3, 8), glove)
  thumb.rotation.set(Math.PI / 2 - 0.3, 0.5, 0)
  thumb.position.set(-0.034, 0.024, 0.07)
  hand.add(thumb)
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), paper)
  // Hanging from the pinch under the fingertips.
  sheet.position.set(-0.004, -0.108, 0.098)
  hand.add(sheet)
  return { hand, sheet }
}

export function Rustam({ state, keysInLock }: { state: State; keysInLock: boolean }) {
  const parts = useMemo(() => {
    const coat = new THREE.MeshStandardMaterial({ color: '#202124', roughness: 1 })
    const glove = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.6 })
    const steel = new THREE.MeshStandardMaterial({
      color: '#5c5f63',
      metalness: 0.6,
      roughness: 0.55,
    })
    const brass = new THREE.MeshStandardMaterial({
      color: '#7a5c26',
      metalness: 0.6,
      roughness: 0.5,
    })
    const formMap = formTexture()
    // A faint glow of its own: a sheet held in the weak torch must read as paper, not as a hole.
    const paper = new THREE.MeshStandardMaterial({
      map: formMap,
      emissive: '#ffffff',
      emissiveMap: formMap,
      emissiveIntensity: 0.16,
      roughness: 0.95,
      side: THREE.DoubleSide,
    })
    // A sleeve: wider at the elbow, narrowing to the cuff; the hand is a closed glove.
    // Thick winter wool, a little creased: wider than an arm, open at the dark end.
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.072, 0.42, 16, 6, true), coat)
    const crease = sleeve.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < crease.count; i++) {
      const y = crease.getY(i)
      const angle = Math.atan2(crease.getZ(i), crease.getX(i))
      const k = 1 + Math.sin(angle * 5 + y * 30) * 0.06
      crease.setX(i, crease.getX(i) * k)
      crease.setZ(i, crease.getZ(i) * k)
    }
    sleeve.geometry.computeVertexNormals()
    const { hand, sheet } = gloveHand(glove, paper)
    // A pale shirt cuff between the coat sleeve and the glove.
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.035, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: '#8d8b84', roughness: 1, side: THREE.DoubleSide }),
    )
    cuff.geometry.rotateX(Math.PI / 2)
    cuff.position.z = -0.045
    hand.add(cuff)
    const keys = keyRing({ steel, brass })
    const lockKeys = keyRing({ steel, brass })
    // In the palm, under the phone's light at a hand's distance: shown as seen, not lit raw.
    const palmKeys = keyRing({
      steel: new THREE.MeshBasicMaterial({ color: '#6b6e72' }),
      brass: new THREE.MeshBasicMaterial({ color: '#8c6a2c' }),
    })
    palmKeys.scale.setScalar(1.6)
    palmKeys.visible = false
    const breath = Array.from({ length: 3 }, () => {
      const puff = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: radial('rgba(210,215,222,0.18)', 'rgba(210,215,222,0)'),
          depthWrite: false,
          transparent: true,
        }),
      )
      puff.visible = false
      return puff
    })
    return {
      coat,
      glove,
      steel,
      brass,
      paper,
      sleeve,
      hand,
      sheet,
      keys,
      lockKeys,
      palmKeys,
      breath,
    }
  }, [])
  useEffect(
    () => () => {
      const { sleeve, hand, sheet, breath, keys, lockKeys } = parts
      sleeve.geometry.dispose()
      hand.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
      sheet.geometry.dispose()
      parts.paper.map?.dispose()
      for (const group of [keys, lockKeys, parts.palmKeys])
        group.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.dispose())
      for (const sprite of breath) {
        sprite.material.map?.dispose()
        sprite.material.dispose()
      }
      for (const m of [parts.coat, parts.glove, parts.steel, parts.brass, parts.paper]) m.dispose()
    },
    [parts],
  )
  const camera = useThree((s) => s.camera)
  // The ring in the player's palm while the eyes are down on it (the 'hands' camera effect).
  const palm = useRef(0)
  useEffect(
    () =>
      onDirectorEvents((events) => {
        if (events.some((e) => e.type === 'camera' && e.effect === 'hands')) palm.current = 2.6
      }),
    [],
  )
  const forward = useMemo(() => new THREE.Vector3(), [])
  const group = useRef<THREE.Group>(null)
  const start = useRef(new THREE.Vector3())
  const end = useRef(new THREE.Vector3())

  // The first frames draw every part once, in or out of view, so nothing uploads to the GPU
  // (a hitch) at the moment he holds out the form or the keys.
  const warm = useRef(0)
  useFrame(({ clock }, delta) => {
    if (warm.current < 3) {
      const warming = warm.current < 2
      if (group.current) group.current.visible = true
      const { sleeve, hand, sheet, keys, lockKeys, palmKeys, breath } = parts
      for (const part of [sleeve, hand, sheet, keys, lockKeys, palmKeys, ...breath]) {
        part.visible = true
        part.traverse((o) => {
          if (warming) {
            o.userData.frustumCulled ??= o.frustumCulled
            o.frustumCulled = false
          } else o.frustumCulled = (o.userData.frustumCulled as boolean | undefined) ?? true
        })
      }
      warm.current++
      return
    }
    const t = clock.elapsedTime
    palm.current = Math.max(0, palm.current - Math.min(delta, 0.05))
    parts.palmKeys.visible = palm.current > 0
    if (palm.current > 0) {
      camera.getWorldDirection(forward)
      parts.palmKeys.position.copy(camera.position).addScaledVector(forward, 0.3)
      parts.palmKeys.position.y -= 0.02
      parts.palmKeys.quaternion.copy(camera.quaternion)
      parts.palmKeys.rotateX(-0.5)
      parts.palmKeys.rotateZ(Math.sin(t * 1.6) * 0.06)
    }
    // Before he turns to the stairs only the keys rattle in the lock; he is not in the light.
    const present = state === 'offer_form' || state === 'offer_keys'
    if (group.current) group.current.visible = present
    parts.lockKeys.visible = keysInLock
    parts.lockKeys.position.set(...LOCK)
    parts.lockKeys.rotation.set(0, 0, Math.sin(t * 1.3) * 0.08)
    if (!present) return
    // The hand, held out toward whoever comes up the stairs.
    const target = HAND
    const sway = Math.sin(t * 1.1) * 0.006
    parts.hand.position.set(target[0], target[1] + sway, target[2])
    // The sleeve runs from the wrist back into the dark; only its first half-metre shows.
    start.current
      .copy(parts.hand.position)
      .lerp(new THREE.Vector3(BODY[0], BODY[1] + 0.35, BODY[2]), 0.55)
    end.current.copy(parts.hand.position)
    const mid = start.current.clone().lerp(end.current, 0.55)
    parts.sleeve.position.copy(mid)
    parts.sleeve.lookAt(end.current)
    parts.sleeve.rotateX(Math.PI / 2)
    parts.sleeve.scale.y = start.current.distanceTo(end.current) / 0.42
    // The hand points along the arm, out of the dark; the paper hangs from its pinch.
    parts.hand.lookAt(parts.hand.position.clone().add(end.current.clone().sub(start.current)))
    parts.sheet.visible = state === 'offer_form'
    parts.keys.visible = state === 'offer_keys'
    parts.keys.position.set(target[0], target[1] - 0.035, target[2] + 0.03)
    parts.keys.rotation.set(0, 0, Math.sin(t * 2.2) * 0.12)
    // Breath in the cold every three seconds, rising and thinning out.
    parts.breath.forEach((puff, i) => {
      const phase = (t + i * 1.0) % 3
      puff.visible = phase < 1.6
      const k = phase / 1.6
      puff.position.set(HEAD[0] - 0.12 * k, HEAD[1] + 0.05 + k * 0.18, HEAD[2] + 0.12 + k * 0.1)
      puff.scale.setScalar(0.08 + k * 0.22)
      puff.material.opacity = Math.max(0, 1 - k) * 0.9
    })
  })
  return (
    <>
      <group ref={group}>
        <primitive object={parts.sleeve} />
        <primitive object={parts.hand} />
        <primitive object={parts.keys} />
        {parts.breath.map((puff, i) => (
          <primitive key={i} object={puff} />
        ))}
      </group>
      <primitive object={parts.lockKeys} />
      <primitive object={parts.palmKeys} />
    </>
  )
}
