/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD, objectById } from '@/content/world/layout'
import { manifest } from '@/assets/loader'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { loadHdri, loadModel } from './assets'
import { CLOCK_SHIFTED } from './layout'
import { appearanceFor } from './figure'
import { Architecture } from './world/Architecture'
import { Doors } from './world/Doors'
import { Figure } from './world/Figure'
import { Phone } from './world/Phone'
import { Changes } from './world/Changes'
import type { WorldState } from '@/core/director/types'
import { formatClock } from '@/core/director/clock'
import { phoneTime } from './phone'
import { Rustam } from './world/Rustam'
import { Downstairs } from './world/Downstairs'
import { NightProps } from './world/NightProps'
import { Bus } from './world/Bus'
import { Furniture, placeClock, type Models } from './world/Furniture'
import { Lighting } from './world/Lighting'
import { loadSurfaces, type SurfaceMaterials } from './world/materials'
import { Outside } from './world/Outside'
import { softwareModel } from './world/software'
import { primeGeometries } from './world/prime'

/**
 * Flat 47, the landing and flat 48, built from src/content/world/layout.ts with the
 * shipped PBR assets. Story-driven state comes in as props; the clock that moves when
 * nobody looks lives here because it needs the camera frustum.
 */
interface Loaded {
  models: Models
  surfaces: SurfaceMaterials
  environment: THREE.Texture
}

function useWorldAssets(detailed: boolean): Loaded | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  useEffect(() => {
    let cancelled = false
    const modelIds = [...new Set(WORLD.objects.map((o) => o.asset))].filter(
      (id) => !id.startsWith('proc:') && manifest.assets.some((a) => a.id === id),
    )
    void Promise.all([
      Promise.all(
        modelIds.map(async (id) => {
          const model = await loadModel(id)
          return [id, detailed ? model : await softwareModel(model)] as const
        }),
      ),
      loadSurfaces(detailed),
      loadHdri('dikhololo_night'),
    ]).then(([models, surfaces, environment]) => {
      if (!cancelled) setLoaded({ models: new Map(models), surfaces, environment })
    })
    return () => {
      cancelled = true
    }
  }, [detailed])
  return loaded
}

const SKIP = new Set(['clock', 'phone', 'room_chair', 'wardrobe'])
/** The clock's states in which it is off the wall, in both hands (night 5, ending C). */
const HELD = new Set(['in_hand', 'winding', '3:18'])

function Clock({
  models,
  requested,
  inHand,
  past317,
  detailed,
}: {
  models: Models
  requested: boolean
  /** Night 5: off its nail and held low in both hands. */
  inHand: boolean
  /** Ending C: wound, the minute hand has moved on to 3:18. */
  past317: boolean
  detailed: boolean
}) {
  const camera = useThree((s) => s.camera)
  const o = objectById('clock')!
  const gltf = models.get(o.asset)
  const node = useMemo(() => (gltf ? placeClock(o, gltf, detailed) : null), [gltf, o, detailed])
  const [initial] = useState(requested)
  const shifted = useRef(initial)
  const group = useRef<THREE.Group>(null)
  const frustum = useRef(new THREE.Frustum())
  const matrix = useRef(new THREE.Matrix4())
  const bounds = useRef(new THREE.Box3())
  const place = (moved: boolean) => {
    const g = group.current
    if (!g) return
    if (moved) {
      // On the shared wall now, facing into the room.
      g.position.set(
        CLOCK_SHIFTED[0] + o.size[2] / 2 + 0.008,
        CLOCK_SHIFTED[1] - o.size[1] / 2,
        CLOCK_SHIFTED[2],
      )
      g.rotation.y = Math.PI / 2
    } else {
      g.position.set(...o.position)
      g.rotation.y = 0
    }
  }
  useEffect(() => place(shifted.current))
  // One minute on: the minute hand turns 6° clockwise about the face's normal.
  const turned = useRef(false)
  useEffect(() => {
    const hand = node?.getObjectByName('wall_clock_minute_hand')
    if (!hand?.parent || !group.current || turned.current === past317) return
    group.current.updateMatrixWorld(true)
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(group.current.matrixWorld)
    const parent = new THREE.Quaternion()
    hand.parent.getWorldQuaternion(parent)
    const axis = normal.applyQuaternion(parent.invert()).normalize()
    hand.rotateOnAxis(axis, ((past317 ? -1 : 1) * Math.PI) / 30)
    turned.current = past317
  }, [node, past317])
  const forward = useRef(new THREE.Vector3())
  useFrame(() => {
    if (inHand && group.current) {
      // Held at the chest, face up toward the eyes.
      camera.getWorldDirection(forward.current)
      group.current.position.copy(camera.position).addScaledVector(forward.current, 0.42)
      group.current.position.y -= 0.32
      group.current.rotation.set(-1.0, Math.atan2(-forward.current.x, -forward.current.z), 0, 'YXZ')
      return
    }
    // A still's changed state represents a completed unobserved revisit.
    if (
      (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
      requested &&
      new URLSearchParams(window.location.search).has('cam') &&
      new URLSearchParams(window.location.search).get('render') === 'still'
    ) {
      shifted.current = true
      place(true)
    }
    if (requested && !shifted.current && group.current) {
      camera.updateMatrixWorld()
      matrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.current.setFromProjectionMatrix(matrix.current)
      bounds.current.setFromObject(group.current)
      // It may only move while unobserved.
      if (!frustum.current.intersectsBox(bounds.current)) {
        shifted.current = true
        place(true)
      }
    }
    desktopRuntime.clockShifted = shifted.current
  })
  return <group ref={group}>{node && <primitive object={node} />}</group>
}

export function World({
  world,
  flags,
  lateNight,
  corridorLength,
  lightsOff,
  shadows,
  peephole,
}: {
  world: WorldState
  flags: Record<string, unknown>
  lateNight: boolean
  corridorLength: number
  lightsOff: Set<number>
  shadows: boolean
  /** An eye at the entrance peephole: the door stays shut. */
  peephole: boolean
}) {
  const assets = useWorldAssets(shadows)
  const scene = useThree((s) => s.scene)
  const extension = corridorLength - 1
  const appearance = useMemo(() => appearanceFor(world.figure), [world.figure])
  const outage = !world.power
  const closed = useMemo(
    () =>
      new Set([
        ...(appearance?.closedDoors ?? []),
        ...(peephole || world.doors['front_door'] === 'closed' ? ['front_door'] : []),
        ...(world.sequence === 'endA' && world.doors['door48'] === 'closed'
          ? ['front_door48']
          : []),
      ]),
    [appearance, peephole, world.doors, world.sequence],
  )
  const held = useMemo(
    () =>
      new Set(
        Object.entries(world.doors).flatMap(([id, s]) =>
          s === 'open' ? [id === 'door48' ? 'front_door48' : id] : [],
        ),
      ),
    [world.doors],
  )
  const dark = useMemo(
    () => new Set([...lightsOff, ...(appearance?.darkCircuits ?? [])]),
    [lightsOff, appearance],
  )
  const gl = useThree((s) => s.gl)
  // Each night (and the first frame of the world) uploads every geometry it holds, shown or
  // not: nothing reaches the GPU later in the middle of the night.
  const sequence = world.sequence
  useEffect(() => {
    if (!assets) return
    const id = requestAnimationFrame(() => {
      primeGeometries(gl, scene)
    })
    return () => cancelAnimationFrame(id)
  }, [assets, gl, scene, sequence])
  useEffect(() => {
    if (!assets) return
    scene.environment = shadows ? assets.environment : null
    scene.environmentIntensity = 0.05
    desktopRuntime.worldReady = true
    return () => {
      scene.environment = null
      desktopRuntime.worldReady = false
    }
  }, [assets, scene, shadows])
  if (!assets) return null
  const door48 = world.doors['door48']
  return (
    <>
      <Outside
        surfaces={assets.surfaces}
        windowsDark={world.windows !== 'lit'}
        allAtOnce={world.windows === 'allAtOnce'}
        someone={world.objects['opposite'] ?? ''}
      />
      <Architecture surfaces={assets.surfaces} extension={extension} />
      <Furniture
        models={assets.models}
        surfaces={assets.surfaces}
        extension={extension}
        skip={SKIP}
        mirrors={shadows}
      />
      <Clock
        models={assets.models}
        requested={world.objects['clock'] === 'shifted'}
        inHand={HELD.has(world.objects['clock'] ?? '')}
        past317={world.objects['clock'] === '3:18'}
        detailed={shadows}
      />
      <NightProps
        objects={world.objects}
        surfaces={assets.surfaces}
        detailed={shadows}
        extension={extension}
      />
      <Doors
        surfaces={assets.surfaces}
        extension={extension}
        doorAjar={door48 === 'ajar' || door48 === 'open'}
        closed={closed}
        held={held}
        story={world.doors}
        // Blurring glass costs a second scene pass; only while something stands behind it.
        frosted={shadows && appearance?.id === 'frosted'}
      />
      <Lighting
        outage={outage}
        daylight={world.daylight}
        daylightMs={world.daylightMs}
        lightsOff={dark}
        extension={extension}
        shadows={shadows}
        landingDark={!!appearance?.landingDark}
        landingDead={world.lights['landing'] === 'off'}
      />
      <Figure
        appearance={appearance}
        node={`${world.sequence}:${world.figure ?? ''}`}
        detailed={shadows}
        outage={outage}
      />
      <Phone
        phone={world.phone}
        time={phoneTime(world.phone, formatClock(world.clock), lateNight && world.night === 1)}
        night={world.night}
        detailed={shadows}
      />
      <Changes
        night={world.night}
        flags={flags}
        daylight={world.daylight}
        node={world.sequence}
        models={assets.models}
        detailed={shadows}
        extension={extension}
      />
      {/* The hall and the landing move with the night-3 corridor's extra metres. */}
      <group position-z={extension}>
        <Downstairs
          surfaces={assets.surfaces}
          models={assets.models}
          daylight={world.daylight}
          muhabbat={world.objects['muhabbat'] ?? 'closed'}
          bread={world.objects['bread_bag'] === 'sill'}
          halva={world.objects['halva'] ?? 'none'}
          detailed={shadows}
        />
      </group>
      {world.sequence === 'endB' && (
        <Bus moving={world.objects['bus'] === 'moving'} detailed={shadows} />
      )}
      <Rustam
        state={world.objects['rustam'] ?? 'gone'}
        keysInLock={world.objects['key_ring'] === 'in_lock'}
      />
    </>
  )
}
