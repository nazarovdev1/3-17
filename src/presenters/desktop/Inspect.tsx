/* eslint-disable react-hooks/immutability -- R3F scene handles are mutable Three.js objects, synchronized imperatively. */
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { line } from '@/content/text'
import { READABLES } from '@/content/nights'

/**
 * Picking up a paper (FIX_PROMPT §4.5): diary pages and the landlord's note are held in
 * front of the eyes, readable in HD, and turn with the mouse (CameraRig routes the drag
 * here while `desktopRuntime.inspecting` is set). Put down by moving away.
 */
export interface Readable {
  kind: 'diary' | 'note' | 'calendar' | 'passport'
  lines: string[]
  /** First line written later, in another pen (the landlord's afterthought). */
  otherInkFrom?: number
  /** The player's own handwriting. */
  ownHand?: boolean
}

/** The paper the Director put in the player's hand, with its words. */
export function readableOf(id: string | null, name: string): Readable | null {
  const paper = id ? READABLES[id] : undefined
  if (!paper) return null
  return {
    kind: paper.kind,
    lines: paper.lines.map((key) => line(key, name)),
    otherInkFrom: paper.otherInkFrom,
    ownHand: paper.ownHand,
  }
}

const PAGE = { w: 1024, h: 1440 }

function wrap(c: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (c.measureText(next).width > width && line) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out
}

/** A wall calendar's December: 1–16 crossed out in ballpoint, 17 left. */
function drawCalendar(c: CanvasRenderingContext2D, month: string) {
  const { w, h } = PAGE
  c.fillStyle = '#d9d3c3'
  c.fillRect(0, 0, w, h)
  c.fillStyle = 'rgba(90, 80, 60, 0.25)'
  c.fillRect(0, 0, w, 40)
  c.fillStyle = '#7a2a24'
  c.font = '700 110px Literata, Georgia, serif'
  c.textAlign = 'center'
  c.fillText(month.toUpperCase(), w / 2, 210)
  c.font = '400 64px Literata, Georgia, serif'
  const cell = { w: 132, h: 150 }
  // This December starts on a Monday (the phone shows Saturday the 13th).
  for (let day = 1; day <= 31; day++) {
    const col = (day - 1) % 7
    const row = Math.floor((day - 1) / 7)
    const x = 50 + col * cell.w + cell.w / 2
    const y = 380 + row * cell.h
    c.fillStyle = col >= 5 ? '#7a2a24' : '#2b2a27'
    c.fillText(String(day), x, y)
    if (day <= 16) {
      c.strokeStyle = 'rgba(30, 45, 95, 0.85)'
      c.lineWidth = 6
      c.beginPath()
      c.moveTo(x - 44 + (day % 3) * 3, y - 58)
      c.lineTo(x + 44, y + 18 - (day % 4) * 3)
      c.moveTo(x + 42 - (day % 2) * 4, y - 60)
      c.lineTo(x - 44, y + 16)
      c.stroke()
    }
  }
  c.textAlign = 'left'
  // Dust over everything, thicker toward the bottom.
  for (let i = 0; i < 600; i++) {
    c.fillStyle = `rgba(150, 140, 120, ${0.05 + (i % 5) * 0.02})`
    c.fillRect((i * 389) % w, (i * 241) % h, 3 + (i % 4), 3 + (i % 3))
  }
  const dust = c.createLinearGradient(0, 0, 0, h)
  dust.addColorStop(0, 'rgba(120, 110, 90, 0.08)')
  dust.addColorStop(1, 'rgba(120, 110, 90, 0.35)')
  c.fillStyle = dust
  c.fillRect(0, 0, w, h)
}

/** The player's passport, open at the photo page, under thick dust; the photo is grey. */
function drawPassport(c: CanvasRenderingContext2D, lines: string[]) {
  const { w, h } = PAGE
  c.fillStyle = '#cfd4c4'
  c.fillRect(0, 0, w, h)
  c.strokeStyle = 'rgba(80, 110, 90, 0.18)'
  c.lineWidth = 2
  for (let y = 0; y < h; y += 18) {
    c.beginPath()
    c.moveTo(0, y)
    c.bezierCurveTo(w / 3, y + 12, (2 * w) / 3, y - 12, w, y)
    c.stroke()
  }
  c.fillStyle = '#3d4a40'
  c.font = '700 70px Literata, Georgia, serif'
  c.fillText(lines[0]!.toUpperCase(), 90, 170)
  // The photo: dust has made it a grey square.
  c.fillStyle = '#9a9a92'
  c.fillRect(90, 260, 320, 420)
  c.fillStyle = 'rgba(70, 70, 66, 0.35)'
  c.beginPath()
  c.ellipse(250, 430, 90, 120, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#20231f'
  c.font = '400 72px Literata, Georgia, serif'
  for (const [i, row] of wrap(c, lines[1] ?? '', w - 520).entries())
    c.fillText(row, 460, 340 + i * 90)
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(140, 132, 115, ${0.06 + (i % 5) * 0.025})`
    c.fillRect((i * 389) % w, (i * 241) % h, 3 + (i % 5), 3 + (i % 3))
  }
  c.fillStyle = 'rgba(130, 122, 105, 0.3)'
  c.fillRect(0, 0, w, h)
}

/** A squared school-notebook page (diary) or a torn sheet (note), written in ink. */
function drawPage(canvas: HTMLCanvasElement, paper: Readable) {
  const c = canvas.getContext('2d')!
  const { w, h } = PAGE
  if (paper.kind === 'calendar') return drawCalendar(c, paper.lines[0] ?? '')
  if (paper.kind === 'passport') return drawPassport(c, paper.lines)
  c.fillStyle = paper.kind === 'diary' ? '#e6e0cf' : '#ebe6da'
  c.fillRect(0, 0, w, h)
  // Age: soft stains and a darker edge.
  for (let i = 0; i < 26; i++) {
    c.fillStyle = `rgba(120, 95, 55, ${0.025 + (i % 3) * 0.012})`
    c.beginPath()
    c.ellipse((i * 383) % w, (i * 619) % h, 40 + (i % 5) * 30, 30 + (i % 4) * 22, i, 0, Math.PI * 2)
    c.fill()
  }
  const edge = c.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h / 2, h * 0.78)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(40, 30, 15, 0.55)')
  c.fillStyle = edge
  c.fillRect(0, 0, w, h)
  const left = paper.kind === 'diary' ? 150 : 90
  if (paper.kind === 'diary') {
    c.strokeStyle = 'rgba(80, 120, 170, 0.32)'
    c.lineWidth = 1.5
    for (let x = 0; x < w; x += 36) c.strokeRect(x, -1, 0, h + 2)
    for (let y = 0; y < h; y += 36) c.strokeRect(-1, y, w + 2, 0)
    c.strokeStyle = 'rgba(190, 70, 70, 0.55)'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(left - 22, 0)
    c.lineTo(left - 22, h)
    c.stroke()
  }
  // Ink: dark blue ballpoint for the diary, pencil-grey for the landlord.
  const ink = paper.kind === 'diary' ? '#1f2c55' : '#3a3833'
  c.font = paper.ownHand
    ? '400 64px Literata, Georgia, serif'
    : 'italic 400 62px Literata, Georgia, serif'
  let y = 190
  for (const [i, text] of paper.lines.entries()) {
    // A later line in a different pen: blue ballpoint under the landlord's pencil.
    c.fillStyle = paper.otherInkFrom !== undefined && i >= paper.otherInkFrom ? '#22346b' : ink
    for (const row of wrap(c, text, w - left - 80)) {
      c.save()
      c.translate(left, y)
      // Handwriting does not keep a straight line.
      c.rotate(-0.012 + ((i * 7 + y) % 5) * 0.003)
      c.fillText(row, 0, 0)
      c.restore()
      y += 92
    }
    y += 40
  }
}

export function Inspect({ paper }: { paper: Readable | null }) {
  const camera = useThree((s) => s.camera)
  const { mesh, texture, canvas } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = PAGE.w
    canvas.height = PAGE.h
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    // A sheet that has been folded: a slight bend across the middle.
    const geometry = new THREE.PlaneGeometry(0.148, 0.208, 12, 16)
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      position.setZ(i, -Math.abs(y) * 0.06 + Math.sin(x * 30) * 0.0015)
    }
    geometry.computeVertexNormals()
    // Unlit on purpose: held this close, the torch would burn it white. The paper is shown
    // as if under a soft torch beam, a little dimmer toward its folds (drawn in the canvas).
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: texture, color: '#a9a49a', side: THREE.DoubleSide }),
    )
    mesh.visible = false
    return { mesh, texture, canvas }
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => {
    if (!paper) {
      desktopRuntime.inspecting = false
      return
    }
    const draw = () => {
      drawPage(canvas, paper)
      texture.needsUpdate = true
    }
    draw()
    void document.fonts?.load('italic 400 62px Literata').then(draw)
    desktopRuntime.inspectYaw = 0
    desktopRuntime.inspectPitch = 0
    desktopRuntime.inspecting = true
    return () => {
      desktopRuntime.inspecting = false
    }
  }, [paper, canvas, texture])
  const forward = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    mesh.visible = !!paper
    if (!paper) return
    camera.getWorldDirection(forward)
    mesh.position.copy(camera.position).addScaledVector(forward, 0.29)
    mesh.quaternion.copy(camera.quaternion)
    mesh.translateY(-0.012)
    mesh.rotateY(desktopRuntime.inspectYaw)
    mesh.rotateX(desktopRuntime.inspectPitch - 0.08)
    mesh.position.y += Math.sin(clock.elapsedTime * 1.4) * 0.001
  })
  return <primitive object={mesh} />
}
