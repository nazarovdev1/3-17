import {
  CanvasTexture,
  MeshLambertMaterial,
  NearestFilter,
  SRGBColorSpace,
  BoxGeometry,
} from 'three'
export type Surface =
  | 'wall'
  | 'wood'
  | 'tile'
  | 'carpet'
  | 'concrete'
  | 'paper'
  | 'metal'
  | 'calendar'
  | 'door47'
  | 'door48'
export const SURFACES: Surface[] = [
  'wall',
  'wood',
  'tile',
  'carpet',
  'concrete',
  'paper',
  'metal',
  'calendar',
  'door47',
  'door48',
]
const BASE: Record<Surface, string> = {
  wall: '#777466',
  wood: '#614936',
  tile: '#7e9186',
  carpet: '#744b3c',
  concrete: '#68706e',
  paper: '#cfc6b0',
  metal: '#717673',
  calendar: '#cfc6b0',
  door47: '#393d37',
  door48: '#393d37',
}
export function createResources() {
  const grainCanvas = document.createElement('canvas')
  grainCanvas.width = grainCanvas.height = 64
  const grainContext = grainCanvas.getContext('2d')!
  const grainPixels = grainContext.createImageData(64, 64)
  for (let i = 0; i < grainPixels.data.length; i += 4) {
    const shade = (i * 73 + (i % 113) * 37) % 256
    grainPixels.data[i] = grainPixels.data[i + 1] = grainPixels.data[i + 2] = shade
    grainPixels.data[i + 3] = 18
  }
  grainContext.putImageData(grainPixels, 0, 0)
  const textures = SURFACES.map((kind) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const c = canvas.getContext('2d')!
    c.fillStyle = BASE[kind]
    c.fillRect(0, 0, 128, 128)
    let seed = 317
    for (let i = 0; i < 1600; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      const x = (seed >>> 0) % 128
      const y = ((seed >>> 8) >>> 0) % 128
      c.fillStyle = i % 2 ? '#00000012' : '#ffffff0a'
      c.fillRect(x, y, kind === 'wood' ? 1 : 2, kind === 'wood' ? 12 : 2)
    }
    c.strokeStyle = '#222c2944'
    c.lineWidth = 1
    if (kind === 'wall' || kind === 'carpet')
      for (let y = 0; y < 128; y += 16)
        for (let x = 0; x < 128; x += 16) {
          c.beginPath()
          c.moveTo(x + 8, y + 2)
          c.lineTo(x + 13, y + 8)
          c.lineTo(x + 8, y + 14)
          c.lineTo(x + 3, y + 8)
          c.closePath()
          c.stroke()
        }
    if (kind === 'tile')
      for (let i = 0; i < 128; i += 16) {
        c.fillStyle = '#15231f66'
        c.fillRect(i, 0, 1, 128)
        c.fillRect(0, i, 128, 1)
      }
    if (kind === 'carpet') {
      c.strokeStyle = '#c2a57c'
      c.strokeRect(4, 4, 120, 120)
      c.strokeRect(8, 8, 112, 112)
    }
    if (kind === 'paper') {
      c.fillStyle = '#4b443a'
      for (let i = 0; i < 8; i++) c.fillRect(12, 16 + i * 12, 85 - (i % 3) * 10, 2)
    }
    if (kind === 'calendar') {
      c.fillStyle = '#cfc6b0'
      c.fillRect(0, 0, 128, 128)
      c.font = '12px monospace'
      c.fillStyle = '#3d342b'
      c.fillText('2006', 44, 16)
      for (let date = 1; date <= 30; date++) {
        const x = 6 + ((date - 1) % 6) * 20
        const y = 36 + Math.floor((date - 1) / 6) * 19
        c.fillText(String(date), x, y)
        if (date < 29) {
          c.strokeStyle = '#693e30'
          c.beginPath()
          c.moveTo(x, y - 11)
          c.lineTo(x + 15, y + 2)
          c.moveTo(x + 15, y - 11)
          c.lineTo(x, y + 2)
          c.stroke()
        }
      }
    }
    if (kind === 'door47' || kind === 'door48') {
      c.fillStyle = '#333a35'
      c.fillRect(0, 0, 128, 128)
      c.fillStyle = '#cfc6b0'
      c.font = 'bold 52px monospace'
      c.textAlign = 'center'
      c.fillText(kind === 'door47' ? '47' : '48', 64, 83)
    }
    const texture = new CanvasTexture(canvas)
    texture.magFilter = NearestFilter
    texture.minFilter = NearestFilter
    texture.generateMipmaps = false
    texture.colorSpace = SRGBColorSpace
    return [kind, texture] as const
  })
  const materials = Object.fromEntries(
    textures.map(([kind, map]) => [kind, new MeshLambertMaterial({ map })]),
  ) as Record<Surface, MeshLambertMaterial>
  const geometry = new BoxGeometry(1, 1, 1)
  return {
    grain: grainCanvas.toDataURL(),
    materials,
    geometry,
    dispose: () => {
      geometry.dispose()
      for (const material of Object.values(materials)) material.dispose()
      for (const [, texture] of textures) texture.dispose()
    },
  }
}
export type Resources = ReturnType<typeof createResources>
