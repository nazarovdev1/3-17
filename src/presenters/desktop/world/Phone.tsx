/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ui } from '@/content/text'
import { objectById } from '@/content/world/layout'
import { audio } from '@/audio/engine'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import type { GameState } from '@/core/state/types'
import { phoneState, phoneTime, type PhoneState } from '../phone'
import { primeUpload } from './prime'

/**
 * The player's phone (fear-design.md): on the room table, screen dark, its notification
 * light blinking for the missed calls; now and then it buzzes and lights up with "Onam".
 * On night 1 it is face down when the player comes back from the kitchen — it turns over
 * only while nobody is looking. Under the pillow on night 4 it is only a buzz. At the phone
 * beats it is held in front of the eyes, the missed calls and the voice message readable.
 */
const W = 0.075
const H = 0.155
const T = 0.009
/** Layout units of the drawing; the canvas itself is 3/4 of this (sharp at arm's length). */
const SCREEN = { w: 720, h: 1488 }
const PIXELS = 0.75
/** The CPU rasterizer gets a smaller screen: every redraw is a texture upload. */
const SOFTWARE_PIXELS = 0.45

type Screen = 'off' | 'incoming' | PhoneState['screen']

function waveform(seed: number): number[] {
  let s = seed * 9301 + 49297
  return Array.from({ length: 44 }, (_, i) => {
    s = (s * 9301 + 49297) % 233280
    const envelope = Math.sin((Math.PI * (i + 1)) / 45) ** 0.6
    return 0.18 + envelope * (0.25 + (s / 233280) * 0.57)
  })
}

/** Draws the screen: lock screen with the calls, or the voice message with its progress. */
function drawScreen(
  canvas: HTMLCanvasElement,
  screen: Screen,
  phone: PhoneState,
  time: string,
  night: number,
  progress: number,
) {
  const c = canvas.getContext('2d')!
  const scale = canvas.width / SCREEN.w
  c.setTransform(scale, 0, 0, scale, 0, 0)
  const { w, h } = SCREEN
  c.fillStyle = '#000'
  c.fillRect(0, 0, w, h)
  if (screen === 'off' || screen === 'dead') return
  // A plain dark wallpaper, a little light at the top.
  const sky = c.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1d2633')
  sky.addColorStop(1, '#07090c')
  c.fillStyle = sky
  c.fillRect(0, 0, w, h)
  c.fillStyle = '#d9dde3'
  c.textAlign = 'center'
  c.font = '300 150px Inter, sans-serif'
  c.fillText(time, w / 2, 300)
  c.textAlign = 'left'
  const card = (y: number, height: number) => {
    c.fillStyle = 'rgba(232, 236, 242, 0.11)'
    c.beginPath()
    c.roundRect(40, y, w - 80, height, 34)
    c.fill()
  }
  const avatar = (x: number, y: number) => {
    c.fillStyle = '#5b6b7d'
    c.beginPath()
    c.arc(x, y, 42, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#e9edf2'
    c.textAlign = 'center'
    c.font = '500 44px Inter, sans-serif'
    c.fillText('O', x, y + 16)
    c.textAlign = 'left'
  }
  if (screen === 'incoming') {
    avatar(w / 2, 620)
    c.textAlign = 'center'
    c.fillStyle = '#eef1f4'
    c.font = '500 68px Inter, sans-serif'
    c.fillText(ui('phone.mother'), w / 2, 760)
    c.fillStyle = '#9aa6b4'
    c.font = '400 38px Inter, sans-serif'
    c.fillText(ui('phone.incoming'), w / 2, 820)
    c.fillText(ui('phone.unlock'), w / 2, h - 120)
    return
  }
  // Missed calls.
  card(420, 170)
  avatar(122, 505)
  c.fillStyle = '#eef1f4'
  c.font = '600 44px Inter, sans-serif'
  c.fillText(ui('phone.mother'), 192, 490)
  c.fillStyle = '#e07a6b'
  c.font = '400 34px Inter, sans-serif'
  c.fillText(ui('phone.missed', { count: phone.missed }), 192, 540)
  // Tonight's voice message.
  card(620, 230)
  c.fillStyle = '#eef1f4'
  c.font = '600 40px Inter, sans-serif'
  c.fillText(ui('phone.mother'), 80, 690)
  c.fillStyle = '#9aa6b4'
  c.font = '400 32px Inter, sans-serif'
  c.fillText(
    phone.heard && screen !== 'playing' ? ui('phone.voice_heard') : ui('phone.voice'),
    80,
    735,
  )
  // Play / pause, the waveform, the time.
  c.fillStyle = '#eef1f4'
  if (screen === 'playing') {
    c.fillRect(82, 768, 12, 46)
    c.fillRect(104, 768, 12, 46)
  } else {
    c.beginPath()
    c.moveTo(84, 766)
    c.lineTo(120, 791)
    c.lineTo(84, 816)
    c.fill()
  }
  const bars = waveform(night)
  bars.forEach((v, i) => {
    const x = 150 + i * 10.5
    const played = screen === 'playing' && i / bars.length < progress
    c.fillStyle = played ? '#eef1f4' : 'rgba(238, 241, 244, 0.38)'
    c.fillRect(x, 791 - v * 32, 6, v * 64)
  })
  const seconds = Math.round(phone.messageSeconds * (screen === 'playing' ? progress : 1))
  c.fillStyle = '#9aa6b4'
  c.font = '400 30px Inter, sans-serif'
  c.textAlign = 'right'
  c.fillText(`0:${String(seconds).padStart(2, '0')}`, w - 70, 802)
  c.textAlign = 'left'
}

export function Phone({
  state,
  node,
  detailed,
}: {
  state: GameState
  node: string
  /** Full PBR; the CPU rasterizer gets an unlit body. */
  detailed: boolean
}) {
  const camera = useThree((s) => s.camera)
  const phone = useMemo(() => phoneState(node, state), [node, state])
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
  const live = useRef({
    screen: '',
    progress: -1,
    time: '',
    started: -1,
    nextBuzz: 25,
    lit: 0,
    flipped: false,
    key: '',
  })
  useEffect(() => {
    // Canvas text needs the web font loaded; redraw once it is.
    let live_ = true
    void Promise.all(
      ['300 150px Inter', '400 38px Inter', '500 68px Inter', '600 44px Inter'].map((f) =>
        document.fonts?.load(f),
      ),
    ).then(() => {
      if (live_) live.current.screen = ''
    })
    return () => {
      live_ = false
    }
  }, [])
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const sphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 0.15), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const down = useMemo(() => new THREE.Quaternion(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const l = live.current
    if (l.key !== node) {
      l.key = node
      l.started = t
      if (!phone.faceDown) l.flipped = false
    }
    const position: [number, number, number] = [
      table.position[0],
      table.position[1],
      table.position[2],
    ]
    // Night 4: under the pillow. Only the buzz is left of it.
    body.visible = phone.place !== 'pillow'
    // Buzzing now and then while the calls go unanswered.
    if (phone.calling && t > l.nextBuzz && desktopRuntime.worldReady) {
      l.nextBuzz = t + 48 + ((t * 7.3) % 30)
      l.lit = t + 6
      const sofa = objectById('sofa')!
      audio.play(
        'phone_buzz',
        phone.place === 'pillow' ? [sofa.position[0], 0.5, sofa.position[2]] : position,
        phone.place === 'pillow' ? 0.3 : 1,
      )
    }
    let screen: Screen = phone.screen
    if (screen === 'off' && t < l.lit && phone.place === 'table') screen = 'incoming'
    const progress = screen === 'playing' ? Math.min(1, (t - l.started) / phone.messageSeconds) : 0
    const time = phoneTime(state)
    if (
      screen !== l.screen ||
      time !== l.time ||
      Math.floor(progress * 11) !== Math.floor(l.progress * 11)
    ) {
      drawScreen(canvas, screen, phone, time, state.night, progress)
      texture.needsUpdate = true
      l.screen = screen
      l.time = time
      l.progress = progress
    }
    // The notification light: one short green blink every four seconds.
    led.visible = phone.calling && screen === 'off' && t % 4 < 0.18
    glass.visible = true

    if (phone.place === 'hand') {
      // Held in front of the eyes, a little low and to the right, tilted toward them.
      camera.getWorldDirection(forward)
      body.position.copy(camera.position).addScaledVector(forward, 0.38)
      body.quaternion.copy(camera.quaternion)
      body.translateX(0.1)
      body.translateY(-0.075)
      down.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.18, 0, 0.04))
      body.quaternion.multiply(down)
      // A hand is never perfectly still.
      body.position.y += Math.sin(t * 1.7) * 0.0012
      desktopRuntime.phone = `hand:${screen}`
      return
    }
    body.position.set(position[0], position[1] + T / 2, position[2])
    body.rotation.set(0, table.rotation, 0)
    // Face down from the moment nobody watched it (night 1).
    if (phone.faceDown && !l.flipped) {
      camera.updateMatrixWorld()
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(matrix)
      sphere.center.set(...position)
      if (!frustum.intersectsSphere(sphere)) l.flipped = true
    }
    if (l.flipped) body.rotateZ(Math.PI)
    desktopRuntime.phone = `${phone.place}:${screen}${l.flipped ? ':down' : ''}`
  })
  return <primitive object={body} />
}
