import type { GameState, PlayerProfile } from '../state/types'
import { Director } from './director'
import type { DirectorEvent, PlayerInput, Sensors, Sequence, TextKey } from './types'

export const STILL: Sensors = { zones: [], looking: [], visible: [], moving: false }

export function newRun(profile: PlayerProfile | null = null): GameState {
  const now = new Date(0).toISOString()
  return {
    profile,
    night: 1,
    sanity: 100,
    flags: {},
    inventory: [],
    finished: false,
    startedAt: now,
    lastPlayedAt: now,
    metaHints: {
      realClock317Fired: false,
      returnCommentFired: false,
      lateNightCommentFired: false,
    },
  }
}

export interface SimulationScript {
  /** Sensors for a moment of real time (ms since the start of the run). */
  sensors?: (t: number, director: Director) => Sensors
  /** Inputs to send at given real times. */
  inputs?: { at: number; input: PlayerInput | ((d: Director) => PlayerInput | null) }[]
  /** Stop when this returns true. */
  until?: (director: Director, t: number) => boolean
}

/**
 * Headless run with accelerated time: a deterministic Director fed a scripted player.
 * Used by unit tests and `npm run metrics:design`.
 */
export function simulate(
  sequences: Record<string, Sequence>,
  options: {
    start: string
    run?: GameState
    wordsOf: (key: TextKey) => number
    maxMs: number
    stepMs?: number
    seed?: number
    script?: SimulationScript
  },
): { director: Director; events: { t: number; event: DirectorEvent }[] } {
  const director = new Director(
    {
      sequences,
      run: options.run ?? newRun(),
      wordsOf: options.wordsOf,
      seed: options.seed,
      record: true,
    },
    options.start,
  )
  const step = options.stepMs ?? 100
  const events: { t: number; event: DirectorEvent }[] = []
  const inputs = [...(options.script?.inputs ?? [])].sort((a, b) => a.at - b.at)
  for (let t = 0; t <= options.maxMs; t += step) {
    while (inputs.length && inputs[0]!.at <= t) {
      const { input } = inputs.shift()!
      const resolved = typeof input === 'function' ? input(director) : input
      if (resolved) director.input(resolved)
    }
    const sensors = options.script?.sensors?.(t, director) ?? STILL
    for (const event of director.tick(step, sensors)) events.push({ t, event })
    if (options.script?.until?.(director, t)) break
  }
  return { director, events }
}
