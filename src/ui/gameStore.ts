import { create } from 'zustand'
import { Director } from '@/core/director/director'
import { newRun } from '@/core/director/simulate'
import { formatClock, parseClock } from '@/core/director/clock'
import type { DirectorEvent, PlayerInput, Sensors, WorldState } from '@/core/director/types'
import { SaveService } from '@/core/save/saveService'
import type { CloudStorageAdapter, StorageAdapter } from '@/core/save/types'
import type { EndingId, GameState, MetaState } from '@/core/state/types'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'

export type Screen = 'boot' | 'warning' | 'title' | 'game' | 'paused' | 'settings' | 'gallery'

export type DirectorListener = (events: DirectorEvent[], world: WorldState) => void
const listeners = new Set<DirectorListener>()

/** Presenters and audio subscribe to what the Director plays (sounds, speech, effects). */
export function onDirectorEvents(listener: DirectorListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Delivers events outside a Director tick (the real-clock 3:17 knock; tests). */
export function emitDirectorEvents(events: DirectorEvent[]): void {
  const world = director?.world
  if (!world) return
  for (const listener of listeners) listener(events, world)
}

/** What the active presenter senses; it writes here every frame and the driver reads it. */
export const sensors: Sensors = { zones: [], looking: [], visible: [], moving: false }

let saveService: SaveService | null = null
export function configureSaveService(
  local: StorageAdapter,
  cloud: CloudStorageAdapter | null,
): void {
  saveService = new SaveService(local, cloud)
}
export function getSaveService(): SaveService {
  if (!saveService) saveService = new SaveService()
  return saveService
}

let director: Director | null = null
/** The running Director (presenters read interactables and spawn from it). */
export function getDirector(): Director | null {
  return director
}

export function isLateNight(now: Date): boolean {
  const h = now.getHours()
  return h >= 0 && h < 5
}

interface GameStore {
  screen: Screen
  run: GameState | null
  meta: MetaState
  /** A copy of the Director's world, replaced whenever something visible changes. */
  world: WorldState | null
  /** Interactable object ids right now (joined, for cheap comparisons). */
  interactables: string
  /** Debug: speeds the whole game clock and every timer. */
  speed: number

  setScreen: (screen: Screen) => void
  init: () => Promise<void>
  acceptWarning: () => void
  startRun: () => void
  continueRun: () => void
  /** Night select from the gallery: a fresh run beginning at that night. */
  playNight: (night: number) => void
  step: (dtMs: number) => void
  input: (input: PlayerInput) => boolean
  quitToTitle: () => void
  saveNow: () => void
  realClock317: () => void
  debug: {
    setClock: (clock: string) => void
    startNight: (night: number) => void
    /** Any sequence by id (an ending: endA, endB, endC). */
    playSequence: (id: string) => void
    setFlag: (key: string, value: boolean | number | string) => void
    setSanity: (value: number) => void
    setSpeed: (speed: number) => void
  }
}

function worldKey(world: WorldState): string {
  return JSON.stringify({ ...world, clock: Math.floor(world.clock) })
}

export const useGame = create<GameStore>((set, get) => {
  let lastKey = ''
  let lastSave = 0

  const begin = (run: GameState, sequence: string) => {
    director = new Director(
      { sequences: SEQUENCES, run, wordsOf, seed: Date.now() % 100_000 },
      sequence,
    )
    lastKey = ''
    set({ run, world: { ...director.world }, interactables: '', screen: 'game' })
    get().saveNow()
  }

  const finish = (ending: EndingId | null) => {
    const meta = get().meta
    const endingsSeen =
      ending && !meta.endingsSeen.includes(ending)
        ? [...meta.endingsSeen, ending]
        : meta.endingsSeen
    set({ meta: { ...meta, endingsSeen, chaptersUnlocked: [1, 2, 3, 4, 5] } })
    getSaveService().saveMeta(get().meta)
    getSaveService().clearRun()
    director = null
    set({ run: null, world: null, screen: 'gallery' })
  }

  return {
    screen: 'boot',
    run: null,
    meta: { endingsSeen: [], chaptersUnlocked: [], contentWarningAccepted: false },
    world: null,
    interactables: '',
    speed: 1,

    setScreen: (screen) => set({ screen }),

    init: async () => {
      const service = getSaveService()
      const meta = await service.loadMeta()
      const run = await service.loadRun()
      if (run && !run.finished) {
        const awayMs = Date.now() - new Date(run.lastPlayedAt).getTime()
        if (awayMs > 30 * 60_000 && !run.metaHints.returnCommentFired) run.flags['returned'] = true
        set({ meta, run })
      } else set({ meta, run: null })
    },

    acceptWarning: () => {
      set({ meta: { ...get().meta, contentWarningAccepted: true }, screen: 'title' })
      get().saveNow()
    },

    startRun: () => {
      const run = newRun(null)
      const now = new Date().toISOString()
      run.startedAt = now
      run.lastPlayedAt = now
      if (isLateNight(new Date())) run.flags['late_night'] = true
      begin(run, 'n1')
    },

    continueRun: () => {
      const run = get().run
      if (!run) return
      begin(run, `n${Math.max(1, run.night)}`)
    },

    playNight: (night) => {
      const run = newRun(null)
      run.night = night as GameState['night']
      begin(run, `n${night}`)
    },

    step: (dtMs) => {
      if (!director) return
      const events = director.tick(dtMs * get().speed, sensors)
      const world = director.world
      const key = worldKey(world)
      const interactables = [...director.interactables()].sort().join(',')
      if (key !== lastKey || interactables !== get().interactables) {
        lastKey = key
        set({ world: { ...world }, interactables })
      }
      if (events.length) for (const listener of listeners) listener(events, world)
      const now = performance.now()
      if (
        events.some((e) => e.type === 'checkpoint' || e.type === 'nightStart') ||
        now - lastSave > 5000
      ) {
        lastSave = now
        get().saveNow()
      }
      if (events.some((e) => e.type === 'credits')) finish(world.ending)
    },

    input: (input) => {
      if (!director) return false
      const handled = director.input(input)
      lastKey = ''
      get().step(0)
      return handled
    },

    quitToTitle: () => {
      get().saveNow()
      director = null
      set({ screen: 'title', world: null })
    },

    saveNow: () => {
      const { run, meta } = get()
      const service = getSaveService()
      if (run && !run.finished) service.saveRun({ ...run, lastPlayedAt: new Date().toISOString() })
      service.saveMeta(meta)
    },

    realClock317: () => {
      const run = get().run
      if (!run || !director || run.metaHints.realClock317Fired) return
      run.metaHints.realClock317Fired = true
      emitDirectorEvents([{ type: 'sound', id: 'knock_soft', at: 'party_wall' }])
      get().saveNow()
    },

    debug: {
      setClock: (clock) => {
        if (!director) return
        director.world.clock = parseClock(clock)
        lastKey = ''
      },
      startNight: (night) => {
        const run = get().run ?? newRun(null)
        run.night = night as GameState['night']
        begin(run, `n${night}`)
      },
      playSequence: (id) => begin(get().run ?? newRun(null), id),
      setFlag: (key, value) => {
        const run = get().run
        if (run) run.flags[key] = value
        lastKey = ''
      },
      setSanity: (value) => {
        const run = get().run
        if (run) run.sanity = Math.max(0, Math.min(100, value))
        lastKey = ''
      },
      setSpeed: (speed) => set({ speed }),
    },
  }
})

/** The night clock as the phone shows it ("02:41"). */
export function clockText(world: WorldState): string {
  return formatClock(world.clock)
}
