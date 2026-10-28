import { describe, expect, it } from 'vitest'
import {
  SAMPLE_RATE,
  SOUND_IDS,
  synthAmbience,
  synthSound,
  type AmbientId,
} from '@/audio/synthesis'
import { audioScene } from '@/audio/AudioController'
import { Director } from '@/core/director/director'
import { newRun, STILL } from '@/core/director/simulate'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'
import { actionsOf } from '@/core/validate/beats'

const rms = (pcm: Float32Array) =>
  Math.sqrt(pcm.reduce((sum, value) => sum + value * value, 0) / pcm.length)

describe('procedural sound library', () => {
  for (const id of SOUND_IDS)
    it(`${id}: finite, non-silent, bounded PCM with a clean ending`, () => {
      const pcm = synthSound(id)
      expect(pcm.length).toBeGreaterThan(100)
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(pcm.every((sample) => Math.abs(sample) <= 0.65)).toBe(true)
      expect(rms(pcm)).toBeGreaterThan(0.0001)
      expect(Math.abs(pcm.at(-1)!)).toBeLessThan(0.002)
    })
  it('renders repeatable buffers and three separate knocks', () => {
    expect(synthSound('whisper')).toEqual(synthSound('whisper'))
    const triple = synthSound('knock_triple')
    for (const start of [0, 0.52, 1.09]) {
      expect(rms(triple.slice(start * SAMPLE_RATE, (start + 0.15) * SAMPLE_RATE))).toBeGreaterThan(
        0.01,
      )
    }
    expect(rms(triple.slice(0.35 * SAMPLE_RATE, 0.5 * SAMPLE_RATE))).toBeLessThan(0.001)
  })
  for (const id of [
    'drone',
    'wind',
    'fridge',
    'traffic',
    'clock',
    'neighbour',
  ] satisfies AmbientId[]) {
    it(`${id}: bounded four-second ambience loop`, () => {
      const pcm = synthAmbience(id)
      expect(pcm.length).toBe(SAMPLE_RATE * 4)
      expect(pcm.every(Number.isFinite)).toBe(true)
      expect(rms(pcm)).toBeGreaterThan(0.001)
      expect(rms(pcm)).toBeLessThan(0.1)
      expect(Math.abs(pcm[0]! - pcm.at(-1)!)).toBeLessThan(0.002)
    })
  }
})

const world = (sequence: string, ms: number) => {
  const run = newRun({ name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' })
  const director = new Director({ sequences: SEQUENCES, run, wordsOf }, sequence)
  for (let t = 0; t < ms; t += 100) director.tick(100, STILL)
  return director.world
}

describe('audio scene mapping', () => {
  it('cuts every ambient layer at the outage, and the flat hums again at dawn', () => {
    const before = world('n1', 300_000)
    expect(before.power).toBe(true)
    const cut = world('n1', 370_000)
    expect(cut.power).toBe(false)
    expect(audioScene('game', cut)).toBe('silence')
    expect(audioScene('game', world('n2', 1000))).toBe('flat')
    expect(audioScene('game', world('n1', 1000))).toBe('day')
  })
  it('keeps ticking exclusive to C and maps title, street and menus', () => {
    for (const night of ['n1', 'n2', 'n3', 'n4', 'n5'])
      for (const { action } of actionsOf(SEQUENCES[night]!))
        expect(action.type === 'scene' && action.scene).not.toBe('clock')
    const scenes = (id: string) =>
      actionsOf(SEQUENCES[id]!).flatMap(({ action }) =>
        action.type === 'scene' ? [action.scene] : [],
      )
    expect(scenes('endA')).toContain('silence')
    expect(scenes('endB')).toContain('street')
    expect(scenes('endC')).toContain('clock')
    expect(audioScene('title', null)).toBe('title')
    expect(audioScene('paused', world('n1', 100))).toBe('off')
    expect(audioScene('settings', null)).toBe('off')
  })
})
