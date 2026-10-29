import type { GameState } from '../state/types'
import { parseClock } from './clock'
import { evaluateCondition } from './conditions'
import { createRng } from './rng'
import type {
  Action,
  Beat,
  DirectorEvent,
  ObjectId,
  PhoneWorld,
  PlayerInput,
  Sensors,
  Sequence,
  Subtitle,
  TextKey,
  TimedAction,
  WorldState,
} from './types'

export interface DirectorOptions {
  sequences: Record<string, Sequence>
  run: GameState
  /** Words in a text key: subtitles stay for 0.6 s + 0.35 s per word (REDESIGN §4). */
  wordsOf: (key: TextKey) => number
  seed?: number
  /** Keep a log of every applied action (headless metrics). */
  record?: boolean
}

export interface LogEntry {
  t: number
  clock: number
  source: string
  action: Action
}

const AMBIENT_COOLDOWN_MS = 180_000
const AMBIENT_QUIET_AFTER_SPEECH_MS = 10_000
const SPEECH_GAP_MS = 300

export function subtitleMs(words: number): number {
  return 600 + 350 * words
}

export function defaultPhone(): PhoneWorld {
  return {
    place: 'table',
    screen: 'off',
    faceDown: false,
    missed: 0,
    date: '',
    time: '',
    work: null,
    message: null,
    messageSeconds: 0,
    heard: false,
    draft: 'none',
    canAnswer: false,
  }
}

function freshWorld(sequence: Sequence): WorldState {
  return {
    sequence: sequence.id,
    night: sequence.night,
    clock: parseClock(sequence.start),
    frozen: false,
    timeScale: 1,
    power: true,
    daylight: false,
    daylightMs: 0,
    windows: 'lit',
    scene: 'flat',
    doors: {},
    objects: {},
    lights: {},
    figure: null,
    phone: defaultPhone(),
    subtitle: null,
    readable: null,
    form: false,
    listening: false,
    control: 'none',
    waiting: null,
    ending: null,
    finished: false,
  }
}

/**
 * Runs the clock, watches the player through `Sensors` and `PlayerInput`, fires beats and
 * untold ambient events, and owns each night's life (start → 3:17 → dawn → next night).
 * Pure and deterministic for a given seed and input stream, so it runs headless in tests.
 */
export class Director {
  readonly run: GameState
  world: WorldState
  log: LogEntry[] = []
  private readonly options: DirectorOptions
  private readonly random: () => number
  private sequence: Sequence
  private now = 0
  private started = false
  private fired = new Map<string, number>()
  private marks = new Map<string, number>()
  private everySince = new Map<string, number>()
  private queue: { due: number; action: TimedAction; source: string }[] = []
  private pending: { beat: Beat; opensAt: number; closesAt: number } | null = null
  private zoneTime = new Map<string, number>()
  private gazeTime = new Map<string, number>()
  private unseenTime = new Map<string, number>()
  private hold: { target: ObjectId; ms: number } | null = null
  private lastActivity = 0
  private ambientLast = new Map<string, number>()
  private nextAmbientAt = 0
  private speech: Subtitle[] = []
  private speechEnd = -Infinity
  private advanceAt: number | null = null
  private events: DirectorEvent[] = []

  constructor(options: DirectorOptions, startSequence: string) {
    this.options = options
    this.run = options.run
    this.random = createRng(options.seed ?? 317)
    this.sequence = this.lookup(startSequence)
    this.world = freshWorld(this.sequence)
    this.resetSequenceState()
  }

  /** Real milliseconds since the current night or ending began. */
  get elapsed(): number {
    return this.now
  }

  get sequenceId(): string {
    return this.sequence.id
  }

  /** Where the player stands when the current night (or ending) begins. */
  get spawn(): Sequence['spawn'] {
    return this.sequence.spawn
  }

  /** Beat ids fired in this sequence, in order (debug view, tests). */
  firedBeats(): string[] {
    return [...this.fired.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
  }

  /** Objects this sequence watches by gaze or by being out of view (presenters measure these). */
  trackedObjects(): ObjectId[] {
    const ids = new Set<ObjectId>(this.watched())
    for (const beat of this.sequence.beats)
      if (beat.trigger.type === 'gaze') ids.add(beat.trigger.target)
    return [...ids]
  }

  /** Objects the player can use right now (the presenter shows only a key glyph). */
  interactables(): Set<ObjectId> {
    const out = new Set<ObjectId>()
    for (const beat of this.sequence.beats) {
      const t = beat.trigger
      if (
        (t.type === 'interact' || t.type === 'hold' || t.type === 'knock3') &&
        this.eligible(beat)
      )
        out.add(t.target)
    }
    if (this.windowOpen()) {
      const w = this.pending!.beat.waitFor!
      if (w.answer) out.add(w.answer.target)
      if (w.knock) out.add(w.knock.target)
    }
    return out
  }

  tick(dtMs: number, sensors: Sensors): DirectorEvent[] {
    if (this.world.finished) return this.events.splice(0)
    this.now += dtMs
    if (!this.world.frozen)
      this.world.clock +=
        (dtMs / 1000 / this.sequence.realSecondsPerGameMinute) * this.world.timeScale
    if (sensors.moving) {
      this.lastActivity = this.now
      this.wake()
    }
    this.track(dtMs, sensors)
    if (!this.started) {
      this.started = true
      this.nextAmbientAt = this.now + this.between(this.sequence.ambientEveryMs)
      for (const beat of this.sequence.beats)
        if (beat.trigger.type === 'start' && this.eligible(beat)) this.fire(beat)
    }
    this.runQueue()
    this.runWindow()
    for (const beat of this.sequence.beats)
      if (this.eligible(beat) && this.triggered(beat, sensors)) this.fire(beat)
    this.runAmbient()
    this.runSpeech()
    if (this.advanceAt !== null && this.now >= this.advanceAt) this.advanceNight()
    return this.events.splice(0)
  }

  /** Lying on the sofa speeds the night; any movement or action gets the player up. */
  private wake(): void {
    if (this.world.timeScale === 1) return
    this.world.timeScale = 1
    this.events.push({ type: 'camera', effect: 'sitUp' })
  }

  input(input: PlayerInput): boolean {
    this.lastActivity = this.now
    const lying = this.world.timeScale !== 1
    this.wake()
    // The first action after lying down only gets the player up.
    if (lying && input.type === 'interact' && input.target === 'sofa') return true
    switch (input.type) {
      case 'interact': {
        const w = this.pending?.beat.waitFor
        if (this.windowOpen() && w?.answer?.target === input.target) {
          this.resolve('answer')
          return true
        }
        return this.fireFirst(
          (b) => b.trigger.type === 'interact' && b.trigger.target === input.target,
        )
      }
      case 'knock3': {
        const w = this.pending?.beat.waitFor
        if (this.windowOpen() && w?.knock?.target === input.target) {
          this.resolve('knock')
          return true
        }
        return this.fireFirst(
          (b) => b.trigger.type === 'knock3' && b.trigger.target === input.target,
        )
      }
      case 'holdStart':
        this.hold = { target: input.target, ms: 0 }
        this.world.listening = true
        return true
      case 'holdEnd':
        this.hold = null
        this.world.listening = false
        return true
      case 'closeReadable':
        this.world.readable = null
        this.mark('readable:closed')
        return true
      case 'form':
        this.run.profile = input.profile
        this.world.form = false
        this.mark('form:signed')
        return true
    }
  }

  // ── Triggers ─────────────────────────────────────────────────────────────

  private eligible(beat: Beat): boolean {
    const last = this.fired.get(beat.id)
    if (last !== undefined) {
      if (beat.once !== false) return false
      if (beat.cooldownMs && this.now - last < beat.cooldownMs) return false
    }
    return !beat.when || evaluateCondition(beat.when, this.run)
  }

  private triggered(beat: Beat, sensors: Sensors): boolean {
    if (beat.notIn?.some((zone) => sensors.zones.includes(zone))) return false
    if (beat.onlyIn && !beat.onlyIn.some((zone) => sensors.zones.includes(zone))) return false
    const t = beat.trigger
    switch (t.type) {
      case 'start':
      case 'interact':
      case 'knock3':
        return false
      case 'clock':
        return this.world.clock >= parseClock(t.at)
      case 'zone':
        return (
          sensors.zones.includes(t.zone) && (this.zoneTime.get(t.zone) ?? 0) >= (t.dwellMs ?? 0)
        )
      case 'gaze':
        return (
          (this.gazeTime.get(t.target) ?? 0) >= (t.minMs ?? 0) && sensors.looking.includes(t.target)
        )
      case 'notLooking':
        return (this.unseenTime.get(t.target) ?? 0) >= t.minMs
      case 'idle':
        return this.now - this.lastActivity >= t.ms
      case 'after': {
        const at = this.marks.get(t.beat)
        return at !== undefined && this.now - at >= (t.delayMs ?? 0)
      }
      case 'sanityBelow':
        return this.run.sanity < t.value
      case 'hold':
        return this.hold?.target === t.target && this.hold.ms >= (t.minMs ?? 0)
      case 'every': {
        const since = this.everySince.get(beat.id) ?? this.now
        this.everySince.set(beat.id, since)
        const last = this.fired.get(beat.id) ?? since
        return this.now - last >= t.ms
      }
    }
  }

  private track(dtMs: number, sensors: Sensors): void {
    for (const zone of [...this.zoneTime.keys()])
      if (!sensors.zones.includes(zone)) this.zoneTime.delete(zone)
    for (const zone of sensors.zones) this.zoneTime.set(zone, (this.zoneTime.get(zone) ?? 0) + dtMs)
    for (const id of [...this.gazeTime.keys()])
      if (!sensors.looking.includes(id)) this.gazeTime.delete(id)
    for (const id of sensors.looking) this.gazeTime.set(id, (this.gazeTime.get(id) ?? 0) + dtMs)
    for (const id of this.watched()) {
      if (sensors.visible.includes(id)) this.unseenTime.set(id, 0)
      else this.unseenTime.set(id, (this.unseenTime.get(id) ?? 0) + dtMs)
    }
    if (this.hold) this.hold.ms += dtMs
  }

  private watchedCache: ObjectId[] | null = null
  private watched(): ObjectId[] {
    if (!this.watchedCache) {
      const ids = new Set<ObjectId>()
      for (const beat of this.sequence.beats)
        if (beat.trigger.type === 'notLooking') ids.add(beat.trigger.target)
      for (const event of this.sequence.ambient) if (event.unobserved) ids.add(event.unobserved)
      this.watchedCache = [...ids]
    }
    return this.watchedCache
  }

  // ── Firing ───────────────────────────────────────────────────────────────

  private fireFirst(match: (beat: Beat) => boolean): boolean {
    const beat = this.sequence.beats.find((b) => match(b) && this.eligible(b))
    if (!beat) return false
    this.fire(beat)
    return true
  }

  private fire(beat: Beat): void {
    this.fired.set(beat.id, this.now)
    this.mark(beat.id)
    this.schedule(beat.actions, beat.id)
    if (beat.waitFor) {
      const opensAt = this.now + beat.waitFor.openAfterMs
      this.pending = { beat, opensAt, closesAt: opensAt + beat.waitFor.windowMs }
    }
  }

  private schedule(actions: TimedAction[], source: string): void {
    const sequence = this.sequence
    for (const action of actions) {
      // An ending or a new night replaces the sequence: the rest belongs to the old one.
      if (this.sequence !== sequence) return
      if (action.delayMs) this.queue.push({ due: this.now + action.delayMs, action, source })
      else this.apply(action, source)
    }
  }

  private runQueue(): void {
    if (!this.queue.length) return
    const due = this.queue.filter((q) => q.due <= this.now).sort((a, b) => a.due - b.due)
    if (!due.length) return
    this.queue = this.queue.filter((q) => q.due > this.now)
    const sequence = this.sequence
    for (const item of due) {
      if (this.sequence !== sequence) return
      this.apply(item.action, item.source)
    }
  }

  private windowOpen(): boolean {
    return !!this.pending && this.now >= this.pending.opensAt
  }

  private runWindow(): void {
    if (!this.pending) return
    const w = this.pending.beat.waitFor!
    this.world.waiting = this.windowOpen() ? (w.answer?.target ?? w.knock?.target ?? null) : null
    if (this.now >= this.pending.closesAt) this.resolve('silence')
  }

  private resolve(kind: 'answer' | 'knock' | 'silence'): void {
    const { beat } = this.pending!
    const w = beat.waitFor!
    const option = kind === 'answer' ? w.answer! : kind === 'knock' ? w.knock! : w.silence
    this.pending = null
    this.world.waiting = null
    this.run.flags[w.flag] = option.value
    this.schedule(option.actions, `${beat.id}:${kind}`)
    this.mark(`${beat.id}:resolved`)
  }

  private mark(id: string): void {
    this.marks.set(id, this.now)
  }

  private apply(action: TimedAction, source: string): void {
    if (this.options.record) this.log.push({ t: this.now, clock: this.world.clock, source, action })
    const w = this.world
    switch (action.type) {
      case 'sound':
      case 'haptic':
      case 'camera':
      case 'fx':
      case 'fade':
      case 'place':
        this.events.push(action)
        return
      case 'scene':
        w.scene = action.scene
        this.events.push(action)
        return
      case 'say': {
        const words = this.options.wordsOf(action.line)
        const start = Math.max(this.now, this.speechEnd + SPEECH_GAP_MS)
        this.speechEnd = start + subtitleMs(words)
        this.speech.push({ speaker: action.speaker, line: action.line, until: this.speechEnd })
        this.events.push(action)
        return
      }
      case 'readable':
        w.readable = action.id
        this.events.push(action)
        return
      case 'form':
        w.form = true
        this.events.push(action)
        return
      case 'credits':
        w.finished = true
        this.run.finished = true
        this.events.push(action)
        return
      case 'power':
        w.power = action.on
        return
      case 'light':
        w.lights = { ...w.lights, [action.id]: action.state }
        return
      case 'windows':
        w.windows = action.state
        return
      case 'door':
        w.doors = { ...w.doors, [action.id]: action.state }
        return
      case 'object':
        w.objects = { ...w.objects, [action.id]: action.change }
        return
      case 'figure':
        w.figure = action.placement
        if (action.placement && action.ms)
          this.queue.push({
            due: this.now + action.ms,
            action: { type: 'figure', placement: null },
            source,
          })
        return
      case 'phone':
        w.phone = { ...w.phone, ...action.set }
        return
      case 'flag':
        this.run.flags[action.key] = action.value
        return
      case 'sanity':
        this.run.sanity = Math.max(0, Math.min(100, this.run.sanity + action.delta))
        return
      case 'item':
        if (!this.run.inventory.includes(action.id)) this.run.inventory.push(action.id)
        return
      case 'timeScale':
        // The night taking time back to normal (3:16) also gets a lying player up.
        if (action.factor === 1 && w.timeScale !== 1)
          this.events.push({ type: 'camera', effect: 'sitUp' })
        w.timeScale = action.factor
        return
      case 'daylight':
        w.daylight = action.on
        w.daylightMs = action.ms ?? 0
        return
      case 'setClock':
        w.clock = parseClock(action.at)
        return
      case 'clockFreeze':
        w.frozen = action.on
        return
      case 'control':
        w.control = action.limit
        return
      case 'endNight':
        this.advanceAt = this.now + action.afterMs
        return
      case 'if':
        this.schedule(
          evaluateCondition(action.when, this.run) ? action.then : (action.else ?? []),
          source,
        )
        return
      case 'hush':
        this.speech = []
        this.speechEnd = this.now
        w.subtitle = null
        this.queue = this.queue.filter((q) => q.action.type !== 'say')
        return
      case 'ending':
        this.loadSequence(`end${action.id}`)
        this.world.ending = action.id
        this.events.push({ type: 'endingStart', id: action.id })
        return
    }
  }

  private runSpeech(): void {
    while (this.speech.length && this.speech[0]!.until <= this.now) this.speech.shift()
    const current = this.speech[0] ?? null
    // A queued line shows once the previous one has gone.
    if (current && current.until - subtitleMs(this.options.wordsOf(current.line)) > this.now) {
      this.world.subtitle = null
      return
    }
    this.world.subtitle = current
  }

  private runAmbient(): void {
    if (this.now < this.nextAmbientAt || !this.sequence.ambient.length) return
    const speaking = this.world.subtitle !== null || this.speech.length > 0
    const quiet = this.now - this.speechEnd >= AMBIENT_QUIET_AFTER_SPEECH_MS
    const candidates =
      speaking || !quiet
        ? []
        : this.sequence.ambient.filter((event) => {
            if ((event.requirePower ?? true) && !this.world.power) return false
            if (event.when && !evaluateCondition(event.when, this.run)) return false
            const last = this.ambientLast.get(event.id)
            if (last !== undefined && this.now - last < AMBIENT_COOLDOWN_MS) return false
            if (event.unobserved && (this.unseenTime.get(event.unobserved) ?? 0) < 1000)
              return false
            return true
          })
    if (!candidates.length) {
      this.nextAmbientAt = this.now + 2000
      return
    }
    const event = candidates[Math.floor(this.random() * candidates.length)]!
    this.ambientLast.set(event.id, this.now)
    this.schedule(event.actions, `ambient:${event.id}`)
    this.nextAmbientAt = this.now + this.between(this.sequence.ambientEveryMs)
  }

  private between([min, max]: [number, number]): number {
    return min + this.random() * (max - min)
  }

  // ── Night lifecycle ──────────────────────────────────────────────────────

  private lookup(id: string): Sequence {
    const sequence = this.options.sequences[id]
    if (!sequence) throw new Error(`director: no sequence "${id}"`)
    return sequence
  }

  private advanceNight(): void {
    this.advanceAt = null
    const next = this.sequence.night + 1
    if (next > 5) return
    this.loadSequence(`n${next}`)
    this.events.push({ type: 'checkpoint' })
  }

  private loadSequence(id: string): void {
    this.sequence = this.lookup(id)
    const keep = { phone: this.world.phone }
    this.world = freshWorld(this.sequence)
    if (id.startsWith('end')) this.world.phone = keep.phone
    this.run.night = this.sequence.night
    this.resetSequenceState()
    if (id.startsWith('n')) this.events.push({ type: 'nightStart', night: this.sequence.night })
  }

  private resetSequenceState(): void {
    this.now = 0
    this.started = false
    this.fired.clear()
    this.marks.clear()
    this.everySince.clear()
    this.queue = []
    this.pending = null
    this.zoneTime.clear()
    this.gazeTime.clear()
    this.unseenTime.clear()
    this.hold = null
    this.lastActivity = 0
    this.ambientLast.clear()
    this.speech = []
    this.speechEnd = -Infinity
    this.advanceAt = null
    this.watchedCache = null
  }
}
