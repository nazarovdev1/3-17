import type { SfxId } from '@/core/state/types'

/** Mono PCM at 22.05 kHz keeps synthesis and caches small on weak phones. */
export const SAMPLE_RATE = 22_050
export const SOUND_IDS = [
  'knock',
  'knock_triple',
  'knock_soft',
  'radiator',
  'fridge_stop',
  'step_wood',
  'step_tile',
  'chain',
  'kettle',
  'page',
  'clock_tick',
  'heartbeat',
  'whisper',
  'door_open',
  'door_close',
  'switch',
  'window_dark',
  'static',
  'tea',
  'pen',
] as const satisfies readonly SfxId[]

const DURATIONS: Record<SfxId, number> = {
  knock: 0.4,
  knock_triple: 1.8,
  knock_soft: 0.4,
  radiator: 1.2,
  fridge_stop: 0.12,
  step_wood: 0.3,
  step_tile: 0.25,
  chain: 0.7,
  kettle: 2.4,
  page: 0.55,
  clock_tick: 0.12,
  heartbeat: 0.7,
  whisper: 1.7,
  door_open: 1,
  door_close: 0.45,
  switch: 0.07,
  window_dark: 0.4,
  static: 0.8,
  tea: 1.2,
  pen: 0.5,
}

function random(seed: number) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0
    return (state >>> 0) / 0x80000000 - 1
  }
}
const sine = (hz: number, t: number) => Math.sin(2 * Math.PI * hz * t)
function hit(t: number, frequency: number, decay: number) {
  return t < 0 ? 0 : sine(frequency, t) * Math.min(1, t / 0.003) * Math.exp(-t * decay)
}

/** Original sound palette; filtered noise is breath texture, never speech. */
export function synthSound(id: SfxId, sampleRate = SAMPLE_RATE): Float32Array {
  const duration = DURATIONS[id]
  const pcm = new Float32Array(Math.ceil(duration * sampleRate))
  const noise = random(SOUND_IDS.indexOf(id) + 317)
  let low = 0
  let previous = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate
    const white = noise()
    low += 0.12 * (white - low)
    const high = white - previous
    previous = white
    let value = 0
    switch (id) {
      case 'knock':
      case 'knock_soft':
      case 'knock_triple': {
        for (const start of id === 'knock_triple' ? [0, 0.52, 1.09] : [0]) {
          const u = t - start
          if (u < 0) continue
          value +=
            (hit(u, 96, 24) + hit(u, 183, 38) * 0.35 + low * Math.exp(-u * 65) * 0.8) *
            (id === 'knock_soft' ? 0.19 : 0.38)
        }
        break
      }
      case 'radiator':
        for (const start of [0, 0.27]) {
          const u = t - start
          value += hit(u, 344, 9) * 0.19 + hit(u, 713, 13) * 0.1 + hit(u, 1117, 20) * 0.06
        }
        break
      case 'fridge_stop':
        value = hit(t, 83, 50) * 0.1 + high * Math.exp(-t * 120) * 0.025
        break
      case 'step_wood':
        value = hit(t, 64, 20) * 0.28 + low * Math.exp(-t * 24) * 0.3
        break
      case 'step_tile':
        value = hit(t, 182, 32) * 0.2 + high * Math.exp(-t * 45) * 0.07
        break
      case 'chain':
        for (const start of [0, 0.09, 0.2, 0.32]) {
          const u = t - start
          value += hit(u, 1267, 30) * 0.12 + hit(u, 1931, 38) * 0.065
        }
        break
      case 'kettle':
        value =
          (low * 0.34 + sine(1430 + t * 40, t) * 0.035) * Math.sin((Math.PI * t) / duration) ** 2
        break
      case 'page':
        value = high * 0.12 * Math.sin(t * 19) ** 2
        break
      case 'clock_tick':
        value = hit(t, 1420, 100) * 0.22 + hit(t, 820, 70) * 0.15
        break
      case 'heartbeat':
        value = hit(t, 63, 18) * 0.3 + hit(t - 0.2, 51, 22) * 0.22
        break
      case 'whisper':
        value =
          (white - low) * 0.14 * Math.sin((Math.PI * t) / duration) ** 2 * (0.6 + 0.4 * sine(7, t))
        break
      case 'door_open':
        value =
          sine(95, t + 0.001 * sine(11, t)) * 0.1 * Math.sin((Math.PI * t) / duration) + low * 0.1
        break
      case 'door_close':
        value = hit(t, 53, 15) * 0.38 + low * Math.exp(-t * 19) * 0.2
        break
      case 'switch':
        value = high * 0.12 * Math.exp(-t * 100)
        break
      case 'window_dark':
        value = hit(t, 120, 27) * 0.09
        break
      case 'static':
        value = (white - low) * 0.12 * (0.6 + 0.4 * sine(32, t))
        break
      case 'tea':
        value = low * 0.28 * (0.5 + 0.5 * sine(13, t) ** 2)
        break
      case 'pen':
        value = high * 0.06 * Math.sin(t * 37) ** 4
        break
    }
    // Short fades prevent discontinuities; ample headroom for simultaneous cues.
    const fade = Math.min(1, t / 0.002, (duration - t) / 0.03)
    pcm[i] = Math.max(-0.65, Math.min(0.65, value * fade))
  }
  return pcm
}

export type AmbientId = 'drone' | 'wind' | 'fridge' | 'traffic' | 'clock'
export function synthAmbience(id: AmbientId, sampleRate = SAMPLE_RATE): Float32Array {
  const pcm = new Float32Array(sampleRate * 4)
  const noise = random(4718)
  const tick = id === 'clock' ? synthSound('clock_tick', sampleRate) : null
  let low = 0
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sampleRate
    low += 0.015 * (noise() - low)
    const seam = Math.min(1, t / 0.08, (4 - t) / 0.08)
    switch (id) {
      case 'drone':
        pcm[i] = (sine(37, t) * 0.055 + sine(49, t) * 0.025) * seam
        break
      case 'wind':
        pcm[i] = low * 0.5 * (0.6 + 0.4 * sine(0.25, t)) * seam
        break
      case 'fridge':
        pcm[i] = (sine(50, t) * 0.035 + sine(100, t) * 0.015) * seam
        break
      case 'traffic':
        pcm[i] = low * 0.3 * Math.sin((Math.PI * t) / 4) ** 2
        break
      case 'clock':
        pcm[i] = tick?.[i % sampleRate] ?? 0
        break
    }
  }
  return pcm
}
