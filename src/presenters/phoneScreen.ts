import { line, ui } from '@/content/text'
import type { PhoneWorld } from '@/core/director/types'

/** The phone's screen in layout units; both presenters draw it from the same function. */
export const SCREEN = { w: 720, h: 1488 }

function waveform(seed: number): number[] {
  let s = seed * 9301 + 49297
  return Array.from({ length: 44 }, (_, i) => {
    s = (s * 9301 + 49297) % 233280
    const envelope = Math.sin((Math.PI * (i + 1)) / 45) ** 0.6
    return 0.18 + envelope * (0.25 + (s / 233280) * 0.57)
  })
}

function wrap(c: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = []
  let row = ''
  for (const word of text.split(/\s+/)) {
    const next = row ? `${row} ${word}` : word
    if (c.measureText(next).width > width && row) {
      out.push(row)
      row = word
    } else row = next
  }
  if (row) out.push(row)
  return out
}

/** Draws one state of the screen. */
export function drawScreen(
  canvas: HTMLCanvasElement,
  phone: PhoneWorld,
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
  const screen = phone.screen
  if (screen === 'off' || screen === 'dead') return
  const sky = c.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1d2633')
  sky.addColorStop(1, '#07090c')
  c.fillStyle = sky
  c.fillRect(0, 0, w, h)
  const card = (y: number, height: number) => {
    c.fillStyle = 'rgba(232, 236, 242, 0.11)'
    c.beginPath()
    c.roundRect(40, y, w - 80, height, 34)
    c.fill()
  }
  const avatar = (x: number, y: number, letter: string) => {
    c.fillStyle = '#5b6b7d'
    c.beginPath()
    c.arc(x, y, 42, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#e9edf2'
    c.textAlign = 'center'
    c.font = '500 44px Inter, sans-serif'
    c.fillText(letter, x, y + 16)
    c.textAlign = 'left'
  }
  if (screen === 'incoming' || screen === 'call') {
    const caller = screen === 'call' ? ui('phone.rustam') : ui('phone.mother')
    avatar(w / 2, 620, caller[0]!)
    c.textAlign = 'center'
    c.fillStyle = '#eef1f4'
    c.font = '500 68px Inter, sans-serif'
    c.fillText(caller, w / 2, 760)
    c.fillStyle = '#9aa6b4'
    c.font = '400 38px Inter, sans-serif'
    if (screen === 'call')
      c.fillText(`0:${String(Math.floor(progress * 16)).padStart(2, '0')}`, w / 2, 820)
    else c.fillText(ui('phone.incoming'), w / 2, 820)
    if (screen === 'incoming' && phone.canAnswer) {
      c.fillStyle = '#3f9a5c'
      c.beginPath()
      c.roundRect(w / 2 - 220, h - 300, 440, 110, 55)
      c.fill()
      c.fillStyle = '#eef1f4'
      c.font = '500 40px Inter, sans-serif'
      c.fillText(ui('phone.call'), w / 2, h - 232)
    }
    c.textAlign = 'left'
    return
  }
  c.fillStyle = '#d9dde3'
  c.textAlign = 'center'
  c.font = '300 150px Inter, sans-serif'
  c.fillText(time, w / 2, 280)
  if (phone.date) {
    c.font = '400 36px Inter, sans-serif'
    c.fillStyle = '#aab4c0'
    c.fillText(ui(phone.date), w / 2, 340)
  }
  c.textAlign = 'left'
  let y = 400
  if (phone.work) {
    card(y, 150)
    c.fillStyle = '#eef1f4'
    c.font = '600 36px Inter, sans-serif'
    c.fillText(ui('phone.work'), 80, y + 56)
    c.fillStyle = '#c9d0d8'
    c.font = '400 32px Inter, sans-serif'
    c.fillText(wrap(c, line(phone.work), w - 170)[0] ?? '', 80, y + 104)
    y += 175
  }
  if (phone.missed > 0) {
    card(y, 150)
    avatar(122, y + 75, 'O')
    c.fillStyle = '#eef1f4'
    c.font = '600 44px Inter, sans-serif'
    c.fillText(ui('phone.mother'), 192, y + 62)
    c.fillStyle = '#e07a6b'
    c.font = '400 34px Inter, sans-serif'
    c.fillText(ui('phone.missed', { count: phone.missed }), 192, y + 110)
    y += 175
  }
  if (phone.message) {
    const playing = screen === 'playing'
    const transcript =
      playing || screen === 'draft' ? phone.message.map((key) => line(key)).join(' ') : ''
    c.font = '400 34px Inter, sans-serif'
    const rows = transcript ? wrap(c, transcript, w - 170) : []
    const height = 200 + rows.length * 46
    card(y, height)
    c.fillStyle = '#eef1f4'
    c.font = '600 40px Inter, sans-serif'
    c.fillText(ui('phone.mother'), 80, y + 64)
    c.fillStyle = '#9aa6b4'
    c.font = '400 32px Inter, sans-serif'
    c.fillText(phone.heard && !playing ? ui('phone.voice_heard') : ui('phone.voice'), 80, y + 108)
    const cy = y + 150
    c.fillStyle = '#eef1f4'
    if (playing) {
      c.fillRect(82, cy - 23, 12, 46)
      c.fillRect(104, cy - 23, 12, 46)
    } else {
      c.beginPath()
      c.moveTo(84, cy - 25)
      c.lineTo(120, cy)
      c.lineTo(84, cy + 25)
      c.fill()
    }
    waveform(night).forEach((v, i, bars) => {
      const played = playing && i / bars.length < progress
      c.fillStyle = played ? '#eef1f4' : 'rgba(238, 241, 244, 0.38)'
      c.fillRect(150 + i * 10.5, cy - v * 32, 6, v * 64)
    })
    const seconds = Math.round(phone.messageSeconds * (playing ? progress : 1))
    c.fillStyle = '#9aa6b4'
    c.font = '400 30px Inter, sans-serif'
    c.textAlign = 'right'
    c.fillText(`0:${String(seconds).padStart(2, '0')}`, w - 70, cy + 10)
    c.textAlign = 'left'
    c.fillStyle = '#dfe4ea'
    c.font = '400 34px Inter, sans-serif'
    rows.forEach((row, i) => c.fillText(row, 80, y + 220 + i * 46))
    y += height + 25
  }
  if (screen === 'draft' || phone.draft === 'sent') {
    card(h - 260, 130)
    c.fillStyle = '#eef1f4'
    c.font = '400 36px Inter, sans-serif'
    c.fillText(ui('phone.draft'), 80, h - 182)
    if (phone.draft === 'shown') {
      c.fillStyle = '#4c86c9'
      c.beginPath()
      c.roundRect(w - 250, h - 245, 170, 100, 30)
      c.fill()
      c.fillStyle = '#eef1f4'
      c.font = '500 30px Inter, sans-serif'
      c.textAlign = 'center'
      c.fillText(ui('phone.send'), w - 165, h - 183)
      c.textAlign = 'left'
    }
  }
}
