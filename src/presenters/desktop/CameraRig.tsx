/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Box3,
  Euler,
  Frustum,
  Matrix4,
  Vector3,
  type PerspectiveCamera,
  type SpotLight,
  CanvasTexture,
  SRGBColorSpace,
} from 'three'
import { audio } from '@/audio/engine'
import { ui } from '@/content/text'
import { useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import {
  interactionPoint,
  nodePoint,
  VIEWS,
  AUDIT_VIEWS,
  walk,
  SWITCHES,
  REACH,
  OBJECTS,
  footstepAt,
  type Point,
} from './layout'
import type { Choice, Step } from '@/core/engine/types'
import { softwareLight } from './world/softwareMaterial'

export interface RigProps {
  step: Step
  choices: Choice[]
  paused: boolean
  flashlight: boolean
  onNear: (choice: Choice | null) => void
  onControl: (mode: 'lock' | 'drag') => void
  onFlashlight: () => void
  onSwitch: (index: number) => void
  onExtend: () => void
  extension: number
  /** The torch casts shadows (and projects its cookie) where the GPU allows. */
  shadows: boolean
  /** Looking through the entrance peephole by choice (E at the door), not by the story. */
  peeking: boolean
  onPeek: (on: boolean) => void
}

/** Prompts for the peephole, which is not a story choice. */
const PEEK: Choice = { id: '__peek', label: ui('desktop.peek'), to: '' }
const UNPEEK: Choice = { id: '__unpeek', label: ui('desktop.unpeek'), to: '' }

/** The peephole lens, on the landing side of the entrance leaf. */
export const PEEPHOLE_EYE: Point = [0, 1.6, 4.75]
export function CameraRig({
  step,
  choices,
  paused,
  flashlight,
  onNear,
  onControl,
  onFlashlight,
  onSwitch,
  onExtend,
  extension,
  shadows,
  peeking,
  onPeek,
}: RigProps) {
  const cookie = useMemo(() => makeCookie(), [])
  useEffect(() => () => cookie.dispose(), [cookie])
  const { camera, gl } = useThree()
  const angles = useRef({ yaw: 0, pitch: 0 })
  const keys = useRef(new Set<string>())
  const dragging = useRef(false)
  const mouse = useRef({ x: 0, y: 0 })
  const near = useRef<Choice | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lamp = useRef<SpotLight>(null)
  const forward = useRef(new Vector3())
  const moved = useRef(0)
  /** Walking velocity (m/s, world x/z): eased toward the keys for a little weight. */
  const velocity = useRef({ x: 0, z: 0 })
  const bob = useRef(0)
  const stepDistance = useRef(0)
  const wasLooking = useRef(false)
  const doorBounds = useRef(new Box3())
  const frustum = useRef(new Frustum())
  const viewProjection = useRef(new Matrix4())
  const mirrorHistory = useRef<{ time: number; x: number; yaw: number; pitch: number }[]>([])

  const viewpoint = step.node.mobile?.vignette === 'window' ? 'balcony' : step.node.location
  const peephole = step.node.mobile?.vignette === 'peephole' || peeking
  /** Where the player stood before stepping up to the peephole. */
  const beforePeek = useRef<{ position: Vector3; yaw: number; pitch: number } | null>(null)
  const turnedBack = step.node.id === 'n3_corridor_stop'
  const params = new URLSearchParams(window.location.search)
  const auditView =
    import.meta.env.VITE_GAME_API === '1' && params.get('render') === 'still'
      ? AUDIT_VIEWS[params.get('auditView') ?? '']
      : undefined
  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    if (peeking && !beforePeek.current) {
      beforePeek.current = { position: camera.position.clone(), ...angles.current }
    } else if (!peeking && beforePeek.current) {
      // Back from the peephole to where the player stood.
      const { position, yaw, pitch } = beforePeek.current
      beforePeek.current = null
      camera.position.copy(position)
      angles.current = { yaw, pitch }
      camera.rotation.set(pitch, yaw, 0, 'YXZ')
      perspective.fov = 66
      perspective.updateProjectionMatrix()
      return
    }
    const view = auditView ?? VIEWS[viewpoint]
    const spawn: Point = peephole ? PEEPHOLE_EYE : view.position
    camera.position.set(...spawn)
    velocity.current = { x: 0, z: 0 }
    mirrorHistory.current = []
    angles.current = {
      yaw: peephole ? Math.PI : turnedBack ? 0 : view.yaw,
      // At the lens the eye rises a little: whoever stands there is taller than the door's eye.
      pitch: peeking ? 0.32 : (view.pitch ?? 0),
    }
    camera.rotation.set(angles.current.pitch, angles.current.yaw, 0, 'YXZ')
    // R3F owns a mutable Three camera; this is imperative scene synchronization.
    perspective.fov = peephole ? 110 : 66
    perspective.updateProjectionMatrix()
  }, [viewpoint, peephole, peeking, turnedBack, camera, auditView])

  useEffect(() => {
    const stopListening = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      audio.setListening(false)
    }
    const release = () => {
      keys.current.clear()
      dragging.current = false
      stopListening()
    }
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        release()
        if (useGame.getState().screen === 'game') useGame.getState().setScreen('paused')
        return
      }
      if (paused || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return
      const key = event.key.toLowerCase()
      keys.current.add(key)
      if (['w', 'a', 's', 'd', ' ', 'q'].includes(key)) event.preventDefault()
      if (event.repeat) return
      if (key === 'f') onFlashlight()
      if (key === 'e') {
        const lightSwitch = SWITCHES.findIndex((point) => {
          const vector = new Vector3(...point).sub(camera.position)
          return vector.length() < 1.6 && vector.normalize().dot(forward.current) > 0.85
        })
        if (lightSwitch >= 0) {
          onSwitch(lightSwitch)
          return
        }
        if (peeking) {
          onPeek(false)
          return
        }
        if (near.current && choices.some((choice) => choice.id === near.current?.id)) {
          useGame.getState().choose(near.current.id)
          return
        }
        // Any time at the door: put an eye to the peephole.
        const lens = new Vector3(...OBJECTS.peephole!).sub(camera.position)
        if (
          !peephole &&
          Math.hypot(lens.x, lens.z) < REACH &&
          lens.normalize().dot(forward.current) > 0.85
        ) {
          onPeek(true)
          return
        }
        if (step.phase === 'next') useGame.getState().advance()
      }
      if (key === ' ') {
        document.querySelector<HTMLElement>('.desktop-hud .narration')?.click()
      }
      const index = Number(key) - 1
      if (index >= 0 && index < choices.length) useGame.getState().choose(choices[index]!.id)
      if (
        key === 'q' &&
        near.current?.id === 'listen' &&
        choices.some((choice) => choice.id === 'listen') &&
        !timer.current
      ) {
        audio.setListening(true)
        timer.current = setTimeout(() => {
          timer.current = null
          audio.setListening(false)
          useGame.getState().choose('listen')
        }, 700)
      }
    }
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase())
      if (event.key.toLowerCase() === 'q') stopListening()
    }
    const pointerdown = (event: PointerEvent) => {
      if (paused) return
      dragging.current = true
      mouse.current = { x: event.clientX, y: event.clientY }
      try {
        if (gl.domElement.requestPointerLock) {
          void Promise.resolve(gl.domElement.requestPointerLock()).catch(() => onControl('drag'))
        } else onControl('drag')
      } catch {
        onControl('drag')
      }
    }
    const pointermove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === gl.domElement
      if (paused || (!locked && !dragging.current)) return
      const dx = locked ? event.movementX : event.clientX - mouse.current.x
      const dy = locked ? event.movementY : event.clientY - mouse.current.y
      mouse.current = { x: event.clientX, y: event.clientY }
      if (desktopRuntime.inspecting) {
        // Turning the paper over in the hand, not the head.
        const clampTo = (v: number, m: number) => Math.max(-m, Math.min(m, v))
        desktopRuntime.inspectYaw = clampTo(desktopRuntime.inspectYaw + dx * 0.004, 1.1)
        desktopRuntime.inspectPitch = clampTo(desktopRuntime.inspectPitch + dy * 0.004, 0.7)
        return
      }
      angles.current.yaw -= dx * 0.0024
      angles.current.pitch = Math.max(-1.2, Math.min(1.2, angles.current.pitch - dy * 0.0024))
    }
    const pointerup = () => {
      dragging.current = false
    }
    const lockchange = () =>
      onControl(document.pointerLockElement === gl.domElement ? 'lock' : 'drag')
    const lockerror = (event: Event) => {
      event.preventDefault()
      onControl('drag')
    }
    if (paused && document.pointerLockElement === gl.domElement) document.exitPointerLock()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    gl.domElement.addEventListener('pointerdown', pointerdown)
    window.addEventListener('pointermove', pointermove)
    window.addEventListener('pointerup', pointerup)
    document.addEventListener('pointerlockchange', lockchange)
    document.addEventListener('pointerlockerror', lockerror)
    return () => {
      release()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
      gl.domElement.removeEventListener('pointerdown', pointerdown)
      window.removeEventListener('pointermove', pointermove)
      window.removeEventListener('pointerup', pointerup)
      document.removeEventListener('pointerlockchange', lockchange)
      document.removeEventListener('pointerlockerror', lockerror)
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock()
    }
  }, [
    paused,
    choices,
    step.phase,
    gl,
    camera,
    onControl,
    onFlashlight,
    onSwitch,
    peeking,
    peephole,
    onPeek,
  ])

  useFrame(({ clock }, rawDelta) => {
    if (paused || document.hidden) return
    const delta = Math.min(rawDelta, 0.05)
    const settings = useSettings.getState().settings
    const { yaw, pitch } = angles.current
    // At the peephole the body stays put; only the eye turns.
    const sideways = peephole
      ? 0
      : (keys.current.has('d') ? 1 : 0) - (keys.current.has('a') ? 1 : 0)
    const ahead = peephole ? 0 : (keys.current.has('w') ? 1 : 0) - (keys.current.has('s') ? 1 : 0)
    const speed = 1.6 / Math.max(1, Math.hypot(sideways, ahead))
    const targetX = (sideways * Math.cos(yaw) - ahead * Math.sin(yaw)) * speed
    const targetZ = (-sideways * Math.sin(yaw) - ahead * Math.cos(yaw)) * speed
    // Slight inertia: about a fifth of a second to reach walking pace or to stop.
    const ease = 1 - Math.exp(-delta * (sideways || ahead ? 9 : 12))
    const v = velocity.current
    v.x += (targetX - v.x) * ease
    v.z += (targetZ - v.z) * ease
    if (Math.hypot(v.x, v.z) < 0.01) v.x = v.z = 0
    const dx = v.x * delta
    const dz = v.z * delta
    const walking = Math.hypot(v.x, v.z) > 0.25
    const before = camera.position.clone()
    const next = walk(
      [camera.position.x, 1.6, camera.position.z] as Point,
      dx,
      dz,
      step.state.night >= 4,
      extension,
    )
    camera.position.set(...next)
    const distance = before.distanceTo(camera.position)
    // Pushing into a wall stops the body too.
    if (distance < Math.hypot(dx, dz) * 0.3) v.x = v.z = 0
    if (walking) {
      bob.current += delta * 9 * Math.min(1, Math.hypot(v.x, v.z) / 1.6)
      stepDistance.current += distance
    }
    if (stepDistance.current > 0.72) {
      // The sound of the floor actually underfoot: parquet, painted boards, tiles, concrete.
      audio.play(footstepAt(camera.position.x, camera.position.z, extension), [
        camera.position.x,
        0.05,
        camera.position.z,
      ])
      stepDistance.current = 0
    }
    camera.position.y =
      1.6 +
      (settings.headBob && !settings.reduceFlashing && walking ? Math.sin(bob.current) * 0.018 : 0)
    camera.quaternion.setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'))
    camera.getWorldDirection(forward.current)
    softwareLight.torchPosition.value.copy(camera.position)
    softwareLight.torchDirection.value.copy(forward.current)
    softwareLight.torch.value = flashlight ? 12 : 0
    audio.setListener(
      [camera.position.x, camera.position.y, camera.position.z],
      [forward.current.x, forward.current.y, forward.current.z],
    )
    if (lamp.current) {
      lamp.current.position.copy(camera.position)
      lamp.current.target.position.copy(camera.position).addScaledVector(forward.current, 4)
      lamp.current.target.updateMatrixWorld()
    }
    moved.current += delta
    if (moved.current > 0.12) {
      moved.current = 0
      let best: Choice | null = null
      let bestDistance = REACH
      for (const choice of choices) {
        const point = interactionPoint(
          choice,
          extension,
          desktopRuntime.clockShifted,
          step.state.night,
        )
        if (!point) continue
        const vector = new Vector3(...point).sub(camera.position)
        // Reach is measured on the floor plane: a low table and a high clock count alike.
        const length = Math.hypot(vector.x, vector.z)
        if (length < bestDistance && vector.normalize().dot(forward.current) > 0.88) {
          best = choice
          bestDistance = length
        }
      }
      // The peephole is always there to look through (or to step back from).
      if (peeking) best = UNPEEK
      else if (!best && !peephole) {
        const lens = new Vector3(...OBJECTS.peephole!).sub(camera.position)
        if (Math.hypot(lens.x, lens.z) < REACH && lens.normalize().dot(forward.current) > 0.85)
          best = PEEK
      }
      if (near.current?.id !== best?.id) {
        near.current = best
        onNear(best)
      }
    }
    if (step.node.id === 'n3_corridor_loop') {
      camera.updateMatrixWorld()
      viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.current.setFromProjectionMatrix(viewProjection.current)
      doorBounds.current.setFromCenterAndSize(
        new Vector3(0, 1.35, 6.9 + extension),
        new Vector3(1.4, 2.7, 0.2),
      )
      const looking = frustum.current.intersectsBox(doorBounds.current)
      if (wasLooking.current && !looking) onExtend()
      wasLooking.current = looking
    }
    const history = mirrorHistory.current
    history.push({ time: clock.elapsedTime, x: camera.position.x, yaw, pitch })
    while (history.length > 2 && history[1]!.time < clock.elapsedTime - 0.5) history.shift()
    desktopRuntime.mirrorDelay = step.node.location === 'bathroom' ? 0.5 : 0
    desktopRuntime.position = camera.position.toArray()
    desktopRuntime.yaw = yaw
    desktopRuntime.pitch = pitch
    desktopRuntime.flashlight = flashlight
    desktopRuntime.corridorLength = 3 + extension
    // The renderer samples this delayed position for the reflected silhouette.
    desktopRuntime.mirrorOffset = ((history[0]?.x ?? camera.position.x) + 2.1) * 0.1
    desktopRuntime.mirrorYaw = history[0]?.yaw ?? yaw
    desktopRuntime.mirrorPitch = history[0]?.pitch ?? pitch
    const target = nodePoint(step.node)
    if (
      target &&
      step.phase === 'next' &&
      step.node.desktop?.trigger === 'zone' &&
      walking &&
      camera.position.distanceTo(new Vector3(...target)) < 0.6
    )
      useGame.getState().advance()
  })
  return (
    <spotLight
      ref={lamp}
      color="#e6e9dc"
      intensity={flashlight ? 160 : 0}
      // A wide spill around the hot centre, as a cheap torch has.
      angle={0.6}
      penumbra={0.75}
      distance={14}
      decay={2}
      castShadow={shadows}
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0004}
      map={shadows ? cookie : null}
    />
  )
}

/**
 * Torch cookie (FIX_PROMPT §2): a hot centre, a darker ring from the reflector and faint
 * smudges, projected through the spotlight. three.js only projects `map` with shadows on.
 */
function makeCookie(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.18, '#f4f4f0')
  g.addColorStop(0.3, '#b9b9b4')
  g.addColorStop(0.38, '#d8d8d2')
  g.addColorStop(0.75, '#5a5a57')
  g.addColorStop(1, '#000000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // Faint smudges on the lens: barely there, or they read as bubbles on the wall.
  ctx.globalAlpha = 0.025
  for (let i = 0; i < 40; i++) {
    const a = (i * 2.399) % (Math.PI * 2)
    const r = (((i * 37) % 100) / 100) * c * 0.7
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 3 + (i % 5) * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
