/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
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
import { emitDirectorEvents, getDirector, onDirectorEvents, sensors, useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { zonesAt } from '@/content/world/zones'
import { objectPoint, PHONE_TARGETS } from '@/content/world/objects'
import type { Point, WorldState } from '@/core/director/types'
import { SWITCHES, REACH, footstepAt } from './layout'
import { sightBlocked, walkFeet, type DoorLeaf } from '@/content/world/walk'
import { isBelow } from '@/content/world/stairwell'
import { CORRIDOR_SPLIT_Z } from '@/content/world/layout'
import { softwareLight } from './world/softwareMaterial'
import { STILL_CAMERAS } from '../mobile/still-scenes'

/** What the crosshair is on: a Director object, a light switch, or the peephole. */
export interface Near {
  id: string
  kind: 'use' | 'hold' | 'switch' | 'peek' | 'unpeek' | 'door'
}

export interface RigProps {
  world: WorldState
  /** The Director's interactable objects right now. */
  interactables: Set<string>
  paused: boolean
  flashlight: boolean
  /** The light is the phone's own torch: weak, narrow, short (the dark landing of night 1). */
  phoneTorch: boolean
  onNear: (near: Near | null) => void
  onControl: (mode: 'lock' | 'drag') => void
  onFlashlight: () => void
  onSwitch: (index: number) => void
  shadows: boolean
  /** Looking through the entrance peephole (E at the door when nothing else wants it). */
  peeking: boolean
  onPeek: (on: boolean) => void
  /** Night 3's corridor: metres added between the room and the hall (0 = as built). */
  extension: number
  onExtend: (metres: number) => void
}

/** The peephole lens, on the landing side of the entrance leaf. */
export const PEEPHOLE_EYE: Point = [0, 1.6, 4.75]
const PEEPHOLE: Point = [0, 1.6, 4.69]
/** Eye height above the floor under the feet. */
const EYE = 1.6
/** Objects the wall listens and knocks at. */
const WALL_TARGETS = new Set(['party_wall', 'party_wall48'])

export function CameraRig({
  world,
  interactables,
  paused,
  flashlight,
  phoneTorch,
  onNear,
  onControl,
  onFlashlight,
  onSwitch,
  shadows,
  peeking,
  onPeek,
  extension,
  onExtend,
}: RigProps) {
  const cookie = useMemo(() => makeCookie(), [])
  useEffect(() => () => cookie.dispose(), [cookie])
  const { camera, gl } = useThree()
  const angles = useRef({ yaw: 0, pitch: 0 })
  const keys = useRef(new Set<string>())
  const dragging = useRef<{ x: number; y: number; moved: number } | null>(null)
  const near = useRef<Near | null>(null)
  const lamp = useRef<SpotLight>(null)
  const forward = useRef(new Vector3())
  const sense = useRef(0)
  const velocity = useRef({ x: 0, z: 0 })
  /** Height of the floor under the feet: 0 on the 4th floor, lower on the stairs. */
  const feet = useRef(0)
  const bob = useRef(0)
  const stepDistance = useRef(0)
  const frustum = useRef(new Frustum())
  const viewProjection = useRef(new Matrix4())
  const mirrorHistory = useRef<{ time: number; x: number; yaw: number; pitch: number }[]>([])
  const clicks = useRef<number[]>([])
  const putDown = useRef(-1)
  /** Camera effects the Director asks for: a jolt, a closer look, lying down. */
  const effect = useRef({ jolt: 0, push: 0, lying: false, hands: 0 })
  const windRef = useRef<(radians: number) => void>(() => undefined)
  const live = useRef({ world, interactables, peeking, extension })
  useLayoutEffect(() => {
    live.current = { world, interactables, peeking, extension }
  }, [world, interactables, peeking, extension])
  /** Ending C: the spring being wound (radians turned) and the drag that turns it. */
  const winding = useRef({ turned: 0, clicks: 0, done: false, v: { x: 0, y: -120 } })
  /** Ending A: where the body is when it can only shuffle (it stays within 1.5 m). */
  const tether = useRef<Vector3 | null>(null)
  /** Night 3's corridor loop: when it last grew, how long the player has run, stood still. */
  const loop = useRef({ grewAt: 0, running: 0, still: 0, sent: false })
  const lastExtension = useRef(extension)
  useLayoutEffect(() => {
    // The corridor gives the metres back: whoever stood in them is put where they belong.
    const before = lastExtension.current
    lastExtension.current = extension
    if (extension >= before) return
    const z = camera.position.z
    if (z >= CORRIDOR_SPLIT_Z + before) camera.position.z = z - (before - extension)
    else if (z > CORRIDOR_SPLIT_Z + extension)
      camera.position.z = CORRIDOR_SPLIT_Z + extension - 0.05
    loop.current = { grewAt: 0, running: 0, still: 0, sent: false }
  }, [extension, camera])

  /** Where the player stood before stepping up to the peephole. */
  const beforePeek = useRef<{ position: Vector3; yaw: number; pitch: number } | null>(null)
  const sequence = world.sequence
  useLayoutEffect(() => {
    // A new night (or ending) begins where the Director says; nothing else moves the body.
    const spawn = getDirector()?.spawn
    if (!spawn) return
    camera.position.set(...spawn.position)
    desktopRuntime.doorChoices = {}
    desktopRuntime.wardrobeChoice = undefined
    feet.current = spawn.position[1] - EYE
    angles.current = { yaw: spawn.yaw, pitch: 0 }
    velocity.current = { x: 0, z: 0 }
    mirrorHistory.current = []
    camera.rotation.set(0, spawn.yaw, 0, 'YXZ')
  }, [sequence, camera])
  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    if (peeking && !beforePeek.current) {
      beforePeek.current = { position: camera.position.clone(), ...angles.current }
      camera.position.set(...PEEPHOLE_EYE)
      // At the lens the eye rises a little: whoever stands there is taller than the door's eye.
      angles.current = { yaw: Math.PI, pitch: 0.32 }
      perspective.fov = 110
    } else if (!peeking && beforePeek.current) {
      const { position, yaw, pitch } = beforePeek.current
      beforePeek.current = null
      camera.position.copy(position)
      angles.current = { yaw, pitch }
      perspective.fov = 66
    }
    perspective.updateProjectionMatrix()
  }, [peeking, camera])

  // A paper handed over needs the cursor back: release mouse-look while the form is open.
  useEffect(() => {
    if (world.form && document.pointerLockElement === gl.domElement) document.exitPointerLock()
  }, [world.form, gl])

  useEffect(
    () =>
      onDirectorEvents((events) => {
        for (const event of events) {
          // A new night begins on its feet unless it says otherwise (night 2 wakes lying down;
          // its start beat comes a tick after this).
          if (event.type === 'nightStart' || event.type === 'endingStart')
            effect.current.lying = false
          if (event.type !== 'camera') continue
          if (event.effect === 'jolt' || event.effect === 'shake') effect.current.jolt = 1
          if (event.effect === 'push') effect.current.push = 1
          if (event.effect === 'hands') effect.current.hands = 2.6
          if (event.effect === 'lookDown') effect.current.lying = true
          if (event.effect === 'sitUp') effect.current.lying = false
        }
        for (const event of events) {
          if (event.type !== 'place') continue
          camera.position.set(event.position[0], event.position[1], event.position[2])
          feet.current = event.position[1] - EYE
          angles.current = { yaw: event.yaw, pitch: 0 }
          tether.current = null
          velocity.current = { x: 0, z: 0 }
        }
      }),
    [camera],
  )

  useEffect(() => {
    const input = useGame.getState().input
    let holding = false
    const stopHolding = () => {
      if (!holding) return
      holding = false
      input({ type: 'holdEnd' })
    }
    const release = () => {
      keys.current.clear()
      dragging.current = null
      stopHolding()
    }
    const activate = () => {
      const { world, interactables, peeking } = live.current
      if (world.readable) {
        input({ type: 'closeReadable' })
        return
      }
      if (world.phone.place === 'hand') {
        for (const target of ['phone_call', 'phone_send', 'phone_message'])
          if (interactables.has(target) && input({ type: 'interact', target })) return
        input({ type: 'interact', target: 'phone' })
        return
      }
      const n = near.current
      if (!n) return
      if (
        n.id === 'front_door' &&
        world.sequence === 'n5' &&
        !useGame.getState().run?.flags['open_the_door']
      ) {
        audio.play('chain', [0, 1, 4.69 + live.current.extension])
        return
      }
      const doorId = n.id === 'door48' ? 'front_door48' : n.id
      if (n.id === 'wardrobe') {
        const opening = !(desktopRuntime.wardrobeChoice ?? world.objects['wardrobe'] === 'open')
        const handled =
          interactables.has('wardrobe') && input({ type: 'interact', target: 'wardrobe' })
        desktopRuntime.wardrobeChoice = opening
        if (!handled) audio.play(opening ? 'door_open' : 'door_close', [-0.65, 1, 0.95])
      } else if (n.kind === 'door' || (n.kind === 'use' && desktopRuntime.doorLeaves[doorId])) {
        if (n.kind === 'use') input({ type: 'interact', target: n.id })
        const leaf = desktopRuntime.doorLeaves[doorId]
        if (desktopRuntime.doorLocks[doorId]) {
          if (leaf) audio.play('chain', [(leaf.x0 + leaf.x1) / 2, 1, (leaf.z0 + leaf.z1) / 2])
        } else {
          const open =
            desktopRuntime.doorChoices[doorId] ?? (desktopRuntime.doorAngles[doorId] ?? 0) > 0.7
          desktopRuntime.doorChoices[doorId] = !open
        }
      } else if (n.kind === 'use' && n.id === 'peephole') {
        // The night wants the peephole looked through: the eye goes to the lens.
        onPeek(true)
        input({ type: 'interact', target: 'peephole' })
      } else if (n.kind === 'switch') onSwitch(Number(n.id))
      else if (n.kind === 'peek') onPeek(true)
      else if (n.kind === 'unpeek' || peeking) onPeek(false)
      else input({ type: 'interact', target: n.id })
    }
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        release()
        if (useGame.getState().screen === 'game') useGame.getState().setScreen('paused')
        return
      }
      if (paused || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return
      if (live.current.world.form) return
      const key = event.key.toLowerCase()
      keys.current.add(key)
      if (['w', 'a', 's', 'd', ' ', 'q'].includes(key)) event.preventDefault()
      if (event.repeat) return
      if (key === 'f') onFlashlight()
      if (key === 'e') activate()
      if (key === 'q') {
        const n = near.current
        const target = n && WALL_TARGETS.has(n.id) ? n.id : null
        if (target) {
          holding = true
          input({ type: 'holdStart', target })
        }
      }
    }
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase())
      if (event.key.toLowerCase() === 'q') stopHolding()
    }
    const pointerdown = (event: PointerEvent) => {
      if (paused || live.current.world.form) return
      dragging.current = { x: event.clientX, y: event.clientY, moved: 0 }
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
      const drag = dragging.current
      if (paused || (!locked && !drag)) return
      const dx = locked ? event.movementX : event.clientX - drag!.x
      const dy = locked ? event.movementY : event.clientY - drag!.y
      if (drag) {
        drag.moved += Math.abs(dx) + Math.abs(dy)
        drag.x = event.clientX
        drag.y = event.clientY
      }
      if (live.current.world.objects['clock'] === 'winding') {
        // A circular drag around the middle of the screen winds the spring, against its
        // resistance; the eyes stay on the clock.
        const w = winding.current
        const before = { ...w.v }
        w.v.x += dx
        w.v.y += dy
        const r = Math.hypot(w.v.x, w.v.y)
        const k = Math.min(260, Math.max(60, r)) / Math.max(r, 1e-6)
        w.v.x *= k
        w.v.y *= k
        const turn = Math.atan2(
          before.x * w.v.y - before.y * w.v.x,
          before.x * w.v.x + before.y * w.v.y,
        )
        windBy(turn * 0.6)
        return
      }
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
      const drag = dragging.current
      dragging.current = null
      // A click (not a look-drag) at the wall: three within two seconds is a knock.
      if (!drag || drag.moved > 12) return
      const n = near.current
      if (!n || !WALL_TARGETS.has(n.id)) return
      const now = performance.now()
      clicks.current = [...clicks.current.filter((t) => now - t < 2000), now]
      if (clicks.current.length >= 3) {
        clicks.current = []
        input({ type: 'knock3', target: n.id })
      }
    }
    function windBy(radians: number) {
      const w = winding.current
      if (w.done || radians <= 0) return
      w.turned += radians
      // A pawl over a tooth every 30°: a click and a small knock in the hand.
      const clicks = Math.floor(w.turned / (Math.PI / 6))
      if (clicks > w.clicks) {
        w.clicks = clicks
        audio.play('ratchet')
        emitDirectorEvents([{ type: 'haptic', pattern: 'light' }])
      }
      // About three turns, and the spring has caught.
      if (w.turned >= Math.PI * 6) {
        w.done = true
        input({ type: 'interact', target: 'clock_wound' })
      }
    }
    windRef.current = windBy
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
  }, [paused, gl, onControl, onFlashlight, onSwitch, onPeek])

  useFrame(({ clock }, rawDelta) => {
    if (paused || document.hidden) return
    const delta = Math.min(rawDelta, 0.05)
    if (desktopRuntime.teleport && (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1')) {
      const [tx, tz, tyaw, tfeet] = desktopRuntime.teleport
      desktopRuntime.teleport = null
      feet.current = tfeet ?? 0
      camera.position.set(tx!, EYE + feet.current, tz)
      effect.current.lying = false
      if (tyaw !== undefined) angles.current.yaw = tyaw
      velocity.current = { x: 0, z: 0 }
    }
    const settings = useSettings.getState().settings
    const { world, interactables } = live.current
    // Holding E winds the clock too, a little slower than a hand turning it.
    if (world.objects['clock'] === 'winding' && keys.current.has('e')) windRef.current(delta * 1.4)
    if (world.objects['clock'] !== 'winding' && winding.current.turned > 0)
      winding.current = { turned: 0, clicks: 0, done: false, v: { x: 0, y: -120 } }
    const fx = effect.current
    const { yaw } = angles.current
    // Lying on the sofa: eyes on the ceiling; at the peephole or reading: the body stays put.
    // Woken lying down (night 2's morning) and the night is at its own pace: a step gets up.
    if (fx.lying && world.timeScale === 1 && ['w', 'a', 's', 'd'].some((k) => keys.current.has(k)))
      fx.lying = false
    const still = peeking || world.control === 'locked' || fx.lying || world.form || fx.hands > 0
    const reading = !!world.readable
    const sideways = still ? 0 : (keys.current.has('d') ? 1 : 0) - (keys.current.has('a') ? 1 : 0)
    const ahead = still ? 0 : (keys.current.has('w') ? 1 : 0) - (keys.current.has('s') ? 1 : 0)
    // Moving puts a paper or the phone down (once: the world updates a frame later).
    if ((sideways || ahead) && clock.elapsedTime - putDown.current > 0.6) {
      if (reading) {
        putDown.current = clock.elapsedTime
        useGame.getState().input({ type: 'closeReadable' })
      } else if (world.phone.place === 'hand') {
        putDown.current = clock.elapsedTime
        useGame.getState().input({ type: 'interact', target: 'phone' })
      }
    }
    const pace = world.control === 'shuffle' ? 0.35 : 1.6
    const speed = pace / Math.max(1, Math.hypot(sideways, ahead))
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
    const door48 = world.doors['door48']
    const stretch = live.current.extension
    const next = walkFeet(camera.position.x, feet.current, camera.position.z, dx, dz, {
      // Ending A happens inside 48 with its door shut behind the player.
      flat48: door48 === 'ajar' || door48 === 'open' || world.sequence === 'endA',
      extension: stretch,
      doorLeaves: Object.values(desktopRuntime.doorLeaves),
    })
    // Able to move only a little: a slow shuffle within 1.5 m of where it began.
    if (world.control === 'shuffle') {
      tether.current ??= camera.position.clone()
      const t = tether.current
      if (Math.hypot(next[0] - t.x, next[2] - t.z) > 1.5) {
        next[0] = camera.position.x
        next[2] = camera.position.z
      }
    } else tether.current = null
    feet.current = next[1]
    // Someone standing on the landing is in the way like any body.
    if (world.objects['rustam'] && world.objects['rustam'] !== 'gone') {
      const feet = objectPoint('rustam_body')!
      if (Math.hypot(next[0] - feet[0], next[2] - feet[2]) < 0.75) {
        next[0] = camera.position.x
        next[2] = camera.position.z
      }
    }
    camera.position.x = next[0]
    camera.position.z = next[2]
    const distance = before.distanceTo(camera.position)
    if (distance < Math.hypot(dx, dz) * 0.3) v.x = v.z = 0
    if (walking) {
      bob.current += delta * 9 * Math.min(1, Math.hypot(v.x, v.z) / 1.6)
      stepDistance.current += distance
    }
    if (stepDistance.current > 0.72) {
      // The sound of the floor actually underfoot: parquet, painted boards, tiles, concrete.
      audio.play(
        isBelow(feet.current)
          ? 'step_concrete'
          : footstepAt(camera.position.x, camera.position.z, stretch),
        [camera.position.x, feet.current + 0.05, camera.position.z],
      )
      if (stretch > 0) {
        // In the long corridor someone walks behind, in step, a beat late.
        const behind: Point = [
          camera.position.x - forward.current.x * 1.4,
          0.05,
          camera.position.z - forward.current.z * 1.4,
        ]
        setTimeout(() => audio.play('step_board', behind), 280)
      }
      stepDistance.current = 0
    }
    // Effects decay: a jolt kicks the head, a closer look narrows the lens for a moment.
    fx.jolt = Math.max(0, fx.jolt - delta * 2.5)
    fx.push = Math.max(0, fx.push - delta * 0.45)
    fx.hands = Math.max(0, fx.hands - delta)
    // Eyes down to the palm and back up: eased in over 0.5 s, out over the last 0.6 s.
    const handsPitch = fx.hands > 0 ? -1.0 * Math.min(1, (2.6 - fx.hands) / 0.5, fx.hands / 0.6) : 0
    const lens = camera as PerspectiveCamera
    const fov = peeking ? 110 : 66 - Math.sin(Math.min(1, fx.push) * Math.PI) * 18
    if (Math.abs(lens.fov - fov) > 0.05) {
      lens.fov = fov
      lens.updateProjectionMatrix()
    }
    const lyingPitch = fx.lying ? 0.9 : 0
    const sway =
      (useGame.getState().run?.sanity ?? 100) < 70 && !settings.reduceFlashing
        ? Math.sin(clock.elapsedTime * 0.9) * 0.006
        : 0
    camera.position.y =
      EYE +
      feet.current -
      (fx.lying ? 0.95 : 0) +
      (settings.headBob && !settings.reduceFlashing && walking ? Math.sin(bob.current) * 0.018 : 0)
    camera.quaternion.setFromEuler(
      new Euler(
        angles.current.pitch + lyingPitch + handsPitch + fx.jolt * 0.05 + sway,
        angles.current.yaw,
        0,
        'YXZ',
      ),
    )
    if (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') {
      const query = new URLSearchParams(window.location.search)
      const pose = query.get('render') === 'still' ? STILL_CAMERAS[query.get('cam') ?? ''] : null
      if (pose) {
        camera.position.set(...pose.position)
        camera.quaternion.setFromEuler(new Euler(pose.pitch, pose.yaw, 0, 'YXZ'))
        if (lens.fov !== pose.fov) {
          lens.fov = pose.fov
          lens.updateProjectionMatrix()
        }
      }
    }
    camera.getWorldDirection(forward.current)
    softwareLight.torchPosition.value.copy(camera.position)
    softwareLight.torchDirection.value.copy(forward.current)
    softwareLight.torch.value = flashlight ? (phoneTorch ? 3 : 12) : 0
    audio.setListener(
      [camera.position.x, camera.position.y, camera.position.z],
      [forward.current.x, forward.current.y, forward.current.z],
    )
    if (lamp.current) {
      lamp.current.position.copy(camera.position)
      lamp.current.target.position.copy(camera.position).addScaledVector(forward.current, 4)
      lamp.current.target.updateMatrixWorld()
    }
    sense.current += delta
    if (sense.current > 0.1) {
      sense.current = 0
      camera.updateMatrixWorld()
      viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.current.setFromProjectionMatrix(viewProjection.current)
      // What the Director listens for: where the player stands, looks, and what is in view.
      const tracked = new Set([...(getDirector()?.trackedObjects() ?? []), ...interactables])
      const looking: string[] = []
      const visible: string[] = []
      for (const id of tracked) {
        const point = objectPoint(id)
        if (!point) continue
        const p = new Vector3(...point)
        if (!frustum.current.containsPoint(p)) continue
        visible.push(id)
        const to = p.clone().sub(camera.position)
        if (to.length() < 7 && to.normalize().dot(forward.current) > 0.96) looking.push(id)
      }
      // Zones are measured on the plan as built: the corridor's extra metres count as corridor.
      const stretch = live.current.extension
      const planZ =
        stretch > 0 && camera.position.z >= CORRIDOR_SPLIT_Z
          ? camera.position.z < CORRIDOR_SPLIT_Z + stretch
            ? CORRIDOR_SPLIT_Z - 0.01
            : camera.position.z - stretch
          : camera.position.z
      sensors.zones = zonesAt(camera.position.x, planZ, feet.current)
      corridorLoop(sensors.zones.includes('corridor'), walking, clock.elapsedTime)
      sensors.looking = looking
      sensors.visible = visible
      // Lying down the body stays put, so a movement key is what gets the player up.
      sensors.moving =
        walking || (fx.lying && ['w', 'a', 's', 'd'].some((k) => keys.current.has(k)))
      // The one thing in reach under the crosshair.
      const pick: { best: Near | null; distance: number } = { best: null, distance: REACH }
      const leaves = Object.values(desktopRuntime.doorLeaves)
      const consider = (
        id: string,
        kind: Near['kind'],
        point: Point,
        reach = REACH,
        own?: DoorLeaf,
      ) => {
        // Nothing is reached through a wall or a shut door (a door's own leaf is not a wall).
        const doorLeaves = own ? leaves.filter((leaf) => leaf !== own) : leaves
        if (sightBlocked(camera.position.x, camera.position.z, point[0], point[2], { doorLeaves }))
          return
        const to = new Vector3(...point).sub(camera.position)
        // Reach is measured on the floor plane: a low table and a high clock count alike.
        const length = Math.hypot(to.x, to.z)
        if (
          length < Math.min(reach, pick.distance + 0.001) &&
          to.normalize().dot(forward.current) > 0.88
        ) {
          pick.best = { id, kind }
          pick.distance = length
        }
      }
      for (const id of interactables) {
        if (PHONE_TARGETS.has(id)) continue
        if (id === 'wardrobe') continue // Target the moving leaves below, not the empty space between them.
        // The clock held in both hands: its keyhole is wherever the eyes are.
        if (id === 'keyhole' && world.objects['clock'] === 'in_hand') {
          const held = camera.position.clone().addScaledVector(forward.current, 0.4)
          consider(id, 'use', [held.x, held.y - 0.1, held.z])
          continue
        }
        const point = objectPoint(id)
        if (point) consider(id, 'use', point, id === 'rustam_hand' ? 2.0 : REACH)
      }
      for (const [id, leaf] of Object.entries(desktopRuntime.doorLeaves)) {
        if (!pick.best)
          consider(
            id.startsWith('wardrobe_') ? 'wardrobe' : id,
            'door',
            [(leaf.x0 + leaf.x1) / 2, camera.position.y, (leaf.z0 + leaf.z1) / 2],
            REACH,
            leaf,
          )
      }
      if (world.waiting && WALL_TARGETS.has(world.waiting)) {
        const point = objectPoint(world.waiting)
        if (point) consider(world.waiting, 'use', point)
      }
      for (const id of WALL_TARGETS) {
        const point = objectPoint(id)
        if (
          point &&
          !pick.best &&
          world.sequence === 'n2' &&
          id === 'party_wall' &&
          useGame.getState().run?.flags['n2_voice_done']
        )
          consider(id, 'hold', point)
      }
      // Light switches only when nothing the night cares about is under the crosshair.
      if (!pick.best) SWITCHES.forEach((point, i) => consider(String(i), 'switch', point, 1.6))
      if (peeking) pick.best = { id: 'peephole', kind: 'unpeek' }
      else if (
        !pick.best &&
        !interactables.has('front_door') &&
        world.doors['front_door'] !== 'open'
      )
        consider('peephole', 'peek', PEEPHOLE)
      const best = pick.best
      if (near.current?.id !== best?.id || near.current?.kind !== best?.kind) {
        near.current = best
        onNear(best)
      }
    }
    function corridorLoop(inCorridor: boolean, walking: boolean, now: number) {
      const flags = useGame.getState().run?.flags ?? {}
      const l = loop.current
      if (!flags['corridor_loop'] || flags['corridor_done'] || l.sent) return
      const stretch = live.current.extension
      // Looking away from the entrance (its door out of view): the corridor is longer.
      const door = new Vector3(0, 1.4, 4.69 + stretch)
      if (
        inCorridor &&
        camera.position.z < CORRIDOR_SPLIT_Z &&
        !frustum.current.containsPoint(door) &&
        stretch < 6 &&
        now - l.grewAt > 1.5
      ) {
        l.grewAt = now
        onExtend(stretch + 1.5)
      }
      if (stretch <= 0) return
      const input = useGame.getState().input
      l.running = inCorridor && walking ? l.running + 0.1 : walking ? l.running : 0
      l.still = walking ? 0 : l.still + 0.1
      // Running on for twelve seconds: the flat gives up and puts them by the sofa.
      if (l.running >= 12) {
        l.sent = true
        input({ type: 'interact', target: 'corridor_ran' })
      } else if (l.still >= 1 && forward.current.z < -0.6) {
        // Stopping and turning round to the room: the corridor is as it was.
        l.sent = true
        input({ type: 'interact', target: 'corridor_turned' })
      }
    }
    const history = mirrorHistory.current
    history.push({
      time: clock.elapsedTime,
      x: camera.position.x,
      yaw,
      pitch: angles.current.pitch,
    })
    while (history.length > 2 && history[1]!.time < clock.elapsedTime - 0.5) history.shift()
    desktopRuntime.mirrorDelay = sensors.zones.includes('bathroom') ? 0.5 : 0
    desktopRuntime.position = camera.position.toArray()
    desktopRuntime.feet = feet.current
    desktopRuntime.yaw = yaw
    desktopRuntime.pitch = angles.current.pitch
    desktopRuntime.flashlight = flashlight
    desktopRuntime.corridorLength = 3
    // The renderer samples this delayed position for the reflected silhouette.
    desktopRuntime.mirrorOffset = ((history[0]?.x ?? camera.position.x) + 2.1) * 0.1
    desktopRuntime.mirrorYaw = history[0]?.yaw ?? yaw
    desktopRuntime.mirrorPitch = history[0]?.pitch ?? angles.current.pitch
  })
  return (
    <spotLight
      ref={lamp}
      color="#e6e9dc"
      intensity={flashlight ? (phoneTorch ? 24 : 160) : 0}
      // A wide spill around the hot centre, as a cheap torch has; a phone's is narrow and short.
      angle={phoneTorch ? 0.42 : 0.6}
      penumbra={0.75}
      distance={phoneTorch ? 4.5 : 14}
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
