/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Box3,
  Euler,
  Frustum,
  Matrix4,
  Vector3,
  type PerspectiveCamera,
  type SpotLight,
} from 'three'
import { audio } from '@/audio/engine'
import { useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { interactionPoint, nodePoint, VIEWS, walk, SWITCHES, type Point } from './layout'
import type { Choice, Step } from '@/core/engine/types'

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
}
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
}: RigProps) {
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
  const bob = useRef(0)
  const stepDistance = useRef(0)
  const wasLooking = useRef(false)
  const doorBounds = useRef(new Box3())
  const frustum = useRef(new Frustum())
  const viewProjection = useRef(new Matrix4())
  const mirrorHistory = useRef<{ time: number; x: number; yaw: number; pitch: number }[]>([])

  const viewpoint = step.node.mobile?.vignette === 'window' ? 'balcony' : step.node.location
  const peephole = step.node.mobile?.vignette === 'peephole'
  const turnedBack = step.node.id === 'n3_corridor_stop'
  useLayoutEffect(() => {
    const view = VIEWS[viewpoint]
    const spawn: Point = peephole ? [0, 1.7, 7.12] : view.position
    camera.position.set(...spawn)
    mirrorHistory.current = []
    angles.current = { yaw: peephole ? Math.PI : turnedBack ? 0 : view.yaw, pitch: 0 }
    camera.rotation.set(0, angles.current.yaw, 0, 'YXZ')
    const perspective = camera as PerspectiveCamera
    // R3F owns a mutable Three camera; this is imperative scene synchronization.
    perspective.fov = peephole ? 110 : 66
    perspective.updateProjectionMatrix()
  }, [viewpoint, peephole, turnedBack, camera])

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
        if (near.current && choices.some((choice) => choice.id === near.current?.id))
          useGame.getState().choose(near.current.id)
        else if (step.phase === 'next') useGame.getState().advance()
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
  }, [paused, choices, step.phase, gl, camera, onControl, onFlashlight, onSwitch])

  useFrame(({ clock }, rawDelta) => {
    if (paused || document.hidden) return
    const delta = Math.min(rawDelta, 0.05)
    const settings = useSettings.getState().settings
    const { yaw, pitch } = angles.current
    const sideways = (keys.current.has('d') ? 1 : 0) - (keys.current.has('a') ? 1 : 0)
    const ahead = (keys.current.has('w') ? 1 : 0) - (keys.current.has('s') ? 1 : 0)
    const speed = (1.7 * delta) / Math.max(1, Math.hypot(sideways, ahead))
    const dx = (sideways * Math.cos(yaw) - ahead * Math.sin(yaw)) * speed
    const dz = (-sideways * Math.sin(yaw) - ahead * Math.cos(yaw)) * speed
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
    if (sideways || ahead) {
      bob.current += delta * 9
      stepDistance.current += distance
    }
    if (stepDistance.current > 0.72) {
      audio.play(
        ['kitchen', 'bathroom', 'stairwell'].includes(step.node.location)
          ? 'step_tile'
          : 'step_wood',
      )
      stepDistance.current = 0
    }
    camera.position.y =
      1.6 +
      (settings.headBob && !settings.reduceFlashing && (sideways || ahead)
        ? Math.sin(bob.current) * 0.018
        : 0)
    camera.quaternion.setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'))
    camera.getWorldDirection(forward.current)
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
      let bestDistance = 3.2
      for (const choice of choices) {
        const point = interactionPoint(choice, extension, desktopRuntime.clockShifted ? 0.9 : 0)
        if (!point) continue
        const vector = new Vector3(...point).sub(camera.position)
        const length = vector.length()
        if (length < bestDistance && vector.normalize().dot(forward.current) > 0.92) {
          best = choice
          bestDistance = length
        }
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
      (sideways || ahead) &&
      camera.position.distanceTo(new Vector3(...target)) < 0.6
    )
      useGame.getState().advance()
  })
  return (
    <spotLight
      ref={lamp}
      color="#d3d9bf"
      intensity={flashlight ? 20 : 0}
      angle={0.28}
      penumbra={0.6}
      distance={10}
      decay={2}
    />
  )
}
