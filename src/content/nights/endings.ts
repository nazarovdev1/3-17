import type { Beat, Sequence, TimedAction } from '@/core/director/types'
import { BUS_SEAT, GROUND_Y } from '@/content/world/exterior'
import { all, at, flag, isFlag, not, on, phone, say, sound } from './build'

/**
 * Endings as played set pieces, never a card (docs/BEATS.md "Endings"). No title shows
 * before or during them; the gallery names them afterwards. Each one's key event is a
 * sound or a picture, so it holds with subtitles off.
 */
const ENDING: Pick<
  Sequence,
  'start' | 'night' | 'realSecondsPerGameMinute' | 'ambientEveryMs' | 'ambient'
> = {
  start: '03:17',
  night: 5,
  realSecondsPerGameMinute: 1e9,
  ambientEveryMs: [1e9, 1e9],
  ambient: [],
}

// ── A — Qoʻshni ────────────────────────────────────────────────────────────

/** The player's own knock, from this side, and the line that is now theirs. */
const knockFrom48: TimedAction[] = [
  flag('knocked_48'),
  { type: 'object', id: 'knock_prompt', change: 'gone' },
  sound('knock_triple', 'party_wall48'),
  { type: 'haptic', pattern: 'knock' },
  at(2600, say('voice', 'EA-02', 'party_wall48')),
  at(6600, { type: 'fade', to: 'black', ms: 2000 }),
  at(8600, { type: 'scene', scene: 'off' }),
  at(13_000, { type: 'credits' }),
]

const knockBeat = (id: string, trigger: Beat['trigger']): Beat => ({
  id,
  trigger,
  when: all(isFlag('knock_ready'), not(isFlag('knocked_48'))),
  actions: knockFrom48,
})

export const endingA: Sequence = {
  ...ENDING,
  id: 'endA',
  // Just inside 48's entrance, facing in: the door is behind.
  spawn: { position: [-4.18, 1.6, 3.9], yaw: 0 },
  beats: [
    {
      // The door closes behind the player by itself; the latch. Darkness, breathing.
      id: 'endA.door',
      trigger: on.start(),
      actions: [
        { type: 'power', on: false },
        { type: 'scene', scene: 'silence' },
        { type: 'door', id: 'door48', state: 'closed' },
        sound('door_close', 'door48'),
        at(300, sound('chain', 'door48', 0.4)),
        { type: 'fade', to: 'black', ms: 1200 },
        ...[1800, 3400, 5000, 6600].map((ms) => at(ms, sound('heartbeat', undefined, 0.35))),
        // Cut: 48, weeks later, daylight through dirty glass. Only a slow shuffle.
        // By the sofa's end, a step from the wall toward 47, on the room's floor (the old spot
        // lay in the closet behind a wall: the knock could not be reached, R5 audit).
        at(7600, { type: 'place', position: [-3.4, 1.6, -0.25], yaw: -1.41 }),
        at(7600, { type: 'daylight', on: true }),
        at(7600, { type: 'control', limit: 'shuffle' }),
        at(7800, { type: 'fade', to: 'clear', ms: 3500 }),
      ],
    },
    {
      // Through the wall, in 47: a suitcase rolled in, keys, the landlord, muffled.
      id: 'endA.newcomer',
      trigger: on.after('endA.door', 12_600),
      actions: [
        sound('door_open', [0, 1.0, 4.6], 0.35),
        at(800, sound('suitcase', [0.0, 0.05, 3.4], 0.6)),
        at(3200, sound('chain', [0.2, 1.2, 4.2], 0.45)),
        at(4500, say('landlord', 'EA-01', [-1.2, 1.5, 0.5])),
        at(9000, sound('step_wood', [-0.6, 0.05, -0.6], 0.4)),
        at(9600, sound('step_wood', [-1.0, 0.05, -1.2], 0.4)),
      ],
    },
    {
      // A phone rings in 47 and nobody answers it (five rings).
      id: 'endA.phone',
      trigger: on.after('endA.newcomer', 8000),
      actions: [0, 2000, 4000, 6000, 8000].map((ms) =>
        at(ms, sound('phone_buzz', [0.9, 0.8, -1.2], 0.5)),
      ),
    },
    {
      // The clock here shows 3:17; the day dies to night over ten seconds.
      id: 'endA.dusk',
      trigger: on.after('endA.phone', 12_000),
      actions: [{ type: 'daylight', on: false, ms: 10_000 }],
    },
    {
      // The only time the game shows a knock: on the wall, toward 47.
      id: 'endA.prompt',
      trigger: on.after('endA.dusk', 10_500),
      actions: [flag('knock_ready'), { type: 'object', id: 'knock_prompt', change: 'shown' }],
    },
    knockBeat('endA.knock', on.knock('party_wall48')),
    knockBeat('endA.knock_e', on.use('party_wall48')),
    // Nobody knocks: the hand knocks by itself in the end.
    knockBeat('endA.knock_late', on.after('endA.prompt', 90_000)),
  ],
}

// ── B — Ketish ─────────────────────────────────────────────────────────────

/** Into the bus, seated by a window: the phone, the town moving, the one frame. */
const boardTheBus: TimedAction[] = [
  flag('on_bus'),
  { type: 'fade', to: 'black', ms: 700 },
  at(800, { type: 'place', position: BUS_SEAT, yaw: 0 }),
  at(800, { type: 'control', limit: 'locked' }),
  at(900, { type: 'fade', to: 'clear', ms: 1400 }),
  ...[900, 4900, 8900, 12_900, 16_900, 20_900].map((ms) => at(ms, sound('engine', undefined, 0.5))),
  // The phone buzzes in the pocket and comes up into view: Onam, and no answer button.
  at(3900, phone({ place: 'hand', screen: 'incoming', canAnswer: false })),
  ...[3900, 5900, 7900, 9900].map((ms) => at(ms, sound('phone_buzz', undefined, 0.6))),
  at(12_000, phone({ place: 'pocket', screen: 'off' })),
  // The bus moves; the dark window holds the player's reflection, and for one frame
  // someone sitting a few rows behind.
  at(12_500, { type: 'object', id: 'bus', change: 'moving' }),
  at(16_500, { type: 'figure', placement: 'bus_back', ms: 120 }),
  at(19_500, { type: 'fade', to: 'black', ms: 2500 }),
  at(22_000, { type: 'scene', scene: 'off' }),
  at(24_000, { type: 'credits' }),
]

/** The idling engine, by the kerb. */
const ENGINE: [number, number, number] = [6.0, GROUND_Y + 1.0, -18.3]

/** Down the rest of the stairs (a blink) and out of the building into the snow. */
const goingOut: TimedAction[] = [
  flag('going_out'),
  { type: 'fade', to: 'black', ms: 1400 },
  ...[200, 700, 1200].map((ms) => at(ms, sound('step_concrete', undefined, 0.4))),
  at(1600, { type: 'place', position: [1.5, GROUND_Y + 1.6, -5.2], yaw: -0.35 }),
  at(1600, { type: 'scene', scene: 'street' }),
  at(1600, { type: 'light', id: 'phone_torch', state: 'off' }),
  at(1600, sound('door_close', [1.0, GROUND_Y + 1.0, -4.3], 0.5)),
  at(1600, flag('outside')),
  at(2000, { type: 'fade', to: 'clear', ms: 2500 }),
  at(2500, sound('engine', ENGINE, 0.6)),
]

export const endingB: Sequence = {
  ...ENDING,
  id: 'endB',
  // A step down the first flight, facing down it.
  spawn: { position: [0.9, 1.6 - 0.25, 7.6], yaw: Math.PI },
  beats: [
    {
      id: 'endB.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'silence' },
        { type: 'light', id: 'phone_torch', state: 'on' },
        { type: 'light', id: 'landing', state: 'off' },
        { type: 'door', id: 'door48', state: 'ajar' },
        { type: 'object', id: 'seal', change: 'torn' },
        phone({ place: 'pocket', screen: 'off' }),
      ],
    },
    {
      // Light under Muhabbat opa's door; her television murmurs. The player can pass.
      id: 'endB.43',
      trigger: on.zone('by_43'),
      actions: [0, 3000, 6000].map((ms) => at(ms, sound('static', 'muhabbat', 0.18))),
    },
    {
      // On down the stairs and out into the snow.
      id: 'endB.down',
      trigger: on.zone('landing3', 1500),
      when: not(isFlag('going_out')),
      actions: goingOut,
    },
    {
      // The fallback view (no stairs to walk) goes down on its own after a while.
      id: 'endB.down_late',
      trigger: on.after('endB.start', 25_000),
      when: not(isFlag('going_out')),
      actions: goingOut,
    },
    { id: 'endB.out', trigger: on.every(500), when: isFlag('outside'), actions: [] },
    {
      id: 'endB.idle',
      trigger: on.every(4000),
      once: false,
      when: all(isFlag('outside'), not(isFlag('on_bus'))),
      actions: [sound('engine', ENGINE, 0.6)],
    },
    {
      id: 'endB.bus',
      trigger: on.zone('bus_door'),
      when: not(isFlag('on_bus')),
      actions: boardTheBus,
    },
    {
      // Standing in the snow long enough: the bus will not wait, so the player gets on.
      id: 'endB.bus_late',
      trigger: on.after('endB.out', 50_000),
      when: not(isFlag('on_bus')),
      actions: boardTheBus,
    },
  ],
}

// ── C — 3:18 ───────────────────────────────────────────────────────────────

/** Wound: ticking, the minute hand to 3:18, no knock; the power and the phone come back. */
const woundActions: TimedAction[] = [
  flag('wound'),
  flag('winding', false),
  { type: 'scene', scene: 'clock' },
  at(2000, { type: 'object', id: 'clock', change: '3:18' }),
  at(2000, sound('clock_tick', undefined, 1)),
  at(2000, { type: 'haptic', pattern: 'medium' }),
  // Silence; no knock comes. Then the power, slowly: the fridge, the bulbs, the lamp.
  at(7000, { type: 'power', on: true }),
  at(7000, { type: 'scene', scene: 'flat' }),
  at(9000, phone({ place: 'hand', screen: 'incoming', canAnswer: true, missed: 52 })),
]

export const endingC: Sequence = {
  ...ENDING,
  id: 'endC',
  spawn: { position: [-0.9, 1.6, -2.2], yaw: 0 },
  beats: [
    {
      // The brass key in the clock: the body still, the hands turning it.
      id: 'endC.key',
      trigger: on.start(),
      actions: [
        { type: 'power', on: false },
        { type: 'scene', scene: 'silence' },
        { type: 'object', id: 'clock', change: 'winding' },
        flag('winding'),
        { type: 'control', limit: 'locked' },
        phone({ place: 'pocket', screen: 'dead' }),
        sound('clock_tick', 'clock', 0.3),
      ],
    },
    // Where a hand cannot draw circles (the phone fallback), six taps on the key turn it.
    ...[1, 2, 3, 4, 5, 6].map((n): Beat => ({
      id: `endC.turn_${n}`,
      trigger: on.use('keyhole'),
      when: all(
        isFlag('winding'),
        n === 1 ? not(isFlag('turn_1')) : all(isFlag(`turn_${n - 1}`), not(isFlag(`turn_${n}`))),
      ),
      actions: [
        flag(`turn_${n}`),
        sound('ratchet', 'clock', 0.8),
        at(160, sound('ratchet', 'clock', 0.8)),
        { type: 'haptic', pattern: 'light' },
      ],
    })),
    {
      id: 'endC.wound_taps',
      trigger: on.after('endC.turn_6', 500),
      when: not(isFlag('wound')),
      actions: woundActions,
    },
    {
      // Wound: ticking, then the minute hand jumps to 3:18 with one loud tick.
      id: 'endC.wound',
      when: not(isFlag('wound')),
      trigger: on.use('clock_wound'),
      actions: woundActions,
    },
    {
      // Call: black, two real ringback tones, and her voice as text alone in the middle.
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
