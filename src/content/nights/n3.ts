import type { Sequence } from '@/core/director/types'
import { all, at, flag, has, isFlag, not, on, phone, say, sound } from './build'
import {
  dawn,
  diaryPage,
  flatBeats,
  motherCall,
  phoneBeats,
  powerCut,
  resetNightFlags,
  windowsGoOut,
  ambientBed,
} from './common'

/**
 * Night 3 — Takror (docs/BEATS.md). The flat lies: the tap runs, the coat moves to the
 * hooks, the clock changes walls, the corridor grows while the player looks away, the TV
 * shows this room with someone on the sofa. At 3:17 no knocks: a cough, and the voice,
 * close, now saying "sen".
 */
export const night3: Sequence = {
  id: 'n3',
  night: 3,
  start: '02:00',
  spawn: { position: [0.6, 1.6, -0.6], yaw: 0 },
  realSecondsPerGameMinute: 4.5,
  ambientEveryMs: [28_000, 48_000],
  beats: [
    resetNightFlags('n3'),
    {
      id: 'n3.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        { type: 'object', id: 'opposite', change: 'one_lit' },
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
        // Rustam aka calls; the phone rises into view and answers by itself.
        at(5000, sound('phone_buzz', 'phone', 0.7)),
        at(5600, phone({ screen: 'call', place: 'hand' })),
        at(6000, say('landlord', 'N3-04')),
        at(6000, say('landlord', 'N3-05')),
        at(6000, say('landlord', 'N3-06')),
        at(21_600, phone({ screen: 'off', place: 'table', work: null })),
      ],
    },
    ...phoneBeats('n3', 'mom_msg_3', 14),
    // The clock times the flat's tricks (BEATS: after 02:20, after 02:25, 02:30–02:50).
    { id: 'n3.0220', trigger: on.clock('02:20'), actions: [flag('n3_0220')] },
    { id: 'n3.0225', trigger: on.clock('02:25'), actions: [flag('n3_0225')] },
    { id: 'n3.0230', trigger: on.clock('02:30'), actions: [flag('n3_0230')] },
    { id: 'n3.0250', trigger: on.clock('02:50'), actions: [flag('n3_0250')] },
    {
      // The bathroom tap runs on its own while nobody is there.
      id: 'n3.tap',
      trigger: on.unseen('bathroom', 10_000),
      when: not(isFlag('power_off')),
      actions: [
        sound('pipes', 'bath_sink', 0.6),
        ...[600, 1300, 1900, 2600, 3200, 3900, 4500].map((ms) =>
          at(ms, sound('drip', 'bath_sink', 0.55)),
        ),
      ],
    },
    {
      // The clock now hangs on the shared wall; a pale circle where it was.
      id: 'n3.clock_moves',
      trigger: on.unseen('clock', 8000),
      when: isFlag('n3_0220'),
      actions: [{ type: 'object', id: 'clock', change: 'shifted' }],
    },
    // The corridor (BEATS n3 #7–8): longer each time the entrance is out of view.
    {
      id: 'n3.loop',
      trigger: on.zone('corridor'),
      when: isFlag('n3_0225'),
      actions: [flag('corridor_loop')],
    },
    {
      id: 'n3.corridor_ran',
      trigger: on.use('corridor_ran'),
      when: all(isFlag('corridor_loop'), not(isFlag('corridor_done'))),
      actions: [
        { type: 'fade', to: 'black', ms: 250 },
        at(400, flag('corridor_done')),
        at(400, { type: 'place', position: [-0.6, 1.6, -0.6], yaw: Math.PI / 2 }),
        at(500, { type: 'fade', to: 'clear', ms: 900 }),
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      id: 'n3.corridor_turned',
      trigger: on.use('corridor_turned'),
      when: all(isFlag('corridor_loop'), not(isFlag('corridor_done'))),
      actions: [
        flag('corridor_done'),
        flag('floorboard_up'),
        { type: 'object', id: 'floorboard', change: 'raised' },
        sound('step_board', 'floorboard', 0.6),
      ],
    },
    diaryPage('n3', 6, 'floorboard', isFlag('floorboard_up')),
    // The TV: this room from the top corner, someone on the sofa turning their head.
    {
      id: 'n3.tv_on',
      trigger: on.use('tv'),
      once: false,
      cooldownMs: 600,
      when: all(not(isFlag('tv_on')), not(isFlag('power_off'))),
      actions: [
        flag('tv_on'),
        {
          type: 'if',
          when: isFlag('tv_seen'),
          then: [{ type: 'object', id: 'tv', change: 'static' }],
          else: [
            { type: 'object', id: 'tv', change: 'cam' },
            { type: 'figure', placement: 'tv_sofa', ms: 40_000 },
          ],
        },
        sound('static', 'tv', 0.5),
      ],
    },
    {
      // The real sofa is empty; back at the TV only static.
      id: 'n3.tv_sofa',
      trigger: on.gaze('sofa', 500),
      when: isFlag('tv_on'),
      actions: [
        flag('tv_seen'),
        { type: 'figure', placement: null },
        { type: 'object', id: 'tv', change: 'static' },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      id: 'n3.tv_off',
      trigger: on.use('tv'),
      once: false,
      cooldownMs: 600,
      when: isFlag('tv_on'),
      actions: [
        flag('tv_on', false),
        flag('tv_seen'),
        { type: 'figure', placement: null },
        { type: 'object', id: 'tv', change: 'reflect' },
      ],
    },
    diaryPage('n3', 3, 'bread_bin'),
    diaryPage('n3', 4, 'floor_rug'),
    {
      // Opposite, 4th floor: someone stands in the lit window. Gone on the next look.
      id: 'n3.someone',
      trigger: on.gaze('room_window', 800),
      when: all(isFlag('n3_0230'), not(isFlag('n3_0250'))),
      actions: [flag('someone_seen'), { type: 'object', id: 'opposite', change: 'standing' }],
    },
    {
      id: 'n3.someone_gone',
      trigger: on.unseen('room_window', 1200),
      when: isFlag('someone_seen'),
      actions: [{ type: 'object', id: 'opposite', change: 'one_lit' }],
    },
    {
      // One knock from inside the wardrobe.
      id: 'n3.wardrobe_knock',
      trigger: on.idle(10_000),
      onlyIn: ['room', 'corridor'],
      when: not(isFlag('power_off')),
      actions: [sound('knock_soft', 'wardrobe', 0.6)],
    },
    ...flatBeats('n3', { tv: false }),
    motherCall('n3', '02:45', 30),
    windowsGoOut('n3', 'floorByFloor'),
    powerCut('n3', [
      { type: 'figure', placement: null },
      { type: 'object', id: 'tv', change: 'off' },
    ]),
    {
      // No knocks tonight. A cough behind the wall, close.
      id: 'n3.cough',
      trigger: on.after('n3.317', 7000),
      actions: [sound('cough', 'party_wall', 0.8), { type: 'sanity', delta: -5 }],
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
            { type: 'sanity', delta: -5 },
            at(2500, say('voice', 'N3-14a.2', 'party_wall')),
            at(2500, say('voice', 'N3-14a.3', 'party_wall')),
          ],
        },
        silence: { value: 'silent', actions: [say('voice', 'N3-14b', 'party_wall')] },
      },
    },
    {
      // The shared wall is warm: a palm of breath fades on the wallpaper.
      id: 'n3.palm',
      trigger: on.after('n3.voice:resolved', 15_000),
      actions: [{ type: 'object', id: 'party_wall', change: 'palm' }],
    },
    // Dusk, the wrong time of day: already dark outside at 16:40.
    dawn('n3', 'n3.palm', 10_000, '16:40', 31, [{ type: 'daylight', on: false }]),
  ],
  ambient: [
    { id: 'pipes', actions: [sound('pipes', 'bath_sink', 0.5)] },
    { id: 'radiator', actions: [sound('radiator', 'room_radiator', 0.6)] },
    { id: 'chair_above', actions: [sound('step_wood', [-0.4, 2.75, -1.6], 0.4)] },
    ...ambientBed('n3'),
  ],
}
