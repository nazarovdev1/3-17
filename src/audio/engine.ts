import type { SfxId } from '@/core/state/types'
import { SAMPLE_RATE, synthAmbience, synthSound, type AmbientId } from './synthesis'

export type AudioScene = 'off' | 'title' | 'flat' | 'day' | 'silence' | 'street' | 'clock'
export type AudioStatus = 'locked' | 'running' | 'paused' | 'unavailable'
export interface Volumes {
  masterVolume: number
  musicVolume: number
  effectsVolume: number
}
export type Position = readonly [number, number, number]
interface Track {
  source: AudioBufferSourceNode
  gain: GainNode
  stop: () => void
}
const LAYERS: Record<AudioScene, readonly AmbientId[]> = {
  off: [],
  title: ['drone'],
  flat: ['drone', 'wind', 'fridge', 'traffic'],
  day: ['wind', 'traffic'],
  silence: [],
  street: ['wind', 'traffic'],
  clock: ['clock'],
}
const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0)

/** Owns one bounded Web Audio graph. No story or rendering dependencies. */
export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  private effects: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private samples = new Float32Array(256)
  private buffers = new Map<string, AudioBuffer>()
  private ambience = new Map<AmbientId, Track>()
  private voices = new Set<Track>()
  private listening: Track | null = null
  private subscribers = new Set<() => void>()
  private blocked = new Set<string>()
  private unlocked = false
  private status: AudioStatus = 'locked'
  private scene: AudioScene = 'off'
  private sanity = 100
  private spatial = false
  private volumes: Volumes = { masterVolume: 0.8, musicVolume: 0.7, effectsVolume: 0.8 }
  private recent: SfxId[] = []
  private failures: string[] = []

  constructor(
    private factory: () => AudioContext = () => new AudioContext({ latencyHint: 'interactive' }),
  ) {}
  subscribe = (callback: () => void) => {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }
  getSnapshot = () => this.status
  private publish() {
    const next: AudioStatus =
      !this.context || this.context.state === 'closed'
        ? 'unavailable'
        : this.blocked.size
          ? 'paused'
          : this.unlocked && this.context.state === 'running'
            ? 'running'
            : 'locked'
    if (next === this.status) return
    this.status = next
    for (const callback of this.subscribers) callback()
  }
  private record(error: unknown) {
    this.failures = [...this.failures.slice(-3), String(error)]
  }

  initialize() {
    if (this.context) return
    try {
      const ctx = this.factory()
      this.context = ctx
      this.master = ctx.createGain()
      this.music = ctx.createGain()
      this.effects = ctx.createGain()
      this.compressor = ctx.createDynamicsCompressor()
      this.compressor.threshold.value = -9
      this.compressor.ratio.value = 8
      this.compressor.attack.value = 0.003
      this.compressor.release.value = 0.2
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 256
      this.music.connect(this.master)
      this.effects.connect(this.master)
      this.master.connect(this.compressor)
      this.compressor.connect(this.analyser)
      this.analyser.connect(ctx.destination)
      ctx.onstatechange = () => {
        if (ctx !== this.context) return
        this.refreshAmbience()
        this.publish()
      }
      this.setVolumes(this.volumes)
      // Headless browsers and previously trusted origins may start running.
      // Keep startup silent and inexpensive until the first explicit gesture.
      void ctx.suspend().catch((error: unknown) => this.record(error))
      this.publish()
    } catch (error) {
      this.record(error)
      this.dispose()
      this.publish()
    }
  }

  /** Called synchronously from a gesture; rejected autoplay leaves a retry prompt. */
  unlock = () => {
    if (!this.context && this.status === 'unavailable') return
    if (!this.context) this.initialize()
    this.unlocked = true
    this.resumeIfAllowed()
  }
  private resumeIfAllowed() {
    const ctx = this.context
    if (!ctx || !this.unlocked || this.blocked.size || ctx.state === 'closed') return
    if (ctx.state === 'running') {
      this.refreshAmbience()
      this.publish()
      return
    }
    void ctx
      .resume()
      .then(() => {
        if (ctx !== this.context) return
        // A hide/pause may have arrived while resume was pending.
        if (this.blocked.size) this.suspend()
        else this.refreshAmbience()
        this.publish()
      })
      .catch((error: unknown) => {
        this.record(error)
        this.publish()
      })
  }
  private suspend() {
    this.stopTransients()
    const ctx = this.context
    if (ctx && ctx.state !== 'closed') {
      void ctx.suspend().catch((error: unknown) => this.record(error))
    }
  }
  setPaused(reason: string, paused: boolean) {
    const changed = paused ? !this.blocked.has(reason) : this.blocked.has(reason)
    if (!changed) return
    if (paused) this.blocked.add(reason)
    else this.blocked.delete(reason)
    if (this.blocked.size) this.suspend()
    else this.resumeIfAllowed()
    this.publish()
  }
  setSpatial(enabled: boolean) {
    this.spatial = enabled
  }
  get isSpatial() {
    return this.spatial
  }
  setListener(position: Position, forward: Position = [0, 0, -1]) {
    const listener = this.context?.listener
    if (!listener) return
    ;[listener.positionX.value, listener.positionY.value, listener.positionZ.value] = position
    ;[listener.forwardX.value, listener.forwardY.value, listener.forwardZ.value] = forward
    listener.upX.value = 0
    listener.upY.value = 1
    listener.upZ.value = 0
  }
  setVolumes(volumes: Volumes) {
    this.volumes = {
      masterVolume: clamp(volumes.masterVolume),
      musicVolume: clamp(volumes.musicVolume),
      effectsVolume: clamp(volumes.effectsVolume),
    }
    for (const [node, value] of [
      [this.master, this.volumes.masterVolume],
      [this.music, this.volumes.musicVolume],
      [this.effects, this.volumes.effectsVolume],
    ] as const) {
      if (node) this.gainTo(node.gain, value)
    }
  }
  setScene(scene: AudioScene, sanity = 100) {
    if (scene !== this.scene) this.stopTransients()
    this.scene = scene
    this.sanity = sanity
    this.refreshAmbience()
  }
  private get canPlay() {
    return !!this.context && this.context.state === 'running' && this.unlocked && !this.blocked.size
  }
  private gainTo(param: AudioParam, value: number, seconds = 0.025) {
    const time = this.context?.currentTime ?? 0
    param.cancelScheduledValues(time)
    if (value === 0) param.setValueAtTime(0, time)
    else param.setTargetAtTime(value, time, seconds)
  }
  private buffer(id: SfxId | AmbientId, loop: boolean) {
    const ctx = this.context!
    const key = `${loop ? 'loop' : 'sfx'}:${id}`
    const cached = this.buffers.get(key)
    if (cached) return cached
    const pcm = loop ? synthAmbience(id as AmbientId) : synthSound(id as SfxId)
    const result = ctx.createBuffer(1, pcm.length, SAMPLE_RATE)
    result.getChannelData(0).set(pcm)
    this.buffers.set(key, result)
    return result
  }
  private track(buffer: AudioBuffer, loop: boolean, bus: GainNode, position?: Position): Track {
    const ctx = this.context!
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    source.loop = loop
    source.connect(gain)
    const panner = position ? ctx.createPanner() : null
    if (panner && position) {
      panner.panningModel = 'equalpower'
      panner.distanceModel = 'inverse'
      ;[panner.positionX.value, panner.positionY.value, panner.positionZ.value] = position
      gain.connect(panner)
      panner.connect(bus)
    } else gain.connect(bus)
    let stopped = false
    const cleanup = () => {
      source.disconnect()
      gain.disconnect()
      panner?.disconnect()
      this.voices.delete(result)
    }
    const result: Track = {
      source,
      gain,
      stop: () => {
        if (stopped) return
        stopped = true
        source.onended = null
        source.stop()
        cleanup()
      },
    }
    source.onended = cleanup
    source.start()
    return result
  }
  private refreshAmbience() {
    if (!this.context) return
    const desired = LAYERS[this.scene]
    for (const [id, track] of this.ambience) {
      if (!desired.includes(id)) {
        track.stop()
        this.ambience.delete(id)
      }
    }
    if (!this.canPlay || !this.music || !this.effects) return
    for (const id of desired) {
      let layer = this.ambience.get(id)
      if (!layer) {
        layer = this.track(this.buffer(id, true), true, id === 'clock' ? this.effects : this.music)
        layer.gain.gain.value = 0
        this.ambience.set(id, layer)
      }
      this.gainTo(layer.gain.gain, id === 'drone' ? 0.65 + (100 - this.sanity) / 240 : 0.7)
    }
  }
  /** Never queue sounds while locked/paused: old scares must not replay on return. */
  play(id: SfxId, position?: Position): boolean {
    if (!this.canPlay || !this.effects) return false
    if (this.voices.size >= 8) this.voices.values().next().value?.stop()
    const track = this.track(
      this.buffer(id, false),
      false,
      this.effects,
      this.spatial ? position : undefined,
    )
    this.voices.add(track)
    this.recent = [...this.recent.slice(-31), id]
    return true
  }
  setListening(active: boolean) {
    if (!active) {
      this.listening?.stop()
      this.listening = null
      return
    }
    if (!this.canPlay || !this.effects || this.listening) return
    this.listening = this.track(this.buffer('whisper', false), true, this.effects)
    this.listening.gain.gain.value = 0
    this.gainTo(this.listening.gain.gain, 0.65, 0.25)
    this.play('heartbeat')
  }
  private stopTransients() {
    for (const track of this.voices) track.stop()
    this.setListening(false)
  }
  inspect() {
    let peak = 0
    if (this.canPlay && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.samples)
      for (const sample of this.samples) peak = Math.max(peak, Math.abs(sample))
    }
    return {
      status: this.status,
      contextTime: this.context?.currentTime ?? 0,
      contextState: this.context?.state ?? 'unavailable',
      scene: this.scene,
      layers: [...this.ambience.keys()],
      voices: this.voices.size,
      listening: !!this.listening,
      bufferCount: this.buffers.size,
      spatial: this.spatial,
      recent: [...this.recent],
      blocked: [...this.blocked],
      volumes: { ...this.volumes },
      peak,
      failures: [...this.failures],
    }
  }
  dispose() {
    this.stopTransients()
    for (const layer of this.ambience.values()) layer.stop()
    this.ambience.clear()
    this.buffers.clear()
    const ctx = this.context
    if (ctx) {
      ctx.onstatechange = null
      this.master?.disconnect()
      this.music?.disconnect()
      this.effects?.disconnect()
      this.analyser?.disconnect()
      this.compressor?.disconnect()
      if (ctx.state !== 'closed') void ctx.close().catch(() => undefined)
    }
    this.context = null
    this.master = null
    this.music = null
    this.effects = null
    this.analyser = null
    this.compressor = null
    this.unlocked = false
    this.blocked.clear()
    this.scene = 'off'
    this.recent = []
    this.publish()
  }
}

export const audio = new AudioEngine()
