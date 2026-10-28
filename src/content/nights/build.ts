import type {
  Action,
  Condition,
  ObjectId,
  Point,
  Speaker,
  TextKey,
  TimedAction,
  Trigger,
} from '@/core/director/types'
import type { GameClock } from '@/core/director/clock'

/** Small builders so a night reads like docs/BEATS.md. */
export const at = <A extends Action>(delayMs: number, action: A): TimedAction => ({
  ...action,
  delayMs,
})
export const say = (speaker: Speaker, line: TextKey, from?: ObjectId | Point): Action => ({
  type: 'say',
  speaker,
  line,
  from,
})
export const sound = (id: string, where?: ObjectId | Point, volume?: number): Action => ({
  type: 'sound',
  id,
  at: where,
  volume,
})
export const flag = (key: string, value: boolean | number | string = true): Action => ({
  type: 'flag',
  key,
  value,
})
export const not = (condition: Condition): Condition => ({ not: condition })
export const isFlag = (name: string, eq?: unknown): Condition =>
  eq === undefined ? { flag: name } : { flag: name, eq }
export const has = (item: string): Condition => ({ hasItem: item })
export const all = (...conditions: Condition[]): Condition => ({ all: conditions })
export const any = (...conditions: Condition[]): Condition => ({ any: conditions })

export const on = {
  start: (): Trigger => ({ type: 'start' }),
  clock: (time: GameClock): Trigger => ({ type: 'clock', at: time }),
  zone: (zone: string, dwellMs?: number): Trigger => ({ type: 'zone', zone, dwellMs }),
  gaze: (target: ObjectId, minMs?: number): Trigger => ({ type: 'gaze', target, minMs }),
  unseen: (target: ObjectId, minMs: number): Trigger => ({ type: 'notLooking', target, minMs }),
  use: (target: ObjectId): Trigger => ({ type: 'interact', target }),
  idle: (ms: number): Trigger => ({ type: 'idle', ms }),
  after: (beat: string, delayMs?: number): Trigger => ({ type: 'after', beat, delayMs }),
  hold: (target: ObjectId, minMs?: number): Trigger => ({ type: 'hold', target, minMs }),
  knock: (target: ObjectId): Trigger => ({ type: 'knock3', target }),
  every: (ms: number): Trigger => ({ type: 'every', ms }),
}

/** Steps on concrete going down the stairwell from the 4th floor: they stop between floors. */
export function stepsDown(count: number, startMs: number, stopAt: number): TimedAction[] {
  const out: TimedAction[] = []
  for (let i = 0; i < count; i++) {
    // Down the flight beside the landing, turning at each half-landing; 17 steps per floor.
    const floor = i / 17
    const y = -floor * 2.9
    const side = Math.floor(i / 8.5) % 2 === 0 ? 1.0 : 2.4
    const z = 7.5 + ((i % 9) / 9) * 2.4
    if (i >= stopAt) break
    out.push(
      at(startMs + i * 520, sound('step_concrete', [side, y, z], Math.max(0.25, 1 - floor * 0.25))),
    )
  }
  return out
}

/** Phone screen helpers. */
export const phone = (set: Extract<Action, { type: 'phone' }>['set']): Action => ({
  type: 'phone',
  set,
})
