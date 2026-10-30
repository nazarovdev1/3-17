/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Euler,
  Frustum,
  Matrix4,
  Quaternion,
  Vector3,
  type PerspectiveCamera,
  type SpotLight,
} from 'three'
import { audio } from '@/audio/engine'
import { emitDirectorEvents, getDirector, onDirectorEvents, sensors, useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { getWebApp } from '@/platform/telegram/adapter'
import { zonesAt } from '@/content/world/zones'
import { objectPoint, PHONE_TARGETS } from '@/content/world/objects'
import { CORRIDOR_SPLIT_Z } from '@/content/world/layout'
import { isBelow } from '@/content/world/stairwell'
import { canWalk, sightBlocked } from '@/content/world/walk'
import type { Point, WorldState } from '@/core/director/types'
import { SWITCHES, footstepAt } from '../desktop/layout'
import { PEEPHOLE_EYE } from '../desktop/CameraRig'
import { softwareLight } from '../desktop/world/softwareMaterial'
import {
  DOOR_STORY_ID,
  EDGES,
  NODE_BY_ID,
  TAP_REACH,
  nearestNode,
  pathOf,
  type MagicNode,
} from './nodes'
import { magicActions, publishSpots, type Spot, type SpotKind } from './hud'

/** Eye height above the floor under the feet. */
const EYE = 1.6
/** Walking pace of a glide between viewpoints (m/s), eased in and out. */
const PACE = 1.5
/** Objects the wall listens and knocks at. */
const WALL_TARGETS = new Set(['party_wall', 'party_wall48'])
const PEEPHOLE: Point = [0, 1.6, 4.69]
/** A finger-driven view looks a little down by default: the floor and the tables are near. */
const DOWN = -0.2

export interface MagicRigProps {
  world: WorldState
  interactables: Set<string>
  paused: boolean
  flashlight: boolean
  phoneTorch: boolean
  onSwitch: (index: number) => void
  peeking: boolean
  onPeek: (on: boolean) => void
  extension: number
  onExtend: (metres: number) => void
}

/** A placed body stands on the floor: a spot on a wall's edge is moved to the nearest floor. */
function onFloor(x: number, z: number, feet: number): [number, number] {
  const options = { flat48: true, extension: 0 }
  if (feet < -0.3 || canWalk(x, z, options)) return [x, z]
  for (let r = 0.05; r <= 0.8; r += 0.05)
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a * Math.PI) / 8) * r
      const pz = z + Math.sin((a * Math.PI) / 8) * r
      if (canWalk(px, pz, options)) return [px, pz]
    }
  return [x, z]
}

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Vertical field of view that gives a portrait phone a usable width. */
const baseFov = (aspect: number) => (aspect < 0.8 ? 88 : 66)

/**
 * The magic-window camera (REDESIGN §8): the phone is a window into the same flat. Its
 * orientation (Telegram's DeviceOrientation, the browser's, else a finger drag) turns the head;
 * the body goes only by gliding between viewpoints, through doors that really stand open.
 * It publishes what is tappable; `MagicHud` draws it. The Director is told what desktop tells it.
 */
export function MagicRig({
  world,
  interactables,
  paused,
  flashlight,
  phoneTorch,
  onSwitch,
  peeking,
  onPeek,
  extension,
  onExtend,
}: MagicRigProps) {
  const { camera, gl, size } = useThree()
  const live = useRef({ world, interactables, peeking, extension, size })
  useLayoutEffect(() => {
    live.current = { world, interactables, peeking, extension, size }
  }, [world, interactables, peeking, extension, size])

  /** Where the body is: stretched-plan metres, the floor height under it. */
  const body = useRef({ x: 0, z: 0, feet: 0 })
  const here = useRef<MagicNode | null>(null)
  const glide = useRef<{
    to: MagicNode
    path: [number, number][]
    fromFeet: number
    done: number
    sound: number
  } | null>(null)
  /** The look: where the node faces (eases), the phone's turn since centring, a finger's turn. */
  const look = useRef({ heading: 0, target: 0, calib: 0, smooth: 0, dragYaw: 0, dragPitch: 0 })
  const device = useRef({ has: false, yaw: 0, pitch: 0 })
  const dragging = useRef<{ x: number; y: number; moved: number } | null>(null)
  const effect = useRef({ jolt: 0, push: 0, lying: false, hands: 0 })
  const winding = useRef({ turned: 0, clicks: 0, done: false, v: { x: 0, y: -120 } })
  const loop = useRef({ grewAt: 0, running: 0, still: 0, sent: false })
  const lastExtension = useRef(extension)
  const beforePeek = useRef<{ x: number; z: number; feet: number } | null>(null)
  const forward = useRef(new Vector3())
  const frustum = useRef(new Frustum())
  const viewProjection = useRef(new Matrix4())
  const lamp = useRef<SpotLight>(null)
  const sense = useRef(0)
  const stepDistance = useRef(0)
  const mirrorHistory = useRef<{ time: number; x: number; yaw: number; pitch: number }[]>([])
  const putDown = useRef(-1)

  const stretched = (z: number) => (z >= CORRIDOR_SPLIT_Z ? z + live.current.extension : z)
  const planZ = (z: number) => {
    const ext = live.current.extension
    if (ext <= 0 || z < CORRIDOR_SPLIT_Z) return z
    return z < CORRIDOR_SPLIT_Z + ext ? CORRIDOR_SPLIT_Z - 0.01 : z - ext
  }

  /** Put the body on a node (a new night, a placed scene) and face as it faces. */
  const stand = (node: MagicNode, yaw = node.yaw) => {
    body.current = { x: node.x, z: stretched(node.z), feet: node.feet }
    here.current = node
    glide.current = null
    look.current.heading = yaw
    look.current.target = yaw
    look.current.calib = device.current.yaw
    look.current.smooth = 0
    look.current.dragYaw = 0
    look.current.dragPitch = device.current.has ? 0 : (node.pitch ?? DOWN)
  }

  useLayoutEffect(() => {
    // A new night (or ending) begins where the Director says; nothing else moves the body.
    const spawn = getDirector()?.spawn
    if (!spawn) return
    const node = nearestNode(spawn.position[0], spawn.position[2], spawn.position[1] - EYE)
    stand(node, spawn.yaw)
    body.current = { x: spawn.position[0], z: spawn.position[2], feet: spawn.position[1] - EYE }
    desktopRuntime.doorChoices = {}
    desktopRuntime.wardrobeChoice = undefined
    effect.current.lying = false
    mirrorHistory.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a night begins once per sequence.
  }, [world.sequence])

  useLayoutEffect(() => {
    // The corridor gives the metres back: whoever stood in them is put where they belong.
    const before = lastExtension.current
    lastExtension.current = extension
    if (extension >= before) return
    const z = body.current.z
    if (z >= CORRIDOR_SPLIT_Z + before) body.current.z = z - (before - extension)
    else if (z > CORRIDOR_SPLIT_Z + extension) body.current.z = CORRIDOR_SPLIT_Z + extension - 0.05
    loop.current = { grewAt: 0, running: 0, still: 0, sent: false }
  }, [extension])

  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    if (peeking && !beforePeek.current) {
      beforePeek.current = { ...body.current }
      glide.current = null
      look.current.smooth = 0
    } else if (!peeking && beforePeek.current) {
      body.current = beforePeek.current
      beforePeek.current = null
      look.current.target = here.current?.yaw ?? look.current.heading
      look.current.heading = look.current.target
      look.current.calib = device.current.yaw
      look.current.dragYaw = look.current.dragPitch = 0
    }
    perspective.updateProjectionMatrix()
  }, [peeking, camera])

  useEffect(
    () =>
      onDirectorEvents((events) => {
        for (const event of events) {
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
          const feet = event.position[1] - EYE
          const [x, z] = onFloor(event.position[0], event.position[2], feet)
          stand(nearestNode(x, z, feet), event.yaw)
          body.current = { x, z, feet }
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read refs only.
    [],
  )

  // The phone's orientation: Telegram's sensor, else the browser's, else the finger alone.
  useEffect(() => {
    const quaternion = new Quaternion()
    const euler = new Euler()
    const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))
    const q0 = new Quaternion()
    const zee = new Vector3(0, 0, 1)
    const ahead = new Vector3()
    const apply = (alpha: number, beta: number, gamma: number) => {
      const angle = ((screen.orientation?.angle ?? 0) * Math.PI) / 180
      euler.set(beta, alpha, -gamma, 'YXZ')
      quaternion.setFromEuler(euler)
      quaternion.multiply(q1)
      quaternion.multiply(q0.setFromAxisAngle(zee, -angle))
      ahead.set(0, 0, -1).applyQuaternion(quaternion)
      device.current = {
        has: true,
        yaw: Math.atan2(-ahead.x, -ahead.z),
        pitch: Math.asin(clamp(ahead.y, -1, 1)),
      }
      desktopRuntime.magicGyro = true
    }
    const onBrowser = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return
      const d = Math.PI / 180
      apply(event.alpha * d, event.beta * d, event.gamma * d)
    }
    const app = getWebApp()
    const sensor = app?.isVersionAtLeast?.('8.0') ? app.DeviceOrientation : undefined
    const onTelegram = () => {
      if (sensor?.alpha == null || sensor.beta == null || sensor.gamma == null) return
      apply(sensor.alpha, sensor.beta, sensor.gamma)
    }
    window.addEventListener('deviceorientation', onBrowser)
    app?.onEvent?.('deviceOrientationChanged', onTelegram)
    let asked = false
    magicActions.wake = () => {
      if (asked) return
      asked = true
      try {
        sensor?.start?.({ refresh_rate: 60, need_absolute: false }, () => undefined)
      } catch {
        /* The finger remains. */
      }
      const api = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>
      }
      if (api?.requestPermission) void api.requestPermission().catch(() => undefined)
    }
    return () => {
      window.removeEventListener('deviceorientation', onBrowser)
      app?.offEvent?.('deviceOrientationChanged', onTelegram)
      try {
        sensor?.stop?.()
      } catch {
        /* Best-effort cleanup. */
      }
      magicActions.wake = () => {}
      desktopRuntime.magicGyro = false
      device.current.has = false
    }
  }, [])

  // The finger: drags turn the head (and wind the clock); taps are the buttons of MagicHud.
  useEffect(() => {
    const input = useGame.getState().input
    const windBy = (radians: number) => {
      const w = winding.current
      if (w.done || radians <= 0) return
      w.turned += radians
      const ticks = Math.floor(w.turned / (Math.PI / 6))
      if (ticks > w.clicks) {
        w.clicks = ticks
        audio.play('ratchet')
        emitDirectorEvents([{ type: 'haptic', pattern: 'light' }])
      }
      if (w.turned >= Math.PI * 6) {
        w.done = true
        input({ type: 'interact', target: 'clock_wound' })
      }
    }
    const down = (event: PointerEvent) => {
      if (paused) return
      magicActions.wake()
      dragging.current = { x: event.clientX, y: event.clientY, moved: 0 }
    }
    const move = (event: PointerEvent) => {
      const drag = dragging.current
      if (paused || !drag) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.moved += Math.abs(dx) + Math.abs(dy)
      drag.x = event.clientX
      drag.y = event.clientY
      if (live.current.world.objects['clock'] === 'winding') {
        // A circular drag winds the spring against its resistance; the eyes stay on the clock.
        const w = winding.current
        const before = { ...w.v }
        w.v.x += dx
        w.v.y += dy
        const r = Math.hypot(w.v.x, w.v.y)
        const k = Math.min(260, Math.max(60, r)) / Math.max(r, 1e-6)
        w.v.x *= k
        w.v.y *= k
        windBy(
          Math.atan2(before.x * w.v.y - before.y * w.v.x, before.x * w.v.x + before.y * w.v.y) *
            0.6,
        )
        return
      }
      look.current.dragYaw += dx * 0.0032
      look.current.dragPitch = clamp(look.current.dragPitch + dy * 0.0032, -1.2, 1.2)
    }
    const up = () => {
      dragging.current = null
    }
    gl.domElement.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      gl.domElement.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl, paused])

  // What a tap does. The same inputs the desktop sends on E.
  useEffect(() => {
    const input = useGame.getState().input
    const canMove = () => {
      const { world } = live.current
      return !(
        live.current.peeking ||
        world.control === 'locked' ||
        world.control === 'shuffle' ||
        world.form ||
        effect.current.hands > 0 ||
        (effect.current.lying && world.timeScale !== 1)
      )
    }
    const leafOpen = (id: string) => (desktopRuntime.doorAngles[id] ?? 0) > 0.7
    const pressDoor = (id: string) => {
      const { world, interactables } = live.current
      const story = DOOR_STORY_ID[id] ?? id
      if (
        id === 'front_door' &&
        world.sequence === 'n5' &&
        !useGame.getState().run?.flags['open_the_door']
      ) {
        audio.play('chain', [0, 1, 4.69 + live.current.extension])
        return
      }
      if (interactables.has(story)) input({ type: 'interact', target: story })
      const leaf = desktopRuntime.doorLeaves[id]
      if (desktopRuntime.doorLocks[id]) {
        if (leaf) audio.play('chain', [(leaf.x0 + leaf.x1) / 2, 1, (leaf.z0 + leaf.z1) / 2])
        return
      }
      const open = desktopRuntime.doorChoices[id] ?? leafOpen(id)
      desktopRuntime.doorChoices[id] = !open
    }
    magicActions.door = pressDoor
    magicActions.goTo = (id) => {
      const from = here.current
      const to = NODE_BY_ID[id]
      if (!from || !to || !canMove() || glide.current) return
      const edge = EDGES[from.id]?.find((e) => e.to === id)
      if (!edge || (edge.door && !leafOpen(edge.door.id))) return
      if (effect.current.lying) effect.current.lying = false
      const path = pathOf(from, edge).map(([x, z]) => [x, z] as [number, number])
      // Start from where the body really is (a spawn is not exactly on its node).
      path[0] = [body.current.x, planZ(body.current.z)]
      glide.current = { to, path, fromFeet: body.current.feet, done: 0, sound: 0 }
    }
    magicActions.recenter = () => {
      magicActions.wake()
      look.current.calib = device.current.yaw
      look.current.dragYaw = 0
      look.current.dragPitch = device.current.has ? 0 : (here.current?.pitch ?? DOWN)
      look.current.smooth = 0
      look.current.target = here.current?.yaw ?? look.current.target
      look.current.heading = look.current.target
    }
    magicActions.use = (id: string, kind: SpotKind) => {
      const { world, interactables } = live.current
      if (world.readable) return input({ type: 'closeReadable' })
      if (kind === 'switch') return onSwitch(Number(id))
      if (kind === 'peek') return onPeek(true)
      if (id === 'peephole') {
        onPeek(true)
        return void input({ type: 'interact', target: 'peephole' })
      }
      if (id === 'wardrobe') {
        const opening = !(desktopRuntime.wardrobeChoice ?? world.objects['wardrobe'] === 'open')
        const handled =
          interactables.has('wardrobe') && input({ type: 'interact', target: 'wardrobe' })
        desktopRuntime.wardrobeChoice = opening
        if (!handled) audio.play(opening ? 'door_open' : 'door_close', [-0.65, 1, 0.95])
        return
      }
      if (desktopRuntime.doorLeaves[id === 'door48' ? 'front_door48' : id]) return pressDoor(id)
      input({ type: 'interact', target: id })
    }
    return () => {
      magicActions.goTo = () => {}
      magicActions.door = () => {}
      magicActions.use = () => {}
      magicActions.recenter = () => {}
    }
  }, [onSwitch, onPeek])

  useFrame(({ clock }, rawDelta) => {
    if (paused || document.hidden) return
    const delta = Math.min(rawDelta, 0.05)
    const { world, interactables, size: box } = live.current
    const settings = useSettings.getState().settings
    const fx = effect.current
    const lens = camera as PerspectiveCamera
    const b = body.current
    if (desktopRuntime.teleport && (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1')) {
      const [tx, tz, tyaw, tfeet] = desktopRuntime.teleport
      desktopRuntime.teleport = null
      body.current = { x: tx!, z: tz!, feet: tfeet ?? 0 }
      glide.current = null
      fx.lying = false
      if (tyaw !== undefined) look.current.heading = tyaw
    }

    // Holding a paper or the phone is put down by moving, as on the desktop.
    const g = glide.current
    if (g && clock.elapsedTime - putDown.current > 0.6) {
      if (world.readable) {
        putDown.current = clock.elapsedTime
        useGame.getState().input({ type: 'closeReadable' })
      } else if (world.phone.place === 'hand') {
        putDown.current = clock.elapsedTime
        useGame.getState().input({ type: 'interact', target: 'phone' })
      }
    }

    // ── The glide: along the path at walking pace, eased at both ends ─────────────
    let gliding = false
    if (g) {
      gliding = true
      const points = g.path.map(([x, z]) => [x, stretched(z)] as const)
      let length = 0
      for (let i = 1; i < points.length; i++)
        length += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1])
      const fromFeet = g.fromFeet
      const fraction = clamp(g.done / Math.max(length, 0.01), 0, 1)
      // Ease: slow at the ends, full pace between.
      const edgeSpeed = PACE * Math.max(0.35, Math.min(1, fraction * 6, (1 - fraction) * 6))
      g.done += edgeSpeed * delta
      const f = clamp(g.done / Math.max(length, 0.01), 0, 1)
      let walked = f * length
      let x = points[0]![0]
      let z = points[0]![1]
      let heading = look.current.heading
      for (let i = 1; i < points.length; i++) {
        const segment = Math.hypot(
          points[i]![0] - points[i - 1]![0],
          points[i]![1] - points[i - 1]![1],
        )
        if (walked <= segment || i === points.length - 1) {
          const t = segment > 0 ? clamp(walked / segment, 0, 1) : 1
          x = points[i - 1]![0] + (points[i]![0] - points[i - 1]![0]) * t
          z = points[i - 1]![1] + (points[i]![1] - points[i - 1]![1]) * t
          heading = Math.atan2(
            -(points[i]![0] - points[i - 1]![0]),
            -(points[i]![1] - points[i - 1]![1]),
          )
          break
        }
        walked -= segment
      }
      const moved = Math.hypot(x - b.x, z - b.z)
      b.x = x
      b.z = z
      b.feet = fromFeet + (g.to.feet - fromFeet) * f
      look.current.heading += wrap(heading - look.current.heading) * (1 - Math.exp(-delta * 4))
      stepDistance.current += moved
      if (stepDistance.current > 0.72) {
        stepDistance.current = 0
        audio.play(
          isBelow(b.feet) ? 'step_concrete' : footstepAt(b.x, planZ(b.z), live.current.extension),
          [b.x, b.feet + 0.05, b.z],
        )
      }
      if (f >= 1) {
        const arrived = g.to
        glide.current = null
        gliding = false
        // Arrive facing as the viewpoint faces, turning there without a jump.
        const turned = device.current.has ? wrap(device.current.yaw - look.current.calib) : 0
        here.current = arrived
        look.current.target = arrived.yaw
        look.current.smooth = turned + look.current.dragYaw + look.current.smooth
        look.current.calib = device.current.yaw
        look.current.dragYaw = 0
        if (!device.current.has) look.current.dragPitch = arrived.pitch ?? DOWN
        body.current = { x: arrived.x, z: stretched(arrived.z), feet: arrived.feet }
      }
    } else {
      // Standing, the head settles toward the way the viewpoint faces.
      look.current.heading +=
        wrap(look.current.target - look.current.heading) * (1 - Math.exp(-delta * 1.6))
    }
    look.current.smooth *= Math.exp(-delta * 3)

    // ── Pose ────────────────────────────────────────────────────────────────────────
    fx.jolt = Math.max(0, fx.jolt - delta * 2.5)
    fx.push = Math.max(0, fx.push - delta * 0.45)
    fx.hands = Math.max(0, fx.hands - delta)
    const handsPitch = fx.hands > 0 ? -1.0 * Math.min(1, (2.6 - fx.hands) / 0.5, fx.hands / 0.6) : 0
    const aspect = box.width / Math.max(1, box.height)
    const fov = peeking ? 110 : baseFov(aspect) - Math.sin(Math.min(1, fx.push) * Math.PI) * 18
    if (Math.abs(lens.fov - fov) > 0.05) {
      lens.fov = fov
      lens.updateProjectionMatrix()
    }
    const sway =
      (useGame.getState().run?.sanity ?? 100) < 70 && !settings.reduceFlashing
        ? Math.sin(clock.elapsedTime * 0.9) * 0.006
        : 0
    const turn = device.current.has ? wrap(device.current.yaw - look.current.calib) : 0
    const yaw = peeking
      ? Math.PI + turn * 0.5 + look.current.dragYaw * 0.5
      : look.current.heading + turn + look.current.dragYaw + look.current.smooth
    const lyingPitch = fx.lying ? 0.9 : 0
    const pitch = clamp(
      (peeking ? 0.32 : 0) +
        (device.current.has ? device.current.pitch : 0) +
        look.current.dragPitch +
        lyingPitch +
        handsPitch +
        fx.jolt * 0.05 +
        sway,
      -1.3,
      1.3,
    )
    if (peeking) camera.position.set(...PEEPHOLE_EYE)
    else
      camera.position.set(
        b.x,
        EYE +
          b.feet -
          (fx.lying ? 0.95 : 0) +
          (gliding && !settings.reduceFlashing ? Math.sin(clock.elapsedTime * 9) * 0.014 : 0),
        b.z,
      )
    camera.quaternion.setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'))
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

    // ── What the Director listens for, and what the screen layer can offer ───────────
    sense.current += delta
    if (sense.current > 0.066) {
      const dt = sense.current
      sense.current = 0
      camera.updateMatrixWorld()
      viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.current.setFromProjectionMatrix(viewProjection.current)
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
      sensors.zones = zonesAt(b.x, planZ(b.z), b.feet)
      corridorLoop(sensors.zones.includes('corridor'), gliding, clock.elapsedTime, dt)
      sensors.looking = looking
      sensors.visible = visible
      sensors.moving = gliding
      if (!gliding && !glide.current && here.current === null)
        here.current = nearestNode(b.x, planZ(b.z), b.feet)
      desktopRuntime.magicNode = here.current?.id ?? ''
      desktopRuntime.magicGliding = gliding
      publishSpots(
        collectSpots({
          world,
          interactables,
          camera: camera as PerspectiveCamera,
          width: box.width,
          height: box.height,
          viewYaw: yaw,
          body: b,
          here: here.current,
          gliding: !!glide.current,
          peeking,
          extension: live.current.extension,
        }),
      )
    }

    function corridorLoop(inCorridor: boolean, moving: boolean, now: number, tick: number) {
      const flags = useGame.getState().run?.flags ?? {}
      const l = loop.current
      if (!flags['corridor_loop'] || flags['corridor_done'] || l.sent) return
      const stretch = live.current.extension
      // Looking away from the entrance (its door out of view): the corridor is longer.
      const door = new Vector3(0, 1.4, 4.69 + stretch)
      if (
        inCorridor &&
        b.z < CORRIDOR_SPLIT_Z &&
        !frustum.current.containsPoint(door) &&
        stretch < 6 &&
        now - l.grewAt > 1.5
      ) {
        l.grewAt = now
        onExtend(stretch + 1.5)
      }
      if (stretch <= 0) return
      const input = useGame.getState().input
      l.running = inCorridor && moving ? l.running + tick : moving ? l.running : 0
      l.still = moving ? 0 : l.still + tick
      if (l.running >= 12) {
        l.sent = true
        input({ type: 'interact', target: 'corridor_ran' })
      } else if (l.still >= 1 && forward.current.z < -0.6) {
        l.sent = true
        input({ type: 'interact', target: 'corridor_turned' })
      }
    }
    const history = mirrorHistory.current
    history.push({ time: clock.elapsedTime, x: b.x, yaw, pitch })
    while (history.length > 2 && history[1]!.time < clock.elapsedTime - 0.5) history.shift()
    desktopRuntime.mirrorDelay = sensors.zones.includes('bathroom') ? 0.5 : 0
    desktopRuntime.position = camera.position.toArray()
    desktopRuntime.feet = b.feet
    desktopRuntime.yaw = yaw
    desktopRuntime.pitch = pitch
    desktopRuntime.flashlight = flashlight
    desktopRuntime.corridorLength = 3
    desktopRuntime.mirrorOffset = ((history[0]?.x ?? b.x) + 2.1) * 0.1
    desktopRuntime.mirrorYaw = history[0]?.yaw ?? yaw
    desktopRuntime.mirrorPitch = history[0]?.pitch ?? pitch
  })
  return (
    <spotLight
      ref={lamp}
      color="#e6e9dc"
      intensity={flashlight ? (phoneTorch ? 24 : 160) : 0}
      angle={phoneTorch ? 0.42 : 0.6}
      penumbra={0.75}
      distance={phoneTorch ? 4.5 : 14}
      decay={2}
      castShadow={false}
    />
  )
}

interface Collect {
  world: WorldState
  interactables: Set<string>
  camera: PerspectiveCamera
  width: number
  height: number
  viewYaw: number
  body: { x: number; z: number; feet: number }
  here: MagicNode | null
  gliding: boolean
  peeking: boolean
  extension: number
}

const margin = 0.9

/** Project a world point to canvas pixels; null when behind or outside the view. */
function toScreen(camera: PerspectiveCamera, p: Vector3, width: number, height: number) {
  const v = p.clone().project(camera)
  if (v.z >= 1 || Math.abs(v.x) > margin || Math.abs(v.y) > margin) return null
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
}

/**
 * Where a marker for a floor point sits on screen: on the point itself when it is in view,
 * else pinned to the nearest edge (the bottom for what is at the feet, a side for what is
 * beside or behind), so a way on can always be tapped.
 */
function markerAt(
  camera: PerspectiveCamera,
  target: Vector3,
  width: number,
  height: number,
  body: { x: number; z: number },
  viewYaw: number,
): { x: number; y: number; edge?: 'left' | 'right' } {
  const v = target.clone().project(camera)
  const inFront = v.z < 1
  if (inFront && Math.abs(v.x) <= margin) {
    const x = (v.x * 0.5 + 0.5) * width
    if (Math.abs(v.y) <= margin) return { x, y: (-v.y * 0.5 + 0.5) * height }
    // At the feet (below the view) or overhead: pinned to the bottom, where the floor is.
    return { x, y: height * 0.8 }
  }
  const bearing = wrap(Math.atan2(-(target.x - body.x), -(target.z - body.z)) - viewYaw)
  // Behind the player: at the bottom, on the side it lies; beside: on that edge.
  if (Math.abs(bearing) > 2.1) return { x: width / 2 + (bearing > 0 ? -64 : 64), y: height * 0.9 }
  return {
    x: bearing > 0 ? 30 : width - 30,
    y: height * 0.72,
    edge: bearing > 0 ? 'left' : 'right',
  }
}

/** Two markers never sit on each other: the later one slides along its edge. */
function separate(spots: Spot[], width: number) {
  const marks = spots.filter((s) => s.kind === 'move' || s.kind === 'door')
  marks.forEach((spot, i) => {
    for (let guard = 0; guard < 6; guard++) {
      const clash = marks
        .slice(0, i)
        .find((o) => Math.abs(o.x - spot.x) < 54 && Math.abs(o.y - spot.y) < 54)
      if (!clash) return
      if (spot.edge) spot.y += 58
      else spot.x += spot.x < width / 2 ? -58 : 58
    }
  })
}

/** The tappable things in reach and in plain view; markers for the ways on. */
function collectSpots(c: Collect): Spot[] {
  const { world, interactables, camera, width, height, body, here } = c
  const spots: Spot[] = []
  if (c.peeking || width < 10) return spots
  const leaves = Object.values(desktopRuntime.doorLeaves)
  const planZ0 = body.z
  const visible = (point: Point, own?: { x0: number; z0: number; x1: number; z1: number }) => {
    if (Math.abs(point[1] - body.feet - EYE) > 3.5) return false
    if (Math.hypot(point[0] - body.x, point[2] - planZ0) > TAP_REACH) return false
    const doorLeaves = own ? leaves.filter((leaf) => leaf !== own) : leaves
    return !sightBlocked(body.x, planZ0, point[0], point[2], { doorLeaves })
  }
  const add = (id: string, kind: SpotKind, point: Point, own?: Parameters<typeof visible>[1]) => {
    if (!visible(point, own)) return
    const at = toScreen(camera, new Vector3(...point), width, height)
    if (!at) return
    // One finger, one thing: a nearer control keeps its place.
    if (spots.some((s) => s.kind !== 'move' && Math.hypot(s.x - at.x, s.y - at.y) < 44)) return
    spots.push({ key: `${kind}:${id}`, id, kind, ...at })
  }
  if (world.phone.place === 'hand' || world.readable) return spots
  for (const id of interactables) {
    if (PHONE_TARGETS.has(id)) continue
    if (id === 'wardrobe') continue
    const point = objectPoint(id)
    if (!point) continue
    const own = desktopRuntime.doorLeaves[id === 'door48' ? 'front_door48' : id]
    add(id, WALL_TARGETS.has(id) ? 'hold' : 'use', point, own)
  }
  if (world.waiting && WALL_TARGETS.has(world.waiting)) {
    const point = objectPoint(world.waiting)
    if (point) add(world.waiting, 'hold', point)
  }
  if (
    world.sequence === 'n2' &&
    useGame.getState().run?.flags['n2_voice_done'] &&
    !spots.some((s) => s.id === 'party_wall')
  ) {
    const point = objectPoint('party_wall')
    if (point) add('party_wall', 'hold', point)
  }
  // The wardrobe: its leaves are what is touched.
  for (const [id, leaf] of Object.entries(desktopRuntime.doorLeaves)) {
    if (!id.startsWith('wardrobe_') || !interactables.has('wardrobe')) continue
    add('wardrobe', 'use', [(leaf.x0 + leaf.x1) / 2, 1.1, (leaf.z0 + leaf.z1) / 2], leaf)
  }
  SWITCHES.forEach((point, i) => add(String(i), 'switch', point))
  if (!interactables.has('front_door') && world.doors['front_door'] !== 'open')
    add('peephole', 'peek', PEEPHOLE)

  // The ways on from this viewpoint.
  if (here && !c.gliding && world.control === 'none' && !world.form) {
    for (const edge of EDGES[here.id] ?? []) {
      const to = NODE_BY_ID[edge.to]!
      const open = !edge.door || (desktopRuntime.doorAngles[edge.door.id] ?? 0) > 0.7
      const target = open
        ? new Vector3(to.x, to.feet + 0.02, to.z >= CORRIDOR_SPLIT_Z ? to.z + c.extension : to.z)
        : new Vector3(edge.door!.at[0], 1.0, edge.door!.at[1])
      const key = open ? `move:${to.id}` : `door:${edge.door!.id}`
      const base = {
        key,
        id: open ? to.id : edge.door!.id,
        kind: (open ? 'move' : 'door') as SpotKind,
      }
      const locked = !open && !!desktopRuntime.doorLocks[edge.door?.id ?? '']
      const place = markerAt(camera, target, width, height, body, c.viewYaw)
      spots.push({ ...base, ...place, locked })
    }
  }
  separate(spots, width)
  return spots
}
