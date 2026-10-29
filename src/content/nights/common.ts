import type { Beat, Condition, TimedAction } from '@/core/director/types'
import { at, flag, has, isFlag, not, all, on, phone, sound } from './build'

/** The phone on the table: pick it up, tap tonight's message, put it down (REDESIGN §3). */
export function phoneBeats(night: string, message: string, seconds: number): Beat[] {
  return [
    {
      id: `${night}.phone_up`,
      trigger: on.use('phone'),
      once: false,
      cooldownMs: 400,
      when: all(not(isFlag('phone_up')), not(isFlag('phone_pillow'))),
      actions: [
        flag('phone_up'),
        phone({ place: 'hand', screen: 'lock' }),
        sound('cloth', 'phone', 0.4),
      ],
    },
    {
      id: `${night}.phone_down`,
      trigger: on.use('phone'),
      once: false,
      cooldownMs: 400,
      when: isFlag('phone_up'),
      actions: [flag('phone_up', false), phone({ place: 'table', screen: 'off' })],
    },
    {
      id: `${night}.message`,
      trigger: on.use('phone_message'),
      once: false,
      cooldownMs: seconds * 1000,
      when: isFlag('phone_up'),
      actions: [
        phone({ screen: 'playing' }),
        { type: 'item', id: message },
        { type: 'if', when: not(has(message)), then: [{ type: 'sanity', delta: 3 }] },
        at(seconds * 1000, phone({ screen: 'lock', heard: true })),
      ],
    },
  ]
}

/** The phone lying on the sofa's pillow end (night 2's morning, night 4 under the pillow). */
export function pillowPhone(night: string): Beat {
  return {
    id: `${night}.pillow`,
    trigger: on.use('pillow'),
    once: false,
    cooldownMs: 400,
    when: isFlag('phone_pillow'),
    actions: [
      flag('phone_pillow', false),
      flag('phone_up'),
      phone({ place: 'hand', screen: 'lock' }),
      sound('cloth', 'pillow', 0.5),
    ],
  }
}

/** A diary page found somewhere in the flat: in the hand, kept, and readable again. */
export function diaryPage(night: string, n: number, target: string, extra?: Condition): Beat {
  return {
    id: `${night}.diary_${n}`,
    trigger: on.use(target),
    once: false,
    cooldownMs: 800,
    when: extra,
    actions: [
      { type: 'readable', id: `diary_${n}` },
      { type: 'item', id: `diary_${n}` },
      sound('page', target, 0.7),
    ],
  }
}

/**
 * 03:16: the block opposite goes dark (floor by floor, or all at once on night 4) while the
 * phone's clock holds; relay clicks run through the walls. 3:17 comes 8 s later.
 */
export function windowsGoOut(night: string, style: 'floorByFloor' | 'allAtOnce'): Beat {
  const clicks = style === 'allAtOnce' ? [0, 60, 140] : [0, 900, 1800, 2700, 3600, 4500, 5400]
  return {
    id: `${night}.316`,
    trigger: on.clock('03:16'),
    actions: [
      { type: 'timeScale', factor: 1 },
      { type: 'clockFreeze', on: true },
      { type: 'windows', state: style },
      ...clicks.map((ms, i) =>
        at(ms, sound('switch', [-2.0 + (i % 3), 1.0 + i * 0.1, -3.4 + (i % 2) * 7], 0.18)),
      ),
    ],
  }
}

/** Lying down speeds the night up eightfold until 03:16 or until the player moves. */
export function sofaBeats(night: string): Beat[] {
  return [
    {
      id: `${night}.lie_down`,
      trigger: on.use('sofa'),
      once: false,
      cooldownMs: 1500,
      when: not(isFlag('power_off')),
      actions: [
        { type: 'timeScale', factor: 8 },
        { type: 'camera', effect: 'lookDown' },
      ],
    },
  ]
}

export function teaBeat(night: string): Beat {
  return {
    id: `${night}.tea`,
    trigger: on.use('kettle'),
    when: all(not(isFlag(`tea_${night}`)), not(isFlag('power_off'))),
    actions: [
      flag(`tea_${night}`),
      sound('kettle', 'kettle'),
      at(9000, sound('tea', 'kettle')),
      at(9000, { type: 'sanity', delta: 5 }),
    ],
  }
}

/** Power cut, real silence, then whatever comes from the wall (BEATS §2). */
export function powerCut(night: string, extra: TimedAction[] = []): Beat {
  return {
    id: `${night}.317`,
    trigger: on.after(`${night}.316`, 8000),
    actions: [
      { type: 'setClock', at: '03:17' },
      { type: 'clockFreeze', on: false },
      flag('power_off'),
      { type: 'power', on: false },
      { type: 'scene', scene: 'silence' },
      { type: 'object', id: 'tv', change: 'off' },
      sound('fridge_stop', 'fridge'),
      { type: 'haptic', pattern: 'medium' },
      ...extra,
    ],
  }
}

/** Fade to black, power and daylight return, then the next night. */
export function dawn(
  night: string,
  afterBeat: string,
  delayMs: number,
  clock: `${number}:${number}`,
  missed?: number,
  extra: TimedAction[] = [],
): Beat {
  return {
    id: `${night}.dawn`,
    trigger: on.after(afterBeat, delayMs),
    actions: [
      { type: 'fade', to: 'black', ms: 3000 },
      // The phone lights up with the day's count (BEATS: N2-22, N3-15, N4-12).
      ...(missed === undefined
        ? []
        : [at(3200, phone({ place: 'table', screen: 'lock', missed, time: clock }))]),
      ...extra.map((a) => ({ ...a, delayMs: (a.delayMs ?? 0) + 3200 })),
      at(3200, { type: 'power', on: true }),
      at(3200, { type: 'scene', scene: 'flat' }),
      at(3200, { type: 'daylight', on: true }),
      at(3200, { type: 'windows', state: 'lit' }),
      at(3200, { type: 'setClock', at: clock }),
      at(3200, { type: 'clockFreeze', on: true }),
      at(4200, { type: 'fade', to: 'clear', ms: 2500 }),
      { type: 'endNight', afterMs: 12_000 },
    ],
  }
}

/** The rooms of flat 48 (layout.ts mirrors 47's rooms). */
export const FLAT48 = ['room48', 'kitchen48', 'bathroom48', 'corridor48', 'hall48'] as const

export const resetNightFlags = (night: string): Beat => ({
  id: `${night}.reset`,
  trigger: on.start(),
  actions: [
    flag('power_off', false),
    flag('phone_up', false),
    flag('phone_pillow', false),
    flag('tv_on', false),
  ],
})

export { has }

/**
 * What the flat lets the player do every night: read the note again, look closely at the
 * clock, the TV, the radiator, tea, the chain, lying down. (Night 1 has its own versions.)
 */
export function flatBeats(night: string, options: { tv?: boolean } = {}): Beat[] {
  const beats: Beat[] = [
    {
      id: `${night}.note`,
      trigger: on.use('note'),
      once: false,
      cooldownMs: 800,
      actions: [{ type: 'readable', id: 'note' }, sound('page', 'note', 0.7)],
    },
    {
      id: `${night}.clock`,
      trigger: on.use('clock'),
      once: false,
      cooldownMs: 1500,
      when: not(isFlag('clock_takes')),
      actions: [{ type: 'camera', effect: 'push' }],
    },
    {
      id: `${night}.radiator`,
      trigger: on.use('room_radiator'),
      once: false,
      cooldownMs: 4000,
      when: not(isFlag('power_off')),
      actions: [sound('radiator', 'room_radiator')],
    },
    teaBeat(night),
    {
      id: `${night}.chain_on`,
      trigger: on.use('chain'),
      once: false,
      cooldownMs: 700,
      when: not(isFlag('chain_on')),
      actions: [flag('chain_on'), sound('chain', 'front_door')],
    },
    {
      id: `${night}.chain_off`,
      trigger: on.use('chain'),
      once: false,
      cooldownMs: 700,
      when: isFlag('chain_on'),
      actions: [flag('chain_on', false), sound('chain', 'front_door', 0.8)],
    },
    ...sofaBeats(night),
  ]
  if (options.tv !== false)
    beats.push(
      {
        id: `${night}.tv_on`,
        trigger: on.use('tv'),
        once: false,
        cooldownMs: 600,
        when: all(not(isFlag('tv_on')), not(isFlag('power_off'))),
        actions: [
          flag('tv_on'),
          { type: 'object', id: 'tv', change: 'static' },
          sound('static', 'tv'),
        ],
      },
      {
        id: `${night}.tv_off`,
        trigger: on.use('tv'),
        once: false,
        cooldownMs: 600,
        when: isFlag('tv_on'),
        actions: [flag('tv_on', false), { type: 'object', id: 'tv', change: 'reflect' }],
      },
    )
  return beats
}

/** Mother calls while the player is away from the phone; it stops just too early (BEATS §2). */
export function motherCall(night: string, time: `${number}:${number}`, missedAfter: number): Beat {
  return {
    id: `${night}.call`,
    trigger: on.clock(time),
    notIn: ['room'],
    when: not(isFlag('power_off')),
    actions: [
      phone({ screen: 'incoming' }),
      sound('phone_buzz', 'phone'),
      at(2000, sound('phone_buzz', 'phone')),
      at(4000, sound('phone_buzz', 'phone')),
      at(6000, phone({ screen: 'off', missed: missedAfter })),
    ],
  }
}
