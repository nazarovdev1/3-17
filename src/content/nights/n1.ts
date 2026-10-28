import type { Action, Sequence, TimedAction } from '@/core/director/types'
import { all, at, flag, has, isFlag, not, on, phone, say, sound, stepsDown } from './build'
import { phoneBeats, resetNightFlags, sofaBeats, teaBeat } from './common'

/**
 * Night 1 — Koʻchib kelish (docs/BEATS.md). The player arrives after a night shift at
 * 01:58; 3:17 comes by itself 5:56 later for a player who does nothing.
 */
export const night1: Sequence = {
  id: 'n1',
  night: 1,
  start: '01:58',
  spawn: { position: [1.7, 1.6, 6.95], yaw: 0.61 },
  realSecondsPerGameMinute: 4.5,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n1'),
    {
      id: 'n1.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'day' },
        // The phone's own torch: weak and narrow. The landing bulb is dead, and the flat is
        // dark until the player switches its lights on.
        { type: 'light', id: 'phone_torch', state: 'on' },
        { type: 'light', id: 'landing', state: 'off' },
        ...['room', 'kitchen', 'bath', 'hall'].map((circuit): Action => ({
          type: 'light',
          id: `flat_${circuit}`,
          state: 'off',
        })),
        // Rustam aka has just unlocked it and stepped into the dark doorway.
        { type: 'door', id: 'front_door', state: 'open' },
        { type: 'object', id: 'rustam', change: 'at_door' },
        { type: 'object', id: 'opposite', change: 'one_lit' },
        phone({
          place: 'table',
          screen: 'off',
          missed: 3,
          date: 'phone.date_n1',
          message: ['N1-08'],
          messageSeconds: 11,
          heard: false,
        }),
        at(800, sound('chain', 'front_door', 0.5)),
        at(1900, sound('door_open', 'front_door', 0.6)),
      ],
    },
    // Rustam aka: only a gloved hand, a sleeve and his breath, out of the dark doorway into
    // the phone's light. He has been waiting and holds the form out at once.
    {
      id: 'n1.offer',
      trigger: on.after('n1.start', 3500),
      actions: [
        flag('rustam_offered'),
        { type: 'object', id: 'rustam', change: 'offer_form' },
        sound('page', 'rustam_hand', 0.6),
      ],
    },
    {
      id: 'n1.form',
      trigger: on.use('rustam_hand'),
      when: all(isFlag('rustam_offered'), not(isFlag('form_open'))),
      actions: [flag('form_open'), { type: 'form' }],
    },
    {
      // Nobody takes the form: he presses it into the player's hands.
      id: 'n1.form_pressed',
      trigger: on.after('n1.offer', 25_000),
      when: not(isFlag('form_open')),
      actions: [flag('form_open'), { type: 'form' }],
    },
    {
      id: 'n1.keys',
      trigger: on.after('form:signed', 700),
      actions: [
        { type: 'object', id: 'rustam', change: 'offer_keys' },
        say('landlord', 'N1-01', 'rustam'),
        at(400, sound('chain', 'rustam_hand', 0.45)),
        say('landlord', 'N1-02', 'rustam'),
        say('landlord', 'N1-03', 'rustam'),
        say('landlord', 'N1-04', 'rustam'),
      ],
    },
    {
      // The keys land in the player's palm; while the eyes are on them, he squeezes past
      // and goes down. His steps stop between floors, and never go on.
      id: 'n1.take_keys',
      trigger: on.use('rustam_hand'),
      when: all(isFlag('form_open'), not(has('key_ring'))),
      actions: [
        { type: 'item', id: 'key_ring' },
        sound('chain', 'rustam_hand', 0.6),
        { type: 'camera', effect: 'hands' },
        flag('rustam_gone'),
        { type: 'object', id: 'rustam', change: 'gone' },
        ...departure(),
      ],
    },
    {
      id: 'n1.keys_wait',
      trigger: on.after('n1.keys', 16_000),
      when: not(has('key_ring')),
      actions: [flag('rustam_impatient')],
    },
    {
      // He does not wait: the moment nobody looks, the ring hangs on the door and he is gone.
      id: 'n1.keys_in_lock',
      trigger: on.unseen('rustam_hand', 1500),
      when: all(isFlag('rustam_impatient'), not(has('key_ring'))),
      actions: [
        flag('rustam_gone'),
        { type: 'object', id: 'rustam', change: 'gone' },
        { type: 'object', id: 'key_ring', change: 'in_lock' },
        sound('chain', 'front_door', 0.5),
        ...departure(),
      ],
    },
    {
      id: 'n1.keys_from_lock',
      trigger: on.use('key_ring'),
      when: all(isFlag('rustam_gone'), not(has('key_ring'))),
      actions: [
        { type: 'item', id: 'key_ring' },
        { type: 'object', id: 'key_ring', change: 'taken' },
        sound('chain', 'front_door', 0.6),
      ],
    },
    {
      id: 'n1.enter',
      trigger: on.zone('hall'),
      when: isFlag('rustam_gone'),
      actions: [
        { type: 'scene', scene: 'flat' },
        at(2500, sound('phone_buzz', 'phone')),
        at(2500, phone({ screen: 'lock' })),
        at(7500, phone({ screen: 'off' })),
      ],
    },
    ...phoneBeats('n1', 'mom_msg_1', 11),
    {
      id: 'n1.note',
      trigger: on.use('note'),
      once: false,
      cooldownMs: 800,
      actions: [{ type: 'readable', id: 'note' }, sound('page', 'note', 0.7)],
    },
    {
      // A closer look: hands at 3:17, no second hand moving, no tick.
      id: 'n1.clock',
      trigger: on.use('clock'),
      once: false,
      cooldownMs: 1500,
      actions: [{ type: 'camera', effect: 'push' }],
    },
    {
      id: 'n1.tv_on',
      trigger: on.use('tv'),
      once: false,
      cooldownMs: 600,
      when: not(isFlag('tv_on')),
      actions: [
        flag('tv_on'),
        { type: 'object', id: 'tv', change: 'static' },
        sound('static', 'tv'),
      ],
    },
    {
      id: 'n1.tv_cough',
      trigger: on.after('n1.tv_on', 3200),
      when: isFlag('tv_on'),
      actions: [sound('cough', 'tv', 0.55)],
    },
    {
      id: 'n1.tv_off',
      trigger: on.use('tv'),
      once: false,
      cooldownMs: 600,
      when: isFlag('tv_on'),
      actions: [flag('tv_on', false), { type: 'object', id: 'tv', change: 'reflect' }],
    },
    {
      id: 'n1.window',
      trigger: on.gaze('room_window', 1000),
      actions: [{ type: 'object', id: 'opposite', change: 'one_lit' }],
    },
    {
      id: 'n1.radiator',
      trigger: on.use('room_radiator'),
      once: false,
      cooldownMs: 4000,
      actions: [sound('radiator', 'room_radiator')],
    },
    teaBeat('n1'),
    {
      id: 'n1.drip',
      trigger: on.zone('bathroom'),
      actions: [sound('drip', 'bath_sink', 0.5), at(1400, sound('drip', 'bath_sink', 0.45))],
    },
    {
      id: 'n1.chain_on',
      trigger: on.use('chain'),
      once: false,
      cooldownMs: 700,
      when: not(isFlag('chain_on')),
      actions: [flag('chain_on'), sound('chain', 'front_door')],
    },
    {
      id: 'n1.chain_off',
      trigger: on.use('chain'),
      once: false,
      cooldownMs: 700,
      when: isFlag('chain_on'),
      actions: [flag('chain_on', false), sound('chain', 'front_door', 0.8)],
    },
    ...sofaBeats('n1'),
    {
      // Mother calls while the player is away from the phone; it stops just too early.
      id: 'n1.call',
      trigger: on.clock('02:35'),
      notIn: ['room'],
      when: not(isFlag('power_off')),
      actions: [
        phone({ screen: 'incoming' }),
        sound('phone_buzz', 'phone'),
        at(2000, sound('phone_buzz', 'phone')),
        at(4000, sound('phone_buzz', 'phone')),
        at(6000, phone({ screen: 'off', missed: 4 })),
      ],
    },
    {
      // The phone clock holds at 3:16 while the opposite windows go out floor by floor;
      // 3:17 comes the moment the last one is dark.
      id: 'n1.316',
      trigger: on.clock('03:16'),
      actions: [
        { type: 'timeScale', factor: 1 },
        { type: 'clockFreeze', on: true },
        { type: 'windows', state: 'floorByFloor' },
        ...[0, 900, 1800, 2700, 3600, 4500, 5400, 6300].map((ms, i) =>
          at(ms, sound('switch', [-2.0 + (i % 3), 1.0 + i * 0.1, -3.4 + (i % 2) * 7], 0.18)),
        ),
      ],
    },
    {
      id: 'n1.317',
      trigger: on.after('n1.316', 8000),
      actions: [
        { type: 'setClock', at: '03:17' },
        { type: 'clockFreeze', on: false },
        flag('power_off'),
        { type: 'power', on: false },
        { type: 'scene', scene: 'silence' },
        { type: 'object', id: 'tv', change: 'off' },
        sound('fridge_stop', 'fridge'),
        { type: 'haptic', pattern: 'medium' },
      ],
    },
    {
      id: 'n1.knocks',
      trigger: on.after('n1.317', 7000),
      actions: [
        sound('knock_triple', 'party_wall'),
        { type: 'haptic', pattern: 'knock' },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      id: 'n1.voice',
      trigger: on.after('n1.knocks', 3000),
      actions: [sound('whisper', 'party_wall', 0.6), say('voice', 'N1-12', 'party_wall')],
      waitFor: {
        openAfterMs: 1400,
        windowMs: 20_000,
        flag: 'n1_response',
        answer: {
          target: 'party_wall',
          value: 'answer',
          actions: [
            say('player_spoken', 'N1-13a.1'),
            { type: 'sanity', delta: -5 },
            at(2800, say('voice', 'N1-13a.2', 'party_wall')),
            at(2800, {
              type: 'if',
              when: { profile: 'livesAlone', eq: 'yoʻq' },
              then: [say('voice', 'N1-13e', 'party_wall')],
              else: [say('voice', 'N1-13a.3', 'party_wall')],
            }),
          ],
        },
        knock: {
          target: 'party_wall',
          value: 'knock',
          actions: [
            { type: 'camera', effect: 'jolt' },
            at(3200, say('voice', 'N1-13d', 'party_wall')),
          ],
        },
        silence: {
          value: 'silent',
          actions: [
            {
              type: 'if',
              when: isFlag('chain_on'),
              then: [say('voice', 'N1-13b', 'party_wall')],
              else: [say('voice', 'N1-13c', 'party_wall')],
            },
          ],
        },
      },
    },
    {
      id: 'n1.dawn',
      trigger: on.after('n1.voice:resolved', 15_000),
      actions: [
        { type: 'fade', to: 'black', ms: 3000 },
        at(3200, { type: 'power', on: true }),
        at(3200, { type: 'scene', scene: 'flat' }),
        at(3200, { type: 'daylight', on: true }),
        at(3200, { type: 'windows', state: 'lit' }),
        at(3200, { type: 'setClock', at: '07:40' }),
        at(3200, { type: 'clockFreeze', on: true }),
        at(3200, phone({ place: 'table', screen: 'lock', missed: 4, date: 'phone.date_n1_dawn' })),
        at(3600, sound('crows', [1.0, 4.0, -6.0], 0.5)),
        at(4200, { type: 'fade', to: 'clear', ms: 2500 }),
        { type: 'endNight', afterMs: 13_000 },
      ],
    },
  ],
  ambient: [
    { id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.7)] },
    { id: 'pipes', actions: [sound('pipes', 'bath_sink', 0.5)] },
    { id: 'car', actions: [sound('car_pass', [1.0, 2.0, -9.0], 0.5)] },
    { id: 'door_below', actions: [sound('door_close', [1.6, -2.9, 6.0], 0.35)] },
  ],
}

/** Out of the doorway, past the player, down the stairs: three floors, then nothing. */
function departure(): TimedAction[] {
  const path: [number, number, number][] = [
    [0.3, 0.05, 4.8],
    [0.75, 0.05, 5.45],
    [1.25, 0.05, 6.1],
    [1.65, 0.05, 6.75],
  ]
  return [
    ...path.map((point, i) => at(300 + i * 480, sound('step_concrete', point, 0.9))),
    ...stepsDown(40, 300 + path.length * 480, 40),
  ]
}
