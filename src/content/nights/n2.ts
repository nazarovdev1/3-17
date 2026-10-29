import type { Beat, Sequence, TimedAction } from '@/core/director/types'
import { subtitleMs } from '@/core/director/director'
import { wordsOf } from '@/content/text'
import { all, at, flag, isFlag, not, on, phone, say, sound } from './build'
import {
  diaryPage,
  dawn,
  flatBeats,
  motherCall,
  phoneBeats,
  pillowPhone,
  powerCut,
  resetNightFlags,
  windowsGoOut,
} from './common'

/**
 * Night 2 — Devor (docs/BEATS.md). A day first: the player wakes on the sofa in daylight,
 * goes down for bread and meets Muhabbat opa at 43 on the 3rd floor (owner decision 8).
 * She talks while the player stays; walking off cuts her short. If the player never goes
 * down, she climbs up and talks through 47's door. Then night, 3:17 and the voice that
 * knows the rental form.
 */
const MUHABBAT_ZONES = ['by_43']
const NIGHT = isFlag('night_started_n2')

/**
 * Her story in three stages (BEATS night 2 #5): each goes on only while the player stays
 * near 43. Walking off hushes her mid-sentence.
 */
function muhabbatStages(
  prefix: string,
  stages: { lines: string[]; set?: TimedAction[] }[],
  start: string,
  from: string,
  onlyIn?: string[],
): Beat[] {
  let previous = start
  let gap = 1200
  return stages.map(({ lines, set = [] }, i) => {
    const beat: Beat = {
      id: `${prefix}_${i + 1}`,
      trigger: on.after(previous, gap),
      when: not(isFlag('muhabbat_done')),
      onlyIn,
      actions: [...lines.map((line) => say('muhabbat', line, from)), ...set],
    }
    previous = beat.id
    gap = lines.reduce((sum, line) => sum + subtitleMs(wordsOf(line)) + 300, 0) + 900
    return beat
  })
}

const STAGES = [
  { lines: ['N2-02', 'N2-03', 'N2-04', 'N2-05'] },
  { lines: ['N2-06', 'N2-07', 'N2-08'], set: [flag('heard_48')] },
  { lines: ['N2-09', 'N2-10', 'N2-11', 'N2-12', 'N2-13'], set: [flag('heard_sardor')] },
]

const stageMs = (lines: string[]) =>
  lines.reduce((sum, line) => sum + subtitleMs(wordsOf(line)) + 300, 0) + 600

/** She says goodbye (N2-14) and shuts 43; or, at 47, leaves the halva on the threshold. */
const goodbye = (from: string, extra: TimedAction[] = []): TimedAction[] => [
  flag('muhabbat_done'),
  say('muhabbat', 'N2-14', from),
  at(4200, { type: 'object', id: 'muhabbat', change: 'gone' }),
  at(4200, sound('door_close', from, 0.6)),
  ...extra,
]

const talkAt43 = muhabbatStages('n2.m', STAGES, 'n2.m_open', 'muhabbat', MUHABBAT_ZONES)
const talkAt47 = muhabbatStages(
  'n2.m47',
  [{ lines: ['N2-02', 'N2-03', 'N2-05'] }],
  'n2.m_climbs',
  'front_door',
)

/** Into night 2 (02:05): from wherever the player is, back in the room. */
const intoTheNight: TimedAction[] = [
  { type: 'fade', to: 'black', ms: 2000 },
  at(2200, flag('n2_day', false)),
  at(2200, flag('night_started_n2')),
  at(2200, { type: 'daylight', on: false }),
  at(2200, { type: 'scene', scene: 'flat' }),
  at(2200, { type: 'setClock', at: '02:05' }),
  at(2200, { type: 'place', position: [0.6, 1.6, -0.6], yaw: 0 }),
  at(2200, { type: 'light', id: 'flat_room', state: 'on' }),
  at(2200, { type: 'object', id: 'room_window', change: 'frost' }),
  at(2200, { type: 'object', id: 'muhabbat', change: 'gone' }),
  at(2200, { type: 'door', id: 'bath_door', state: 'closed' }),
  at(
    2200,
    phone({
      place: 'table',
      screen: 'off',
      missed: 11,
      message: ['N2-16', 'N2-17'],
      messageSeconds: 19,
      heard: false,
    }),
  ),
  at(2600, { type: 'fade', to: 'clear', ms: 2000 }),
]

export const night2: Sequence = {
  id: 'n2',
  night: 2,
  start: '13:20',
  // On the sofa's edge, eyes on the ceiling: they slept in their clothes.
  spawn: { position: [-0.78, 1.6, -1.75], yaw: -Math.PI / 2 },
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [45_000, 80_000],
  beats: [
    resetNightFlags('n2'),
    {
      id: 'n2.start',
      trigger: on.start(),
      actions: [
        flag('n2_day'),
        { type: 'daylight', on: true },
        { type: 'scene', scene: 'day' },
        { type: 'camera', effect: 'lookDown' },
        ...['room', 'kitchen', 'bath', 'hall'].map((circuit): TimedAction => ({
          type: 'light',
          id: `flat_${circuit}`,
          state: 'off',
        })),
        { type: 'object', id: 'bread_bag', change: 'sill' },
        { type: 'object', id: 'halva', change: 'hand' },
        // The phone slid off the chest onto the cushion.
        flag('phone_pillow'),
        phone({
          place: 'pillow',
          screen: 'off',
          missed: 6,
          date: 'phone.date_n2',
          message: null,
          heard: false,
          draft: 'none',
        }),
        at(1200, sound('cloth', 'pillow', 0.5)),
      ],
    },
    pillowPhone('n2'),
    ...phoneBeats('n2', 'mom_msg_2', 19),
    {
      // Empty: only crumbs.
      id: 'n2.bread_bin',
      trigger: on.use('bread_bin'),
      when: isFlag('n2_day'),
      actions: [sound('door_close', 'bread_bin', 0.35)],
    },
    {
      id: 'n2.bread',
      trigger: on.use('bread_bag'),
      actions: [
        { type: 'item', id: 'bread' },
        { type: 'object', id: 'bread_bag', change: 'taken' },
        sound('cloth', 'bread_bag', 0.7),
      ],
    },
    // Muhabbat opa: 43 opens on its chain as the player comes down to her landing.
    {
      id: 'n2.m_open',
      trigger: on.zone('by_43'),
      when: all(isFlag('n2_day'), not(isFlag('muhabbat_talking'))),
      actions: [
        flag('muhabbat_talking'),
        sound('chain', 'muhabbat', 0.6),
        at(300, sound('door_open', 'muhabbat', 0.5)),
        at(300, { type: 'object', id: 'muhabbat', change: 'chain' }),
      ],
    },
    ...talkAt43,
    {
      id: 'n2.m_end',
      trigger: on.after(talkAt43[talkAt43.length - 1]!.id, stageMs(STAGES[2]!.lines)),
      when: not(isFlag('muhabbat_done')),
      actions: goodbye('muhabbat'),
    },
    {
      // Walking off up the stairs: she stops mid-story and calls after them, once.
      id: 'n2.m_left',
      trigger: on.after('n2.m_open', 2000),
      notIn: [...MUHABBAT_ZONES, 'landing3'],
      when: all(isFlag('muhabbat_talking'), not(isFlag('muhabbat_done'))),
      actions: [{ type: 'hush' }, ...goodbye('muhabbat')],
    },
    {
      // Over her shoulder, down the stairwell: the figure on the half-landing below, once.
      id: 'n2.figure',
      trigger: on.gaze('stair_gap', 300),
      when: all(isFlag('muhabbat_talking'), not(isFlag('muhabbat_done'))),
      actions: [
        { type: 'figure', placement: 'below', ms: 2000 },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      id: 'n2.halva',
      trigger: on.use('halva'),
      when: isFlag('muhabbat_talking'),
      actions: [
        { type: 'item', id: 'halva' },
        { type: 'object', id: 'halva', change: 'taken' },
        sound('cloth', 'halva', 0.5),
      ],
    },
    // Nobody came down: she climbs to 47, knocks and talks through the door.
    {
      id: 'n2.m_climbs',
      trigger: on.after('n2.start', 45_000),
      notIn: ['stairwell'],
      when: all(isFlag('n2_day'), not(isFlag('muhabbat_talking'))),
      actions: [
        flag('muhabbat_talking'),
        ...[0, 520, 1040, 1560, 2080].map((ms, i) =>
          at(ms, sound('step_concrete', [1.6, 0.05 - (4 - i) * 0.3, 8.6 - i * 0.4], 0.7)),
        ),
        at(3400, sound('knock', 'front_door', 0.7)),
      ],
    },
    ...talkAt47,
    {
      id: 'n2.m47_end',
      trigger: on.after(talkAt47[0]!.id, stageMs(['N2-02', 'N2-03', 'N2-05'])),
      when: not(isFlag('muhabbat_done')),
      actions: goodbye('front_door', [
        { type: 'object', id: 'halva', change: 'threshold' },
        ...stepsAway(5000),
      ]),
    },
    {
      id: 'n2.halva_47',
      trigger: on.use('halva_47'),
      actions: [
        { type: 'item', id: 'halva' },
        { type: 'object', id: 'halva', change: 'taken' },
        sound('cloth', 'halva_47', 0.5),
      ],
    },
    // Back in the room, or half a minute after she has gone: a slow blink, and it is night.
    {
      id: 'n2.night',
      trigger: on.zone('room', 2500),
      when: all(isFlag('n2_day'), isFlag('muhabbat_done')),
      actions: intoTheNight,
    },
    {
      id: 'n2.night_late',
      trigger: on.after('n2.m_end', 30_000),
      when: isFlag('n2_day'),
      actions: intoTheNight,
    },
    {
      id: 'n2.night_left',
      trigger: on.after('n2.m_left', 30_000),
      when: isFlag('n2_day'),
      actions: intoTheNight,
    },
    {
      id: 'n2.night_47',
      trigger: on.after('n2.m47_end', 30_000),
      when: isFlag('n2_day'),
      actions: intoTheNight,
    },
    // Night.
    {
      id: 'n2.draft',
      trigger: on.after('n2.message', 19_500),
      when: isFlag('night_started_n2'),
      actions: [phone({ draft: 'shown', screen: 'draft' })],
    },
    {
      id: 'n2.send',
      trigger: on.use('phone_send'),
      when: isFlag('phone_up'),
      actions: [flag('draft_sent'), phone({ draft: 'sent', screen: 'lock' })],
    },
    {
      id: 'n2.wardrobe',
      trigger: on.use('wardrobe'),
      when: all(isFlag('night_started_n2'), not(isFlag('wardrobe_open'))),
      actions: [
        flag('wardrobe_open'),
        { type: 'object', id: 'wardrobe', change: 'open' },
        sound('door_open', 'wardrobe', 0.5),
      ],
    },
    diaryPage('n2', 1, 'coat_pocket', isFlag('wardrobe_open')),
    diaryPage('n2', 2, 'bathtub', isFlag('night_started_n2')),
    {
      // Turn back: the bathroom door stands ajar.
      id: 'n2.bath_door',
      trigger: on.unseen('bath_door', 3000),
      when: isFlag('night_started_n2'),
      actions: [{ type: 'door', id: 'bath_door', state: 'ajar' }],
    },
    {
      id: 'n2.cabinet',
      trigger: on.unseen('mirror_cabinet', 4000),
      when: all(isFlag('night_started_n2'), not(isFlag('power_off'))),
      actions: [{ type: 'object', id: 'mirror_cabinet', change: 'open' }],
    },
    {
      // Slow footsteps across the empty flat above.
      id: 'n2.above',
      trigger: on.clock('02:30'),
      onlyIn: ['room'],
      when: isFlag('night_started_n2'),
      actions: [0, 900, 1800, 2700, 3600, 4500].map((ms, i) =>
        at(ms, sound('step_wood', [-1.6 + i * 0.5, 2.75, -2.6 + i * 0.45], 0.45)),
      ),
    },
    {
      id: 'n2.near_wall',
      trigger: on.zone('room_west'),
      when: isFlag('night_started_n2'),
      actions: [flag('near_wall_n2')],
    },
    {
      // 48's television through the wall; it stops when the player comes close.
      id: 'n2.tv48',
      trigger: on.clock('02:50'),
      when: isFlag('night_started_n2'),
      actions: [0, 4000, 8000, 12_000, 16_000].map((ms) =>
        at(ms, {
          type: 'if',
          when: not(isFlag('near_wall_n2')),
          then: [sound('static', 'party_wall', 0.22)],
        }),
      ),
    },
    ...flatBeats('n2'),
    // The day is 13:20: the night's clock beats wait for the night itself.
    { ...motherCall('n2', '02:40', 12), when: all(NIGHT, not(isFlag('power_off'))) },
    { ...windowsGoOut('n2', 'floorByFloor'), when: NIGHT },
    powerCut('n2'),
    {
      id: 'n2.knocks',
      trigger: on.after('n2.317', 7000),
      actions: [
        sound('knock_triple', 'party_wall'),
        { type: 'haptic', pattern: 'knock' },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      // Three lines, the form's answers in them; no response window.
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
        at(4000, {
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
        }),
        at(8000, {
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
        }),
        at(9000, flag('n2_voice_done')),
      ],
    },
    {
      // Listening at the wall afterwards: breathing right there, then one tap where the ear is.
      id: 'n2.ear',
      trigger: on.hold('party_wall', 2500),
      when: isFlag('n2_voice_done'),
      actions: [
        sound('knock_soft', 'party_wall', 0.35),
        { type: 'haptic', pattern: 'knock' },
        { type: 'sanity', delta: -3 },
      ],
    },
    dawn('n2', 'n2.voice', 30_000, '11:50', 12),
  ],
  ambient: [
    { id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.5)] },
    { id: 'pipes', actions: [sound('pipes', 'bath_sink', 0.5)] },
    { id: 'car_door', actions: [sound('door_close', [6.0, -8.0, -20.0], 0.3)] },
  ],
}

/** Her slippers going back down to the 3rd floor. */
function stepsAway(startMs: number): TimedAction[] {
  return [0, 600, 1200, 1800].map((ms, i) =>
    at(startMs + ms, sound('step_concrete', [1.6, -0.2 - i * 0.35, 7.6 + i * 0.5], 0.6 - i * 0.1)),
  )
}
