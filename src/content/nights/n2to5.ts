import type { Beat, Condition, Sequence } from '@/core/director/types'
import { all, any, at, flag, has, isFlag, not, on, phone, say, sound } from './build'
import { FLAT48, dawn, phoneBeats, powerCut, resetNightFlags, sofaBeats, teaBeat } from './common'

/**
 * Nights 2–5: R1 scaffolds. They carry the structure every night needs (clock, phone,
 * diary pages, 3:17, the voice and its conditions, dawn, the endings) so the whole game
 * stays playable and testable. Their world beats from docs/BEATS.md are built in R3,
 * after the owner approves night 1.
 */
const ROOM_SPAWN = { position: [0.6, 1.6, -0.6] as [number, number, number], yaw: 0 }

function diaryPage(
  night: string,
  n: number,
  target: string,
  extra: Beat['when'] = undefined,
): Beat {
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

const knocks = (night: string, id = 'knock_triple'): Beat => ({
  id: `${night}.knocks`,
  trigger: on.after(`${night}.317`, 7000),
  actions: [
    sound(id, 'party_wall'),
    { type: 'haptic', pattern: 'knock' },
    { type: 'sanity', delta: -5 },
  ],
})

export const night2: Sequence = {
  id: 'n2',
  night: 2,
  start: '13:20',
  spawn: ROOM_SPAWN,
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n2'),
    {
      id: 'n2.start',
      trigger: on.start(),
      actions: [
        { type: 'daylight', on: true },
        { type: 'scene', scene: 'flat' },
        phone({
          place: 'table',
          screen: 'off',
          missed: 6,
          date: 'phone.date_n2',
          message: null,
          heard: false,
          draft: 'none',
        }),
      ],
    },
    {
      // Muhabbat opa climbs up and talks through 47's door (her 3rd-floor landing is R3).
      id: 'n2.muhabbat',
      trigger: on.after('n2.start', 30_000),
      actions: [
        sound('knock', 'front_door', 0.6),
        say('muhabbat', 'N2-02', 'front_door'),
        say('muhabbat', 'N2-03', 'front_door'),
        say('muhabbat', 'N2-04', 'front_door'),
        say('muhabbat', 'N2-05', 'front_door'),
        say('muhabbat', 'N2-06', 'front_door'),
        say('muhabbat', 'N2-07', 'front_door'),
        say('muhabbat', 'N2-08', 'front_door'),
        say('muhabbat', 'N2-09', 'front_door'),
        say('muhabbat', 'N2-10', 'front_door'),
        say('muhabbat', 'N2-11', 'front_door'),
        say('muhabbat', 'N2-12', 'front_door'),
        say('muhabbat', 'N2-13', 'front_door'),
        say('muhabbat', 'N2-14', 'front_door'),
        flag('heard_48'),
        flag('heard_sardor'),
      ],
    },
    {
      id: 'n2.night',
      trigger: on.after('n2.muhabbat', 50_000),
      actions: [
        { type: 'fade', to: 'black', ms: 2000 },
        at(2200, { type: 'daylight', on: false }),
        at(2200, { type: 'setClock', at: '02:05' }),
        at(
          2200,
          phone({ missed: 11, message: ['N2-16', 'N2-17'], messageSeconds: 19, heard: false }),
        ),
        at(2600, { type: 'fade', to: 'clear', ms: 2000 }),
      ],
    },
    ...phoneBeats('n2', 'mom_msg_2', 19),
    {
      id: 'n2.draft',
      trigger: on.after('n2.message', 19_500),
      actions: [phone({ draft: 'shown', screen: 'draft' })],
    },
    {
      id: 'n2.send',
      trigger: on.use('phone_send'),
      when: isFlag('phone_up'),
      actions: [flag('draft_sent'), phone({ draft: 'sent', screen: 'lock' })],
    },
    diaryPage('n2', 1, 'wardrobe'),
    diaryPage('n2', 2, 'bathtub'),
    teaBeat('n2'),
    ...sofaBeats('n2'),
    { ...powerCut('n2'), when: isFlag('night_started_n2') },
    {
      id: 'n2.night_flag',
      trigger: on.after('n2.night', 2300),
      actions: [flag('night_started_n2')],
    },
    knocks('n2'),
    {
      id: 'n2.voice',
      trigger: on.after('n2.knocks', 3000),
      actions: [
        sound('whisper', 'party_wall', 0.6),
        {
          type: 'if',
          when: isFlag('n1_response', 'answer'),
          then: [say('voice', 'N2-19a', 'party_wall')],
          else: [
            {
              type: 'if',
              when: isFlag('n1_response', 'knock'),
              then: [say('voice', 'N2-19c', 'party_wall')],
              else: [say('voice', 'N2-19b', 'party_wall')],
            },
          ],
        },
        {
          type: 'if',
          when: { profile: 'livesAlone', eq: 'ha' },
          then: [say('voice', 'N2-20a', 'party_wall')],
          else: [
            {
              type: 'if',
              when: { profile: 'livesAlone', eq: 'hozircha' },
              then: [say('voice', 'N2-20b', 'party_wall')],
              else: [say('voice', 'N2-20c', 'party_wall')],
            },
          ],
        },
        {
          type: 'if',
          when: { profile: 'fear', eq: 'qorongʻulik' },
          then: [say('voice', 'N2-21a', 'party_wall')],
          else: [
            {
              type: 'if',
              when: { profile: 'fear', eq: 'yolgʻizlik' },
              then: [say('voice', 'N2-21b', 'party_wall')],
              else: [
                {
                  type: 'if',
                  when: { profile: 'fear', eq: 'kuzatuv' },
                  then: [say('voice', 'N2-21c', 'party_wall')],
                  else: [say('voice', 'N2-21d', 'party_wall')],
                },
              ],
            },
          ],
        },
      ],
    },
    dawn('n2', 'n2.voice', 30_000, '11:50'),
  ],
  ambient: [{ id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.7)] }],
}

export const night3: Sequence = {
  id: 'n3',
  night: 3,
  start: '02:00',
  spawn: ROOM_SPAWN,
  realSecondsPerGameMinute: 4.5,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n3'),
    {
      id: 'n3.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        phone({
          place: 'table',
          screen: 'lock',
          missed: 24,
          date: 'phone.date_n3',
          work: 'N3-02',
          message: ['N3-08', 'N3-09', 'N3-10'],
          messageSeconds: 14,
          heard: false,
        }),
        at(5000, phone({ screen: 'call', place: 'hand' })),
        at(5000, say('landlord', 'N3-04')),
        at(5000, say('landlord', 'N3-05')),
        at(5000, say('landlord', 'N3-06')),
        at(21_000, phone({ screen: 'off', place: 'table', work: null })),
      ],
    },
    {
      // BEATS n3 #6: the clock moves while nobody looks; a pale rectangle stays behind.
      id: 'n3.clock_moves',
      trigger: on.unseen('clock', 8000),
      actions: [{ type: 'object', id: 'clock', change: 'shifted' }],
    },
    {
      // BEATS n3 #14: one knock from inside the wardrobe.
      id: 'n3.wardrobe_knock',
      trigger: on.idle(10_000),
      when: not(isFlag('power_off')),
      actions: [sound('knock_soft', 'wardrobe', 0.6)],
    },
    ...phoneBeats('n3', 'mom_msg_3', 14),
    diaryPage('n3', 3, 'bread_bin'),
    diaryPage('n3', 4, 'floor_rug'),
    teaBeat('n3'),
    ...sofaBeats('n3'),
    powerCut('n3'),
    {
      id: 'n3.cough',
      trigger: on.after('n3.317', 7000),
      actions: [sound('cough', 'party_wall', 0.7), { type: 'sanity', delta: -5 }],
    },
    {
      id: 'n3.voice',
      trigger: on.after('n3.cough', 3000),
      actions: [
        {
          type: 'if',
          when: isFlag('n1_response', 'answer'),
          then: [say('voice', 'N3-11a.1', 'party_wall'), say('voice', 'N3-11a.2', 'party_wall')],
          else: [
            {
              type: 'if',
              when: isFlag('n1_response', 'knock'),
              then: [say('voice', 'N3-11c', 'party_wall')],
              else: [
                say('voice', 'N3-11b.1', 'party_wall'),
                say('voice', 'N3-11b.2', 'party_wall'),
              ],
            },
          ],
        },
        {
          type: 'if',
          when: isFlag('heard_sardor'),
          then: [say('voice', 'N3-12a', 'party_wall')],
          else: [say('voice', 'N3-12b', 'party_wall')],
        },
        {
          type: 'if',
          when: has('diary_4'),
          then: [say('voice', 'N3-13a', 'party_wall')],
          else: [say('voice', 'N3-13b', 'party_wall')],
        },
      ],
      waitFor: {
        openAfterMs: 9000,
        windowMs: 20_000,
        flag: 'n3_response',
        answer: {
          target: 'party_wall',
          value: 'answer',
          actions: [
            flag('n3_answered'),
            say('player_spoken', 'N3-14a.1'),
            at(2500, say('voice', 'N3-14a.2', 'party_wall')),
            at(2500, say('voice', 'N3-14a.3', 'party_wall')),
          ],
        },
        silence: { value: 'silent', actions: [say('voice', 'N3-14b', 'party_wall')] },
      },
    },
    dawn('n3', 'n3.voice:resolved', 15_000, '16:40'),
  ],
  ambient: [{ id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.7)] }],
}

export const night4: Sequence = {
  id: 'n4',
  night: 4,
  start: '02:15',
  spawn: ROOM_SPAWN,
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n4'),
    {
      id: 'n4.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        phone({
          place: 'pillow',
          screen: 'off',
          missed: 40,
          date: 'phone.date_n4',
          work: 'N4-01',
          message: ['N4-04', 'N4-05', 'N4-06'],
          messageSeconds: 17,
          heard: false,
        }),
        at(1500, sound('phone_buzz', 'sofa', 0.4)),
      ],
    },
    {
      // BEATS n4 #3: something dragged across the corridor floor.
      id: 'n4.drag',
      trigger: on.after('n4.start', 20_000),
      actions: [
        sound('step_board', [0.1, 0.05, 1.8], 0.5),
        at(700, sound('step_board', [0.0, 0.05, 2.3], 0.4)),
      ],
    },
    {
      // BEATS n4 #6: the radiator gives one hard knock, then nothing for the rest of the night.
      id: 'n4.radiator',
      trigger: on.idle(10_000),
      when: not(isFlag('power_off')),
      actions: [sound('radiator', 'room_radiator', 1)],
    },
    ...phoneBeats('n4', 'mom_msg_4', 17),
    diaryPage('n4', 6, 'floorboard'),
    teaBeat('n4'),
    ...sofaBeats('n4'),
    powerCut('n4'),
    {
      id: 'n4.step',
      trigger: on.after('n4.317', 7000),
      actions: [sound('step_concrete', [0.3, 0.05, 5.6]), { type: 'sanity', delta: -5 }],
    },
    {
      id: 'n4.door_opens',
      trigger: on.after('n4.317', 60_000),
      actions: [
        { type: 'door', id: 'front_door', state: 'ajar' },
        { type: 'door', id: 'door48', state: 'ajar' },
        sound('door_open', 'front_door', 0.6),
      ],
    },
    diaryPage('n4', 5, 'chair48'),
    {
      id: 'n4.voice48',
      trigger: on.zone('room48', 2000),
      when: isFlag('power_off'),
      actions: [
        { type: 'sanity', delta: -10 },
        flag('entered_48'),
        say('voice', 'N4-09', 'chair48'),
        say('voice', 'N4-10', 'chair48'),
        {
          type: 'if',
          when: isFlag('heard_sardor'),
          then: [
            flag('n4_spoke', 'sardor'),
            say('player_spoken', 'N4-11a.1'),
            say('voice', 'N4-11a.2', 'chair48'),
            say('voice', 'N4-11a.3', 'chair48'),
          ],
          else: [
            {
              type: 'if',
              when: has('mom_msg_3'),
              then: [
                flag('n4_spoke', 'where'),
                say('player_spoken', 'N4-11b.1'),
                say('voice', 'N4-11b.2', 'chair48'),
                say('voice', 'N4-11b.3', 'chair48'),
              ],
              else: [flag('n4_spoke', 'none'), say('voice', 'N4-11c', 'chair48')],
            },
          ],
        },
      ],
    },
    {
      // Never left 47: the voice speaks at the open door instead.
      id: 'n4.voice_door',
      trigger: on.after('n4.door_opens', 90_000),
      when: not(isFlag('entered_48')),
      actions: [
        say('voice', 'N4-09', 'front_door'),
        say('voice', 'N4-10', 'front_door'),
        flag('n4_spoke', 'none'),
      ],
    },
    { ...dawn('n4', 'n4.voice48', 45_000, '12:10'), id: 'n4.dawn' },
    { ...dawn('n4', 'n4.voice_door', 25_000, '12:10'), id: 'n4.dawn_door' },
  ],
  ambient: [{ id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.7)] }],
}

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
  spawn: ROOM_SPAWN,
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n5'),
    {
      id: 'n5.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        { type: 'door', id: 'door48', state: 'ajar' },
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
    {
      // 48's television murmurs through the wall for a while (BEATS night 5, beat 8).
      id: 'n5.tv48',
      trigger: on.idle(10_000),
      actions: [sound('static', 'party_wall', 0.25), at(6000, sound('static', 'party_wall', 0.2))],
    },
    ...phoneBeats('n5', 'mom_msg_5', 12),
    {
      id: 'n5.clock_off',
      trigger: on.use('clock'),
      when: not(isFlag('clock_in_hand')),
      actions: [flag('clock_in_hand'), { type: 'object', id: 'clock', change: 'in_hand' }],
    },
    diaryPage('n5', 7, 'clock_wall', isFlag('clock_in_hand')),
    teaBeat('n5'),
    ...sofaBeats('n5'),
    {
      ...powerCut('n5'),
      actions: [
        ...powerCut('n5').actions,
        { type: 'clockFreeze', on: true },
        phone({ screen: 'dead' }),
      ],
    },
    {
      id: 'n5.knocks',
      trigger: on.after('n5.317', 8000),
      actions: [
        sound('knock_soft', 'party_wall'),
        at(1400, sound('knock_soft', 'party_wall')),
        at(2800, sound('knock_soft', 'party_wall')),
      ],
    },
    {
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
      // Time holds at 3:17 until the player acts; the knocks slowly change.
      id: 'n5.hold',
      trigger: on.every(45_000),
      once: false,
      when: isFlag('open_the_door'),
      actions: [
        sound('knock_soft', 'party_wall', 0.7),
        at(2000, say('voice', 'N5-07', 'party_wall')),
      ],
    },
    ...FLAT48.map((zone): Beat => ({
      id: `n5.ending_a_${zone}`,
      trigger: on.zone(zone),
      when: isFlag('open_the_door'),
      actions: [{ type: 'ending', id: 'A' }],
    })),
    {
      id: 'n5.ending_b',
      trigger: on.zone('stairs_down'),
      when: any(isFlag('front_open'), isFlag('door_unchained')),
      actions: [{ type: 'ending', id: 'B' }],
    },
    {
      id: 'n5.open_front',
      trigger: on.use('front_door'),
      once: false,
      cooldownMs: 1000,
      when: not(isFlag('front_open')),
      actions: [
        flag('front_open'),
        { type: 'door', id: 'front_door', state: 'open' },
        sound('chain', 'front_door'),
      ],
    },
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
      when: isFlag('clock_in_hand'),
      actions: [sound('clock_tick', 'clock', 0.4)],
    },
  ],
  ambient: [],
}
