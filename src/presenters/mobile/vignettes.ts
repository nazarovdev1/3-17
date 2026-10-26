/**
 * Procedural pixel-art vignettes (spec 6.2). Every scene is drawn on a small
 * offscreen buffer (180×320) with the palette from spec 6 and scaled up with
 * image-rendering: pixelated. No external assets.
 */
export const VIGNETTE_W = 180
export const VIGNETTE_H = 320

export const PAL = {
  bg: '#0B0B0C',
  cold: '#141A22',
  orange: '#D98A2B',
  green: '#9FBF8F',
  paper: '#CFC6B0',
  danger: '#8E1F1F',
  wall: '#1a2029',
  wallDark: '#12161d',
  floor: '#23180f',
  wood: '#3a2a18',
  metal: '#4a4d52',
  snow: '#aab4c0',
}

export interface DrawCtx {
  c: CanvasRenderingContext2D
  /** Parallax offsets in pixels, from gyroscope or touch drag. */
  px: number
  py: number
  /** Animation time in seconds. */
  t: number
  /** Sanity 0..100 for distortion intensity. */
  sanity: number
  reduceFlashing?: boolean
  clockShifted?: boolean
  mirrorPx?: number
  mirrorPy?: number
}

function rect(
  d: DrawCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  parallax = 1,
): void {
  d.c.fillStyle = color
  d.c.fillRect(Math.round(x + d.px * parallax), Math.round(y + d.py * parallax), w, h)
}

function roomShell(d: DrawCtx, lampOn: boolean): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, PAL.wall, 0.3)
  rect(d, 0, 210, VIGNETTE_W, 110, PAL.floor, 0.3)
  // Ceiling lamp.
  if (lampOn) {
    const flicker = d.reduceFlashing ? 1 : 0.94 + Math.sin(d.t * 1.4) * 0.06
    d.c.fillStyle = PAL.orange
    d.c.globalAlpha = 0.16 * flicker
    d.c.beginPath()
    d.c.arc(90 + d.px * 0.3, 96 + d.py * 0.3, 74, 0, Math.PI * 2)
    d.c.fill()
    d.c.globalAlpha = 1
    rect(d, 82, 18, 16, 5, PAL.metal, 0.3)
    rect(d, 86, 23, 8, 4, '#e8c87a', 0.3)
  } else {
    rect(d, 82, 18, 16, 5, '#2a2d31', 0.3)
  }
  // Wallpaper pattern stripe.
  for (let y = 30; y < 200; y += 18) {
    for (let x = 6 + (y % 36 === 30 ? 9 : 0); x < VIGNETTE_W; x += 18) {
      rect(d, x, y, 2, 2, '#20262e', 0.3)
    }
  }
}

function furnishedRoom(d: DrawCtx, lit: boolean): void {
  roomShell(d, lit)
  // Four depths: wallpaper, door/window, furniture, foreground carpet.
  rect(d, 13, 94, 30, 92, '#30281e', 0.35)
  rect(d, 15, 98, 26, 84, '#18191b', 0.35)
  rect(d, 36, 142, 3, 2, PAL.metal, 0.35)
  rect(d, 65, 72, 48, 44, '#070c13', 0.45)
  rect(d, 87, 72, 3, 44, PAL.wood, 0.45)
  rect(d, 65, 94, 48, 3, PAL.wood, 0.45)
  rect(d, 101, 85, 5, 8, lit ? PAL.orange : '#27221a', 0.45)
  // Soviet wall carpet, clock stopped at 3:17.
  rect(d, 62, 127, 58, 67, '#342a26', 0.5)
  for (let i = 0; i < 5; i++) rect(d, 67 + i * 10, 134, 3, 50, '#615144', 0.5)
  const clockX = d.clockShifted ? 28 : 0
  if (d.clockShifted) rect(d, 80, 112, 20, 21, '#303337', 0.5)
  rect(d, 80 + clockX, 112, 20, 21, PAL.wood, 0.5)
  rect(d, 83 + clockX, 115, 14, 15, PAL.paper, 0.5)
  rect(d, 90 + clockX, 122, 5, 1, '#191b1c', 0.5)
  rect(d, 90 + clockX, 122, 1, 6, '#191b1c', 0.5)
  // Wardrobe, brass handle and tallies.
  rect(d, 130, 100, 30, 98, PAL.wood, 0.65)
  rect(d, 145, 105, 1, 89, '#171513', 0.65)
  rect(d, 142, 146, 2, 5, PAL.orange, 0.65)
  for (let i = 0; i < 4; i++) rect(d, 135 + i * 3, 116, 1, 8, '#70614c', 0.65)
  // Rubin television and low cabinet.
  rect(d, 22, 130, 37, 30, PAL.wood, 0.7)
  rect(d, 26, 133, 26, 20, lit ? '#3c4949' : '#111a21', 0.7)
  rect(d, 54, 138, 2, 3, PAL.paper, 0.7)
  rect(d, 24, 161, 35, 34, '#28211b', 0.7)
  rect(d, 29, 187, 25, 10, PAL.paper, 0.75)
  rect(d, 32, 189, 18, 1, PAL.wood, 0.75)
  // Radiator below the window, pipe continuing into the shared wall.
  for (let i = 0; i < 7; i++) rect(d, 121 + i * 5, 204, 3, 20, PAL.metal, 0.7)
  rect(d, 156, 214, 24, 2, PAL.metal, 0.7)
  rect(d, 64, 248, 54, 55, '#392f28', 1)
  for (let i = 0; i < 4; i++) rect(d, 70 + i * 12, 253, 3, 45, '#655646', 1)
  if (!lit) rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, 'rgba(0,5,12,0.38)', 0)
}

function snowfall(d: DrawCtx, count: number): void {
  d.c.fillStyle = PAL.snow
  for (let i = 0; i < count; i++) {
    const seed = i * 97.13
    const x = (seed * 31.7 + d.t * (8 + (i % 5) * 3)) % VIGNETTE_W
    const y = (seed * 53.1 + d.t * 22) % 180
    d.c.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
}

function windowView(d: DrawCtx, dark: boolean): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, PAL.wallDark, 0.2)
  rect(d, 18, 40, 144, 150, dark ? '#08090b' : PAL.cold, 0.5)
  // Cross frame.
  rect(d, 86, 40, 4, 150, '#0a0c0f', 0.5)
  rect(d, 18, 110, 144, 4, '#0a0c0f', 0.5)
  // Streetlamp glow.
  const lampX = 126 + d.px * 0.5
  rect(d, lampX, 96, 4, 54, PAL.orange, 0.5)
  d.c.fillStyle = PAL.orange
  d.c.globalAlpha = dark ? 0.05 : 0.12
  d.c.beginPath()
  d.c.arc(lampX + 2, 104, 22, 0, Math.PI * 2)
  d.c.fill()
  d.c.globalAlpha = 1
  // Opposite building windows; dark = one by one they go out (3:16).
  const litWindows = [2, 8, 15, 21, 28]
  const extinguished = dark ? Math.min(5, Math.floor(d.t * 1.4)) : 0
  for (let i = 0; i < 30; i++) {
    const rank = litWindows.indexOf(i)
    rect(
      d,
      22 + (i % 6) * 22,
      52 + Math.floor(i / 6) * 25,
      9,
      12,
      rank >= extinguished && rank >= 0 ? '#e8c87a' : '#101317',
      0.5,
    )
  }
  snowfall(d, 60)
  // Windowsill.
  rect(d, 10, 190, 160, 8, PAL.wood, 0.2)
}

function wallKnock(d: DrawCtx, knockPhase: number): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, PAL.wallDark, 0.3)
  // Wallpaper stripes on the shared wall.
  for (let x = 0; x < VIGNETTE_W; x += 12) {
    rect(d, x, 0, 6, VIGNETTE_H, '#181d24', 0.3)
  }
  // Knock ripple.
  const r = knockPhase * 26
  d.c.strokeStyle = PAL.green
  d.c.globalAlpha = Math.max(0, 1 - knockPhase) * 0.8
  for (let i = 1; i <= 3; i++) {
    d.c.beginPath()
    d.c.arc(90 + d.px * 0.3, 120 + d.py * 0.3, r * i, 0, Math.PI * 2)
    d.c.stroke()
  }
  d.c.globalAlpha = 1
}

function corridor(d: DrawCtx, stretched: boolean): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, '#161a20', 0.4)
  // Perspective walls converge to the front door; stretched pushes the door away.
  const doorY = stretched ? 96 : 132
  const doorH = stretched ? 60 : 84
  const doorW = stretched ? 26 : 36
  d.c.fillStyle = '#0c0e11'
  d.c.beginPath()
  d.c.moveTo(40, 120)
  d.c.lineTo(140, 120)
  d.c.lineTo(90 + doorW / 2, doorY)
  d.c.lineTo(90 - doorW / 2, doorY)
  d.c.closePath()
  d.c.fill()
  rect(d, 90 - doorW / 2, doorY, doorW, doorH, PAL.wood, 0.7)
  rect(d, 90 - doorW / 2 + doorW - 7, doorY + doorH / 2, 3, 3, PAL.metal, 0.7)
  rect(d, 0, 200, VIGNETTE_W, 120, PAL.floor, 0.4)
  // Runner carpet.
  d.c.fillStyle = PAL.danger
  d.c.globalAlpha = 0.5
  d.c.beginPath()
  d.c.moveTo(70, 320)
  d.c.lineTo(110, 320)
  d.c.lineTo(92, doorY + doorH)
  d.c.lineTo(88, doorY + doorH)
  d.c.closePath()
  d.c.fill()
  d.c.globalAlpha = 1
}

function stairwell(d: DrawCtx): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, '#1c222a', 0.4)
  // Steps going down-left.
  for (let i = 0; i < 6; i++) {
    rect(d, 10 + i * 12, 240 - i * 22, 60, 6, PAL.metal, 0.4)
    rect(d, 10 + i * 12, 246 - i * 22, 60, 16, '#2e3338', 0.4)
  }
  // Window at the landing.
  rect(d, 110, 60, 48, 60, '#0d1013', 0.5)
  snowfall(d, 30)
  // Muhabbat's door with halva plate glow.
  rect(d, 20, 90, 56, 130, PAL.wood, 0.5)
  rect(d, 68, 150, 4, 4, PAL.orange, 0.5)
}

function flat48(d: DrawCtx): void {
  furnishedRoom(d, false)
  // Decay: darker patches, torn wallpaper.
  rect(d, 20, 60, 40, 50, '#0d0f12', 0.5)
  rect(d, 120, 130, 30, 70, '#101318', 0.5)
  for (let i = 0; i < 12; i++) {
    rect(d, 30 + i * 11, 44, 1, 8 + (i % 3) * 4, '#0a0c0e', 0.5)
  }
  // Crossed-out calendar.
  rect(d, 118, 44, 30, 40, PAL.paper, 0.6)
  d.c.fillStyle = PAL.danger
  for (let i = 0; i < 9; i++) {
    d.c.fillRect(120, 48 + i * 4, 26 - (i === 8 ? 14 : 0), 1)
  }
  rect(d, 46, 191, 26, 4, PAL.wood, 0.8)
  rect(d, 48, 196, 3, 30, PAL.wood, 0.8)
  rect(d, 67, 196, 3, 30, PAL.wood, 0.8)
  rect(d, 50, 205, 17, 9, PAL.paper, 0.8)
  rect(d, 40, 176, 24, 12, '#545c61', 0.8)
}

function peepholeView(d: DrawCtx, figure: boolean): void {
  rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, '#050607', 0)
  // Fisheye: bright circle in the middle, heavy edge vignette.
  const grad = d.c.createRadialGradient(90 + d.px, 110 + d.py, 10, 90, 110, 95)
  grad.addColorStop(0, '#3a4148')
  grad.addColorStop(0.7, '#1a1e23')
  grad.addColorStop(1, '#050607')
  d.c.fillStyle = grad
  d.c.fillRect(0, 0, VIGNETTE_W, VIGNETTE_H)
  // Landing floor + figure silhouette.
  rect(d, 30, 150, 120, 60, '#20252b', 0.6)
  if (figure) {
    d.c.fillStyle = '#080a0c'
    d.c.fillRect(82 + d.px, 88 + d.py, 16, 62)
    d.c.beginPath()
    d.c.arc(90 + d.px, 84 + d.py, 8, 0, Math.PI * 2)
    d.c.fill()
  }
  d.c.strokeStyle = '#000'
  d.c.lineWidth = 30
  d.c.beginPath()
  d.c.arc(90, 110, 100, 0, Math.PI * 2)
  d.c.stroke()
}

function ending(d: DrawCtx, id: 'a' | 'b' | 'c'): void {
  if (id === 'a') {
    flat48(d)
    rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, 'rgba(142,31,31,0.12)', 0)
  } else if (id === 'b') {
    rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, '#0d1117', 0)
    // Street: snow, one lit window above.
    snowfall(d, 120)
    rect(d, 30, 40, 120, 140, '#11151b', 0)
    rect(d, 82, 60, 14, 16, '#e8c87a', 0)
    rect(d, 0, 250, VIGNETTE_W, 70, '#1a222c', 0)
    rect(d, 40, 292, 3, 26, PAL.metal, 0)
    d.c.fillStyle = PAL.orange
    d.c.globalAlpha = 0.14
    d.c.beginPath()
    d.c.arc(42, 286, 26, 0, Math.PI * 2)
    d.c.fill()
    d.c.globalAlpha = 1
  } else {
    roomShell(d, true)
    // The clock face showing 3:18, faintly lit.
    rect(d, 66, 70, 48, 48, PAL.paper, 0.6)
    d.c.fillStyle = '#111'
    d.c.font = '8px monospace'
    d.c.fillText('3:18', 76 + d.px * 0.6, 98 + d.py * 0.6)
    d.c.strokeStyle = '#111'
    d.c.beginPath()
    d.c.moveTo(90, 94)
    d.c.lineTo(90, 80)
    d.c.stroke()
  }
}

const DRAWERS: Record<string, (d: DrawCtx) => void> = {
  room_entry: (d) => furnishedRoom(d, true),
  room: (d) => furnishedRoom(d, true),
  room_shifted: (d) => furnishedRoom(d, true),
  room_dark: (d) => furnishedRoom(d, false),
  balcony: (d) => windowView(d, false),
  window: (d) => windowView(d, false),
  window_dark: (d) => windowView(d, true),
  kitchen: (d) => {
    roomShell(d, true)
    rect(d, 30, 150, 50, 40, PAL.metal, 0.7) // stove
    rect(d, 96, 150, 44, 34, PAL.paper, 0.7) // table
    rect(d, 104, 142, 12, 10, '#b8b0a0', 0.7) // kettle
    // Burners, oven glass, enamel handles and the kettle's bent spout.
    rect(d, 34, 153, 14, 3, '#11151b', 0.7)
    rect(d, 60, 153, 14, 3, '#11151b', 0.7)
    rect(d, 35, 166, 40, 20, '#11151b', 0.7)
    rect(d, 38, 168, 34, 2, PAL.wood, 0.7)
    rect(d, 108, 137, 5, 3, PAL.metal, 0.7)
    rect(d, 116, 144, 5, 3, PAL.paper, 0.7)
    rect(d, 103, 152, 3, 30, PAL.wood, 0.7)
    rect(d, 134, 152, 3, 30, PAL.wood, 0.7)
    rect(d, 143, 92, 27, 104, '#4a4c44', 0.6)
    rect(d, 144, 120, 25, 2, '#151b1e', 0.6)
    rect(d, 146, 128, 2, 16, PAL.metal, 0.6)
  },
  bathroom: (d) => {
    rect(d, 0, 0, VIGNETTE_W, VIGNETTE_H, '#18211f', 0.3)
    rect(d, 0, 210, VIGNETTE_W, 110, '#20262b', 0.3)
    rect(d, 40, 40, 100, 70, '#223030', 0.5) // mirror
    rect(d, 20, 150, 140, 60, '#24302e', 0.5) // tub
    rect(d, 140, 50, 22, 14, '#0e1211', 0.5) // vent
    for (let y = 116; y < 210; y += 18) rect(d, 0, y, 180, 1, '#35413a', 0.3)
    for (let x = 0; x < 180; x += 20) rect(d, x, 116, 1, 94, '#35413a', 0.3)
    rect(d, 23, 158, 134, 46, '#34413b', 0.6)
    rect(d, 29, 166, 122, 30, '#0d1718', 0.6)
    rect(d, 25, 149, 8, 14, PAL.metal, 0.6)
    rect(d, 29, 148, 14, 3, PAL.metal, 0.6)
    for (let x = 143; x < 160; x += 4) rect(d, x, 52, 1, 10, PAL.metal, 0.5)
    const reflected = { ...d, px: d.mirrorPx ?? d.px, py: d.mirrorPy ?? d.py }
    rect(reflected, 83, 54, 14, 12, '#0e1719', 0.5)
    rect(reflected, 77, 66, 26, 34, '#0e1719', 0.5)
  },
  corridor: (d) => corridor(d, false),
  corridor_stretched: (d) => corridor(d, true),
  stairwell: (d) => stairwell(d),
  landing48: (d) => {
    stairwell(d)
    rect(d, 108, 90, 56, 130, '#141210', 0.5)
    // Ajar: dark gap.
    rect(d, 112, 96, 12, 124, '#060708', 0.5)
  },
  flat48: (d) => flat48(d),
  wall: (d) => wallKnock(d, (d.t / 3) % 1),
  peephole: (d) => peepholeView(d, d.t < 1.5),
  peephole_empty: (d) => peepholeView(d, false),
  ending_a: (d) => ending(d, 'a'),
  ending_b: (d) => ending(d, 'b'),
  ending_c: (d) => ending(d, 'c'),
}

export function drawVignette(name: string, d: DrawCtx): void {
  d.c.clearRect(0, 0, VIGNETTE_W, VIGNETTE_H)
  d.c.fillStyle = PAL.bg
  d.c.fillRect(0, 0, VIGNETTE_W, VIGNETTE_H)
  const drawer = DRAWERS[name] ?? DRAWERS['room']
  if (!drawer) return
  drawer(d)
  // Sanity-driven grain and colour drain overlay (spec 5.5/6).
  const distortion = (100 - d.sanity) / 100
  if (distortion > 0.3) {
    d.c.fillStyle = 'rgba(11,11,12,0.18)'
    d.c.fillRect(0, 0, VIGNETTE_W, VIGNETTE_H)
  }
  if (distortion > 0.6 && !d.reduceFlashing) {
    d.c.globalAlpha = 0.12
    for (let i = 0; i < 24; i++) {
      const y = ((i * 37.7 + d.t * 240) % VIGNETTE_H) | 0
      d.c.fillStyle = i % 2 ? PAL.danger : PAL.green
      d.c.fillRect(0, y, VIGNETTE_W, 1)
    }
    d.c.globalAlpha = 1
  }
  // Permanent grain + scanlines (spec 6).
  d.c.fillStyle = 'rgba(255,255,255,0.03)'
  for (let i = 0; i < 30; i++) {
    const x = ((i * 61.3 + d.t * 137) % VIGNETTE_W) | 0
    const y = ((i * 47.9 + d.t * 91) % VIGNETTE_H) | 0
    d.c.fillRect(x, y, 1, 1)
  }
  d.c.fillStyle = 'rgba(0,0,0,0.06)'
  for (let y = 0; y < VIGNETTE_H; y += 3) d.c.fillRect(0, y, VIGNETTE_W, 1)
  const shade = d.c.createRadialGradient(90, 150, 55, 90, 150, 190)
  shade.addColorStop(0, 'transparent')
  shade.addColorStop(1, 'rgba(0,0,0,0.75)')
  d.c.fillStyle = shade
  d.c.fillRect(0, 0, VIGNETTE_W, VIGNETTE_H)
}
