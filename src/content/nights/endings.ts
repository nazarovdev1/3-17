import type { Sequence } from '@/core/director/types'
import { at, on, phone, say, sound } from './build'

/**
 * Endings as played sequences, never a card (BEATS "Endings"). R1 keeps their key non-text
 * events so each is reachable and survives muted subtitles; R4 builds the full set pieces
 * (48 weeks later, the bus, the winding gesture).
 */
const FLAT48_SPAWN = { position: [-4.78, 1.6, -0.6] as [number, number, number], yaw: 0 }

export const endingA: Sequence = {
  id: 'endA',
  night: 5,
  start: '03:17',
  spawn: FLAT48_SPAWN,
  realSecondsPerGameMinute: 1e9,
  ambientEveryMs: [1e9, 1e9],
  ambient: [],
  beats: [
    {
      id: 'endA.door',
      trigger: on.start(),
      actions: [
        { type: 'power', on: false },
        { type: 'scene', scene: 'silence' },
        { type: 'door', id: 'door48', state: 'closed' },
        sound('door_close', 'door48'),
        { type: 'control', limit: 'shuffle' },
        at(1500, { type: 'fade', to: 'black', ms: 1500 }),
        at(9000, { type: 'daylight', on: true }),
        at(9000, { type: 'fade', to: 'clear', ms: 3000 }),
        at(14_000, sound('door_open', [0, 1.0, 4.6], 0.4)),
        at(16_000, say('landlord', 'EA-01', [0, 1.5, 3.8])),
        at(22_000, sound('phone_buzz', [0.9, 0.8, -1.2], 0.5)),
        at(24_000, sound('phone_buzz', [0.9, 0.8, -1.2], 0.5)),
        at(28_000, { type: 'daylight', on: false }),
        at(30_000, { type: 'object', id: 'knock_prompt', change: 'shown' }),
      ],
    },
    {
      id: 'endA.knock',
      trigger: on.knock('party_wall48'),
      actions: [
        sound('knock_triple', 'party_wall48'),
        at(2600, say('voice', 'EA-02', 'party_wall48')),
        at(6000, { type: 'fade', to: 'black', ms: 2000 }),
        at(11_000, { type: 'credits' }),
      ],
    },
  ],
}

export const endingB: Sequence = {
  id: 'endB',
  night: 5,
  start: '03:17',
  spawn: { position: [1.6, 1.6, 6.9], yaw: 0 },
  realSecondsPerGameMinute: 1e9,
  ambientEveryMs: [1e9, 1e9],
  ambient: [],
  beats: [
    {
      id: 'endB.out',
      trigger: on.start(),
      actions: [
        { type: 'fade', to: 'black', ms: 1500 },
        at(1600, { type: 'scene', scene: 'street' }),
        at(2000, { type: 'fade', to: 'clear', ms: 2500 }),
        at(9000, phone({ place: 'hand', screen: 'incoming', canAnswer: false, missed: 52 })),
        at(9000, sound('phone_buzz')),
        at(11_000, sound('phone_buzz')),
        at(13_000, sound('phone_buzz')),
        at(17_000, phone({ place: 'pocket', screen: 'off' })),
        at(20_000, { type: 'figure', placement: 'bus_back', ms: 120 }),
        at(23_000, { type: 'fade', to: 'black', ms: 2500 }),
        at(27_000, { type: 'credits' }),
      ],
    },
  ],
}

export const endingC: Sequence = {
  id: 'endC',
  night: 5,
  start: '03:17',
  spawn: { position: [0.6, 1.6, -0.6], yaw: 0 },
  realSecondsPerGameMinute: 1e9,
  ambientEveryMs: [1e9, 1e9],
  ambient: [],
  beats: [
    {
      id: 'endC.wind',
      trigger: on.start(),
      actions: [
        sound('clock_tick', 'clock'),
        at(1000, sound('clock_tick', 'clock')),
        at(2000, { type: 'object', id: 'clock', change: '3:18' }),
        at(2000, sound('clock_tick', 'clock', 1)),
        at(2000, { type: 'scene', scene: 'clock' }),
        at(7000, { type: 'power', on: true }),
        at(9000, phone({ place: 'hand', screen: 'incoming', canAnswer: true })),
      ],
    },
    {
      id: 'endC.call',
      trigger: on.use('phone_call'),
      actions: [
        { type: 'fade', to: 'black', ms: 600 },
        { type: 'scene', scene: 'off' },
        at(800, sound('ringback')),
        at(4800, sound('ringback')),
        at(9000, say('mother', 'EC-02')),
        at(15_000, { type: 'credits' }),
      ],
    },
  ],
}
