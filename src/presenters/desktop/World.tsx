/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WORLD, objectById } from '@/content/world/layout'
import { manifest } from '@/assets/loader'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { loadHdri, loadModel } from './assets'
import { CLOCK_SHIFTED } from './layout'
import type { Appearance } from './figure'
import { Architecture } from './world/Architecture'
import { Doors } from './world/Doors'
import { Figure } from './world/Figure'
import { Phone } from './world/Phone'
import { Changes } from './world/Changes'
import type { GameState } from '@/core/state/types'
import { Furniture, placeClock, type Models } from './world/Furniture'
import { Lighting } from './world/Lighting'
import { loadSurfaces, type SurfaceMaterials } from './world/materials'
import { Outside } from './world/Outside'
import { softwareModel } from './world/software'

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

const SKIP = new Set(['clock', 'phone', 'room_chair'])

function Clock({
  models,
  requested,
  detailed,
}: {
  models: Models
  requested: boolean
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
      g.position.set(CLOCK_SHIFTED[0] - 0.09, CLOCK_SHIFTED[1] - o.size[1] / 2, CLOCK_SHIFTED[2])
      g.rotation.y = Math.PI / 2
    } else {
      g.position.set(...o.position)
      g.rotation.y = 0
    }
  }
  useEffect(() => place(shifted.current))
  useFrame(() => {
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
  outage,
  doorAjar,
  corridorLength,
  windowsDark,
  lightsOff,
  clockRequested,
  shadows,
  appearance,
  node,
  state,
  peephole,
}: {
  outage: boolean
  doorAjar: boolean
  corridorLength: number
  windowsDark: boolean
  lightsOff: Set<number>
  clockRequested: boolean
  shadows: boolean
  /** Where the figure may be at this beat (see ./figure.ts). */
  appearance: Appearance | null
  node: string
  state: GameState
  /** An eye at the entrance peephole: the door stays shut. */
  peephole: boolean
}) {
  const assets = useWorldAssets(shadows)
  const scene = useThree((s) => s.scene)
  const extension = corridorLength - 1
  const closed = useMemo(
    () => new Set([...(appearance?.closedDoors ?? []), ...(peephole ? ['front_door'] : [])]),
    [appearance, peephole],
  )
  const dark = useMemo(
    () => new Set([...lightsOff, ...(appearance?.darkCircuits ?? [])]),
    [lightsOff, appearance],
  )
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
  return (
    <>
      <Outside surfaces={assets.surfaces} windowsDark={windowsDark} />
      <Architecture surfaces={assets.surfaces} extension={extension} />
      <Furniture
        models={assets.models}
        surfaces={assets.surfaces}
        extension={extension}
        skip={SKIP}
        mirrors={shadows}
      />
      <Clock models={assets.models} requested={clockRequested} detailed={shadows} />
      <Doors
        surfaces={assets.surfaces}
        extension={extension}
        doorAjar={doorAjar}
        closed={closed}
        // Blurring glass costs a second scene pass; only while something stands behind it.
        frosted={shadows && appearance?.id === 'frosted'}
      />
      <Lighting
        outage={outage}
        lightsOff={dark}
        extension={extension}
        shadows={shadows}
        landingDark={!!appearance?.landingDark}
      />
      <Figure appearance={appearance} node={node} detailed={shadows} outage={outage} />
      <Phone state={state} node={node} detailed={shadows} />
      <Changes state={state} node={node} models={assets.models} detailed={shadows} />
    </>
  )
}
