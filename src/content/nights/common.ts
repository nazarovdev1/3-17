import type { Beat } from '@/core/director/types'
import { at, flag, has, isFlag, not, all, on, phone, sound } from './build'

/** The phone on the table: pick it up, tap tonight's message, put it down (REDESIGN §3). */
export function phoneBeats(night: string, message: string, seconds: number): Beat[] {
  return [
    {
      id: `${night}.phone_up`,
      trigger: on.use('phone'),
      once: false,
      cooldownMs: 400,
      when: not(isFlag('phone_up')),
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
export function powerCut(night: string): Beat {
  return {
    id: `${night}.317`,
    trigger: on.clock('03:17'),
    actions: [
      flag('power_off'),
      { type: 'power', on: false },
      { type: 'scene', scene: 'silence' },
      { type: 'object', id: 'tv', change: 'off' },
      sound('fridge_stop', 'fridge'),
      { type: 'haptic', pattern: 'medium' },
    ],
  }
}

/** Fade to black, power and daylight return, then the next night. */
export function dawn(
  night: string,
  afterBeat: string,
  delayMs: number,
  clock: `${number}:${number}`,
): Beat {
  return {
    id: `${night}.dawn`,
    trigger: on.after(afterBeat, delayMs),
    actions: [
      { type: 'fade', to: 'black', ms: 3000 },
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
  actions: [flag('power_off', false), flag('phone_up', false), flag('tv_on', false)],
})

export { has }
