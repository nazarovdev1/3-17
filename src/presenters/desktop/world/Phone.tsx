/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { SCREEN, drawScreen } from '../../phoneScreen'
import { objectById } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import type { PhoneWorld } from '@/core/director/types'
import { primeUpload } from './prime'

/**
 * The player's phone (fear-design.md): on the room table, its notification light blinking
 * for the missed calls. Picked up, it is held in front of the eyes and shows exactly what
 * the Director says: the lock screen with the date and calls, tonight's voice message as a
 * transcript while it plays, the night-2 draft, a call. Under the pillow it is only a buzz.
 */
const W = 0.075
const H = 0.155
const T = 0.009
const PIXELS = 0.75
/** The CPU rasterizer gets a smaller screen: every redraw is a texture upload. */
const SOFTWARE_PIXELS = 0.45

export function Phone({
  phone,
  time,
  night,
  detailed,
}: {
  phone: PhoneWorld
  time: string
  night: number
  /** Full PBR; the CPU rasterizer gets an unlit body. */
  detailed: boolean
}) {
  const camera = useThree((s) => s.camera)
  const portraitStill =
    (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
    new URLSearchParams(window.location.search).get('render') === 'still' &&
    new URLSearchParams(window.location.search).get('cam') === 'phone'
  const table = objectById('phone')!
  const { canvas, texture, body, glass, led } = useMemo(() => {
    const canvas = document.createElement('canvas')
    const pixels = detailed ? PIXELS : SOFTWARE_PIXELS
    canvas.width = Math.round(SCREEN.w * pixels)
    canvas.height = Math.round(SCREEN.h * pixels)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    // Redrawn while a message plays: no mipmap chain to rebuild on each upload.
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(W, T, H, 4, 0.008),
      detailed
        ? new THREE.MeshStandardMaterial({ color: '#121314', roughness: 0.35, metalness: 0.6 })
        : new THREE.MeshBasicMaterial({ color: '#0d0e0f' }),
    )
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.006, H - 0.012),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    )
    glass.rotation.x = -Math.PI / 2
    glass.position.y = T / 2 + 0.0004
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.0016, 12),
      new THREE.MeshBasicMaterial({ color: '#4fd27a', toneMapped: false }),
    )
    led.rotation.x = -Math.PI / 2
    led.position.set(W / 2 - 0.012, T / 2 + 0.0006, -H / 2 + 0.008)
    body.add(glass, led)
    return { canvas, texture, body, glass, led }
  }, [detailed])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    // Upload the hidden notification LED before its first four-second blink.
    primeUpload(gl, body)
  }, [gl, body])
  useEffect(
    () => () => {
      texture.dispose()
      body.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach((material) => material.dispose())
      })
    },
    [texture, body],
  )
  const live = useRef({ key: '', progress: -1, started: 0, screen: '' })
  useEffect(() => {
    // Canvas text needs the web font loaded; redraw once it is.
    let alive = true
    void Promise.all(
      ['300 150px Inter', '400 38px Inter', '500 68px Inter', '600 44px Inter'].map((f) =>
        document.fonts?.load(f),
      ),
    ).then(() => {
      if (alive) live.current.key = ''
    })
    return () => {
      alive = false
    }
  }, [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const down = useMemo(() => new THREE.Quaternion(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const l = live.current
    if (phone.screen !== l.screen) {
      l.screen = phone.screen
      l.started = t
    }
    const timed =
      phone.screen === 'playing' ? phone.messageSeconds : phone.screen === 'call' ? 16 : 0
    const progress = timed ? Math.min(1, (t - l.started) / timed) : 0
    const shown = portraitStill ? '' : time
    const key = `${JSON.stringify(phone)}|${shown}|${Math.floor(progress * 11)}`
    if (key !== l.key) {
      drawScreen(canvas, phone, shown, night, progress)
      texture.needsUpdate = true
      l.key = key
      l.progress = progress
    }
    body.visible = phone.place === 'table' || phone.place === 'hand'
    led.visible = phone.missed > 0 && phone.screen === 'off' && t % 4 < 0.18
    glass.visible = true
    if (phone.place === 'hand') {
      // Held in front of the eyes, a little low and to the right, tilted toward them.
      camera.getWorldDirection(forward)
      body.position.copy(camera.position).addScaledVector(forward, 0.38)
      body.quaternion.copy(camera.quaternion)
      body.translateX(portraitStill ? 0 : 0.1)
      body.translateY(portraitStill ? -0.005 : -0.075)
      down.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.18, 0, 0.04))
      body.quaternion.multiply(down)
      // A hand is never perfectly still.
      body.position.y += Math.sin(t * 1.7) * 0.0012
      desktopRuntime.phone = `hand:${phone.screen}`
      return
    }
    body.position.set(table.position[0], table.position[1] + T / 2, table.position[2])
    body.rotation.set(0, table.rotation, 0)
    if (phone.faceDown) body.rotateZ(Math.PI)
    desktopRuntime.phone = `${phone.place}:${phone.screen}${phone.faceDown ? ':down' : ''}`
  })
  return <primitive object={body} />
}
