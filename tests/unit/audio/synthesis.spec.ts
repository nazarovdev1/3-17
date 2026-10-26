import { describe, expect, it } from 'vitest'
import {
  SAMPLE_RATE,
  SOUND_IDS,
  synthAmbience,
  synthSound,
  type AmbientId,
} from '@/audio/synthesis'
import { audioScene } from '@/audio/presentation'
import { story } from '@/content/story'
import { createInitialState, goTo } from '@/core/engine'
import type { Step } from '@/core/engine/types'

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
  for (const id of ['drone', 'wind', 'fridge', 'traffic', 'clock'] satisfies AmbientId[]) {
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

const initial = () =>
  createInitialState(
    { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
    '2026-10-25T00:00:00Z',
  )
const at = (id: string): Step => goTo(story, initial(), id)

describe('audio scene mapping', () => {
  it('cuts every ambient layer at the outage and preserves silence on resume', () => {
    const cut = at('n1_317')
    expect(audioScene('game', cut)).toBe('silence')
    expect(audioScene('game', goTo(story, cut.state, 'n1_knocks'))).toBe('silence')
    expect(audioScene('game', goTo(story, cut.state, 'n2_day_start'))).toBe('day')
    expect(audioScene('game', goTo(story, cut.state, 'n2_night_hub'))).toBe('flat')
    expect(cut.state.flags['time']).toBe('3:17')
  })
  it('keeps ticking exclusive to C and maps title, street and menus', () => {
    expect(audioScene('game', at('n1_clock'))).toBe('flat')
    expect(audioScene('game', at('n5_clock'))).toBe('flat')
    expect(audioScene('ending', at('endA'))).toBe('silence')
    expect(audioScene('ending', at('endB'))).toBe('street')
    expect(audioScene('ending', at('endC'))).toBe('clock')
    expect(audioScene('title', null)).toBe('title')
    expect(audioScene('paused', at('n1_clock'))).toBe('off')
    expect(audioScene('settings', null)).toBe('off')
  })
})
