import type { Beat, Condition, Sequence } from '@/core/director/types'
import { all, at, flag, isFlag, not, on, phone, say, sound } from './build'
import {
  FLAT48,
  diaryPage,
  flatBeats,
  phoneBeats,
  powerCut,
  resetNightFlags,
  windowsGoOut,
} from './common'

/**
 * Night 5 — 3:17 (docs/BEATS.md). The day the player did not leave: cold from 48's open
 * door, the last message, the clock that comes off the wall with the last page behind it.
 * At 3:17 everything dies, the phone too, and time holds there until the player acts:
 * into 48 (A), down the stairs and out (B, any time tonight), or the clock wound with the
 * small brass key (C, owner decision 1: after "Eshikni och", if eligible).
 */

/** Ending C (BEATS): all seven pages, sanity ≥ 40, never answered on night 3, every message heard. */
export const ENDING_C: Condition = all(
  { itemCountGte: { prefix: 'diary_', count: 7 } },
  { sanityGte: 40 },
  not(isFlag('n3_answered')),
  { itemCountGte: { prefix: 'mom_msg_', count: 5 } },
)

export const night5: Sequence = {
  id: 'n5',
  night: 5,
  start: '02:20',
  spawn: { position: [0.6, 1.6, -0.6], yaw: 0 },
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n5'),
    {
      id: 'n5.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        { type: 'object', id: 'opposite', change: 'one_lit' },
        // 48 has stood open since last night; the cold comes through the hall.
        { type: 'door', id: 'door48', state: 'ajar' },
        { type: 'object', id: 'seal', change: 'torn' },
        flag('clock_in_hand', false),
        phone({
          place: 'table',
          screen: 'off',
          missed: 52,
          date: 'phone.date_n5',
          work: null,
          message: ['N5-03', 'N5-04'],
          messageSeconds: 12,
          heard: false,
        }),
      ],
    },
    ...phoneBeats('n5', 'mom_msg_5', 12),
    {
      // The clock comes off the wall: heavy, in both hands. Behind it, the last page.
      id: 'n5.clock_off',
      trigger: on.use('clock'),
      when: not(isFlag('clock_in_hand')),
      actions: [
        flag('clock_in_hand'),
        flag('clock_takes'),
        { type: 'object', id: 'clock', change: 'in_hand' },
        sound('cloth', 'clock', 0.6),
      ],
    },
    {
      ...diaryPage('n5', 7, 'clock_wall', isFlag('clock_in_hand')),
      actions: [
        ...diaryPage('n5', 7, 'clock_wall').actions,
        { type: 'object', id: 'diary_7', change: 'taken' },
      ],
    },
    {
      // Before 3:17 the small key fits but will not turn: a soft stop.
      id: 'n5.key_stops',
      trigger: on.use('keyhole'),
      once: false,
      cooldownMs: 1500,
      when: all(isFlag('clock_in_hand'), not(isFlag('open_the_door'))),
      actions: [sound('clock_tick', 'clock', 0.25)],
    },
    {
      // 48's television murmurs through the wall for a while.
      id: 'n5.tv48',
      trigger: on.idle(10_000),
      when: not(isFlag('power_off')),
      actions: [0, 5000, 10_000].map((ms) => at(ms, sound('static', 'party_wall', 0.22))),
    },
    {
      // Just before the 4th floor opposite goes dark, someone there holds a lit phone up.
      ...windowsGoOut('n5', 'floorByFloor'),
      actions: [
        { type: 'object', id: 'opposite', change: 'phone' },
        ...windowsGoOut('n5', 'floorByFloor').actions,
        at(6000, { type: 'object', id: 'opposite', change: 'dark' }),
      ],
    },
    powerCut('n5', [{ type: 'clockFreeze', on: true }, phone({ screen: 'dead' })]),
    {
      id: 'n5.knocks',
      trigger: on.after('n5.317', 8000),
      actions: [
        sound('knock_soft', 'party_wall'),
        at(1400, sound('knock_soft', 'party_wall')),
        at(2800, sound('knock_soft', 'party_wall')),
        { type: 'haptic', pattern: 'knock' },
      ],
    },
    {
      // The voice in the player's own words, then "open the door".
      id: 'n5.voice',
      trigger: on.after('n5.knocks', 6000),
      actions: [
        {
          type: 'if',
          when: isFlag('draft_sent'),
          then: [say('voice', 'N5-05b', 'party_wall')],
          else: [say('voice', 'N5-05a', 'party_wall')],
        },
        {
          type: 'if',
          when: isFlag('n4_spoke', 'sardor'),
          then: [say('voice', 'N5-06a', 'party_wall')],
          else: [
            {
              type: 'if',
              when: isFlag('n4_spoke', 'where'),
              then: [say('voice', 'N5-06b', 'party_wall')],
              else: [say('voice', 'N5-06c', 'party_wall')],
            },
          ],
        },
        say('voice', 'N5-07', 'party_wall'),
        say('voice', 'N5-08', 'party_wall'),
        at(12_000, flag('open_the_door')),
      ],
    },
    {
      // Feet in the light under the entrance, still.
      id: 'n5.feet',
      trigger: on.gaze('front_door', 400),
      when: isFlag('open_the_door'),
      actions: [{ type: 'figure', placement: 'under_door', ms: 75_000 }],
    },
    {
      // Time holds at 3:17 until the player acts: three slow knocks and "Eshikni och" again.
      id: 'n5.hold',
      trigger: on.every(45_000),
      once: false,
      when: isFlag('open_the_door'),
      actions: [
        sound('knock_soft', 'party_wall', 0.7),
        at(1400, sound('knock_soft', 'party_wall', 0.7)),
        at(2800, sound('knock_soft', 'party_wall', 0.7)),
        at(4200, say('voice', 'N5-07', 'party_wall')),
      ],
    },
    // A: across 48's threshold, after the voice has asked.
    ...FLAT48.map((zone): Beat => ({
      id: `n5.ending_a_${zone}`,
      trigger: on.zone(zone),
      when: isFlag('open_the_door'),
      actions: [{ type: 'ending', id: 'A' }],
    })),
    {
      // Unchaining and opening the entrance (the way to the stairs).
      id: 'n5.open_front',
      trigger: on.use('front_door'),
      when: not(isFlag('front_open')),
      actions: [
        flag('front_open'),
        flag('chain_on', false),
        { type: 'figure', placement: null },
        { type: 'door', id: 'front_door', state: 'open' },
        sound('chain', 'front_door'),
      ],
    },
    // B: down the stairs, any time tonight.
    {
      id: 'n5.ending_b',
      trigger: on.zone('stairwell'),
      actions: [{ type: 'ending', id: 'B' }],
    },
    // C: the brass key in the clock after "Eshikni och"; or the spring will not catch.
    {
      id: 'n5.wind',
      trigger: on.use('keyhole'),
      when: all(isFlag('open_the_door'), isFlag('clock_in_hand'), ENDING_C),
      actions: [{ type: 'ending', id: 'C' }],
    },
    {
      id: 'n5.wind_fails',
      trigger: on.use('keyhole'),
      once: false,
      cooldownMs: 1500,
      when: all(isFlag('open_the_door'), isFlag('clock_in_hand')),
      actions: [sound('clock_tick', 'clock', 0.4)],
    },
    ...flatBeats('n5'),
  ],
  ambient: [
    { id: 'draught', actions: [sound('door_close', 'door48', 0.2)] },
    { id: 'pipes', actions: [sound('pipes', 'bath_sink', 0.4)] },
    { id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.4)] },
  ],
}
