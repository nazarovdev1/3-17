import { describe, expect, it, vi } from 'vitest'
import { AudioEngine } from '@/audio/engine'
import type { loadRecordings } from '@/audio/recordings'

function context() {
  const param = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  })
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: param() })
  const panners: { panningModel: string }[] = []
  const listenerWrites = vi.fn()
  const listenerParam = () => {
    let value = 0
    return {
      ...param(),
      get value() {
        return value
      },
      set value(next: number) {
        value = next
        listenerWrites(next)
      },
    }
  }
  const sources: { stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }[] = []
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    listener: Object.fromEntries(
      [
        'positionX',
        'positionY',
        'positionZ',
        'forwardX',
        'forwardY',
        'forwardZ',
        'upX',
        'upY',
        'upZ',
      ].map((key) => [key, listenerParam()]),
    ),
    onstatechange: null,
    createGain: node,
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      ratio: param(),
      attack: param(),
      release: param(),
    }),
    createAnalyser: () => ({
      ...node(),
      fftSize: 256,
      getFloatTimeDomainData: (data: Float32Array) => data.fill(0),
    }),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const source = {
        ...node(),
        start: vi.fn(),
        stop: vi.fn(),
        playbackRate: param(),
        buffer: null,
        loop: false,
        onended: null,
      }
      sources.push(source)
      return source
    },
    createPanner: () => {
      const panner = {
        ...node(),
        panningModel: 'equalpower',
        distanceModel: '',
        positionX: param(),
        positionY: param(),
        positionZ: param(),
      }
      panners.push(panner)
      return panner
    },
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  }
  return { ctx: ctx as unknown as AudioContext, panners, sources, listenerWrites }
}
const noFiles: typeof loadRecordings = (_ctx, _accept, failed) => {
  failed('assets/sounds/missing.m4a')
  return Promise.resolve()
}

describe('recorded playback with procedural fallback', () => {
  it('keeps recorded breathing as one layer across rapid voice beats', () => {
    const { ctx, sources } = context()
    const engine = new AudioEngine(() => ctx, noFiles)
    engine.initialize()
    engine.unlock()
    for (let i = 0; i < 20; i++) engine.play('whisper')
    expect(engine.inspect().voices).toBe(1)
    expect(sources.slice(0, -1).every((s) => s.stop.mock.calls.length === 1)).toBe(true)
    engine.dispose()
    expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true)
  })
  it('writes listener parameters only when the head moves or turns', () => {
    const { ctx, listenerWrites } = context()
    const engine = new AudioEngine(() => ctx, noFiles)
    engine.initialize()
    engine.setListener([0, 1.6, 0])
    expect(listenerWrites).toHaveBeenCalledTimes(9)
    for (let i = 0; i < 120; i++) engine.setListener([0, 1.6, 0])
    expect(listenerWrites).toHaveBeenCalledTimes(9)
    engine.setListener([1, 1.6, 0], [1, 0, 0])
    expect(listenerWrites).toHaveBeenCalledTimes(15)
    expect(ctx.listener.positionX.value).toBe(1)
    expect(ctx.listener.forwardX.value).toBe(1)
    engine.dispose()
  })
  it('preserves four seconds of actual silence after the fridge stop and cancels scheduled scares on pause', async () => {
    const { ctx, sources } = context()
    const engine = new AudioEngine(() => ctx, noFiles)
    engine.initialize()
    engine.unlock()
    await Promise.resolve()
    engine.setScene('silence')
    engine.play('fridge_stop')
    engine.play('knock_triple')
    engine.play('whisper')
    expect(sources[1]!.start.mock.calls[0]![0]).toBeCloseTo(4.45)
    expect(sources[2]!.start.mock.calls[0]![0]).toBeCloseTo(4.45)
    expect(engine.play('phone_buzz')).toBe(false)
    engine.setPaused('menu', true)
    expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true)
    expect(engine.inspect().silenceRemaining).toBe(0)
    engine.dispose()
  })
  it('plays the synth immediately if a file is absent; never queues paused scares', async () => {
    const { ctx } = context()
    const engine = new AudioEngine(() => ctx, noFiles)
    engine.initialize()
    engine.unlock()
    await Promise.resolve()
    expect(engine.play('knock')).toBe(true)
    expect(engine.inspect().lastPlayback?.kind).toBe('synth')
    expect(engine.inspect().missingRecordings).toEqual(['assets/sounds/missing.m4a'])
    engine.setPaused('menu', true)
    expect(engine.play('knock')).toBe(false)
    expect(engine.inspect().voices).toBe(0)
    engine.dispose()
  })
  it('selects decoded variations without adjacent repeats, jitters steps and uses HRTF', async () => {
    const { ctx, panners } = context()
    const load: typeof loadRecordings = (_ctx, accept) => {
      for (let i = 0; i < 3; i++)
        accept({ cue: 'step_wood', loop: false, variation: `step-${i}`, buffer: {} as AudioBuffer })
      return Promise.resolve()
    }
    const engine = new AudioEngine(() => ctx, load)
    engine.initialize()
    engine.unlock()
    engine.setSpatial(true)
    await Promise.resolve()
    let previous: string | null | undefined
    for (let i = 0; i < 20; i++) {
      engine.play('step_wood', [-2, 1.5, -0.45])
      const played = engine.inspect().lastPlayback!
      expect(played.kind).toBe('recording')
      expect(played.variation).not.toBe(previous)
      expect(played.rate).toBeGreaterThanOrEqual(0.96)
      expect(played.rate).toBeLessThanOrEqual(1.04)
      expect(played.volume).toBeGreaterThanOrEqual(0.84)
      expect(played.volume).toBeLessThanOrEqual(1)
      expect(played.position).toEqual([-2, 1.5, -0.45])
      previous = played.variation
    }
    expect(panners.every((p) => p.panningModel === 'HRTF')).toBe(true)
    expect(engine.inspect().voices).toBe(8)
    engine.dispose()
  })
  it('stops every loop synchronously at 3:17 and does not revive it after late decoding', async () => {
    const { ctx, sources } = context()
    let finish!: () => void
    const load: typeof loadRecordings = () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
    const engine = new AudioEngine(() => ctx, load)
    engine.initialize()
    engine.unlock()
    engine.setScene('flat')
    const loops = [...sources]
    expect(engine.inspect().layers).toContain('fridge')
    engine.setScene('silence')
    expect(loops.every((s) => s.stop.mock.calls.length === 1)).toBe(true)
    expect(engine.inspect().layers).toEqual([])
    finish()
    await Promise.resolve()
    expect(engine.inspect().layers).toEqual([])
    expect(engine.inspect().voices).toBe(0)
    engine.dispose()
  })
})
