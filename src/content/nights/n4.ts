import type { Beat, Sequence, TimedAction } from '@/core/director/types'
import { all, at, flag, has, isFlag, not, on, phone, say, sound } from './build'
import {
  FLAT48,
  dawn,
  diaryPage,
  flatBeats,
  phoneBeats,
  pillowPhone,
  powerCut,
  resetNightFlags,
  windowsGoOut,
  ambientBed,
} from './common'

/**
 * Night 4 — 48 (docs/BEATS.md). After 3:17 one step on the landing; feet in the light
 * under the door; the figure in the peephole and wet footprints to 48. The door opens by
 * itself; the parcel from home waits on the threshold; 48 stands open. Inside, the decayed
 * copy of 47, the crossed-out calendar, the player's own passport, and the voice in the
 * mother's words. Retreating and chaining the door is a choice too.
 */
const VOICE_48 = 'party_wall48'

/** What the player says walking toward the voice, chosen by what they know (REDESIGN §3). */
const spokenToTheVoice: TimedAction = {
  type: 'if',
  when: isFlag('heard_sardor'),
  then: [
    flag('n4_spoke', 'sardor'),
    say('player_spoken', 'N4-11a.1'),
    say('voice', 'N4-11a.2', VOICE_48),
    say('voice', 'N4-11a.3', VOICE_48),
  ],
  else: [
    {
      type: 'if',
      when: has('mom_msg_3'),
      then: [
        flag('n4_spoke', 'where'),
        say('player_spoken', 'N4-11b.1'),
        say('voice', 'N4-11b.2', VOICE_48),
        say('voice', 'N4-11b.3', VOICE_48),
      ],
      else: [flag('n4_spoke', 'none'), say('voice', 'N4-11c', VOICE_48)],
    },
  ],
}

/** Morning: the night ends one way only. */
const ending = (id: string, after: string, delayMs: number): Beat => ({
  ...dawn('n4', after, delayMs, '12:10', 41),
  id,
  when: not(isFlag('n4_dawn')),
  actions: [flag('n4_dawn'), ...dawn('n4', after, delayMs, '12:10', 41).actions],
})

export const night4: Sequence = {
  id: 'n4',
  night: 4,
  start: '02:15',
  spawn: { position: [0.6, 1.6, -0.6], yaw: 0 },
  realSecondsPerGameMinute: 4,
  ambientEveryMs: [18_000, 32_000],
  beats: [
    resetNightFlags('n4'),
    {
      id: 'n4.start',
      trigger: on.start(),
      actions: [
        { type: 'scene', scene: 'flat' },
        { type: 'object', id: 'opposite', change: 'one_lit' },
        // The phone buzzes under the pillow.
        flag('phone_pillow'),
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
        at(1500, sound('phone_buzz', 'pillow', 0.45)),
        at(3500, sound('phone_buzz', 'pillow', 0.45)),
        // Diary 6 under the raised board, if night 3 did not give it up.
        {
          type: 'if',
          when: not(has('diary_6')),
          then: [flag('floorboard_up'), { type: 'object', id: 'floorboard', change: 'raised' }],
        },
      ],
    },
    pillowPhone('n4'),
    ...phoneBeats('n4', 'mom_msg_4', 17),
    {
      // Something dragged across the corridor floor.
      id: 'n4.drag',
      trigger: on.after('n4.start', 20_000),
      onlyIn: ['room'],
      actions: [
        sound('step_board', [0.1, 0.05, 1.8], 0.5),
        at(700, sound('step_board', [0.0, 0.05, 2.3], 0.4)),
        at(1300, sound('step_board', [0.05, 0.05, 2.7], 0.3)),
      ],
    },
    diaryPage('n4', 6, 'floorboard', isFlag('floorboard_up')),
    {
      // The radiator gives one hard knock, then nothing for the rest of the night.
      id: 'n4.radiator_knock',
      trigger: on.idle(10_000),
      when: not(isFlag('power_off')),
      actions: [sound('radiator', 'room_radiator', 1), flag('radiator_dead')],
    },
    windowsGoOut('n4', 'allAtOnce'),
    powerCut('n4'),
    {
      // One step on the landing concrete, right outside 47.
      id: 'n4.step',
      trigger: on.after('n4.317', 7000),
      actions: [sound('step_concrete', [0.3, 0.05, 5.2]), { type: 'sanity', delta: -5 }],
    },
    {
      // Feet in the light under the door; they go once looked at long enough.
      id: 'n4.feet',
      trigger: on.after('n4.step', 600),
      actions: [{ type: 'figure', placement: 'under_door', ms: 60_000 }],
    },
    {
      id: 'n4.feet_gone',
      trigger: on.gaze('front_door', 1500),
      when: all(isFlag('power_off'), not(isFlag('peeped'))),
      actions: [
        { type: 'figure', placement: null },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      // At the peephole: by the stairs, back turned. Look away and back: gone, wet prints.
      id: 'n4.peephole',
      trigger: on.use('peephole'),
      when: all(isFlag('power_off'), not(isFlag('peeped'))),
      actions: [
        flag('peeped'),
        flag('saw_figure'),
        { type: 'figure', placement: 'peephole', ms: 9000 },
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      // The latch clicks; the entrance swings ajar by itself. Cold comes in.
      id: 'n4.door_opens',
      trigger: on.after('n4.317', 60_000),
      when: not(isFlag('retreated')),
      actions: [
        sound('chain', 'front_door', 0.4),
        at(400, { type: 'door', id: 'front_door', state: 'ajar' }),
        at(400, sound('door_open', 'front_door', 0.6)),
        at(400, flag('cold_n4')),
        at(400, { type: 'door', id: 'door48', state: 'ajar' }),
        at(400, { type: 'object', id: 'seal', change: 'torn' }),
      ],
    },
    {
      // On the landing: the parcel steams on the threshold; 48 stands ajar, its seal torn.
      id: 'n4.landing',
      trigger: on.zone('door47'),
      when: isFlag('power_off'),
      actions: [
        { type: 'door', id: 'door48', state: 'ajar' },
        { type: 'object', id: 'seal', change: 'torn' },
        flag('cold_n4'),
      ],
    },
    {
      id: 'n4.parcel',
      trigger: on.use('parcel'),
      when: all(isFlag('power_off'), not(isFlag('took_parcel'))),
      actions: [flag('took_parcel'), { type: 'item', id: 'parcel' }, sound('cloth', 'parcel', 0.7)],
    },
    {
      // Back in 47 and chained: from the landing, through the gap, the mother's words.
      id: 'n4.retreat',
      trigger: on.use('chain'),
      when: all(isFlag('power_off'), not(isFlag('entered_48')), not(isFlag('retreated'))),
      actions: [flag('retreated'), flag('chain_on'), sound('chain', 'front_door')],
    },
    {
      id: 'n4.voice_door',
      trigger: on.after('n4.retreat', 30_000),
      when: all(not(isFlag('entered_48')), not(isFlag('n4_spoke'))),
      actions: [
        say('voice', 'N4-09', 'front_door'),
        say('voice', 'N4-10', 'front_door'),
        flag('n4_spoke', 'none'),
      ],
    },
    {
      // Never left 47: the voice at the ajar door instead (3:19:30).
      id: 'n4.voice_ajar',
      trigger: on.after('n4.door_opens', 90_000),
      when: all(not(isFlag('entered_48')), not(isFlag('n4_spoke'))),
      actions: [
        say('voice', 'N4-09', 'front_door'),
        say('voice', 'N4-10', 'front_door'),
        flag('n4_spoke', 'none'),
      ],
    },
    // Inside 48.
    ...FLAT48.map((zone): Beat => ({
      id: `n4.enter_${zone}`,
      trigger: on.zone(zone),
      when: all(isFlag('power_off'), not(isFlag('entered_48'))),
      actions: [flag('entered_48'), { type: 'sanity', delta: -10 }],
    })),
    {
      id: 'n4.calendar',
      trigger: on.use('calendar'),
      once: false,
      cooldownMs: 800,
      actions: [{ type: 'readable', id: 'calendar' }, sound('page', 'calendar', 0.6)],
    },
    {
      id: 'n4.passport',
      trigger: on.use('belongings'),
      once: false,
      cooldownMs: 800,
      actions: [{ type: 'readable', id: 'passport' }, sound('cloth', 'belongings', 0.6)],
    },
    diaryPage('n4', 5, 'chair48', isFlag('entered_48')),
    {
      // Back out on the landing: one knock from inside the dead lift.
      id: 'n4.lift',
      trigger: on.zone('landing'),
      when: isFlag('entered_48'),
      actions: [sound('knock', [-2.6, 1.2, 7.3], 0.6)],
    },
    {
      // In 48's room: a short false glitch, then the voice from inside this room.
      id: 'n4.glitch',
      trigger: on.zone('room48', 3000),
      when: isFlag('power_off'),
      actions: [
        { type: 'fx', id: 'glitch_fake', ms: 600 },
        { type: 'haptic', pattern: 'heavy' },
        sound('static', VOICE_48, 0.7),
        { type: 'sanity', delta: -5 },
      ],
    },
    {
      id: 'n4.voice48',
      trigger: on.after('n4.glitch', 2000),
      actions: [
        flag('voice_in_48'),
        say('voice', 'N4-09', VOICE_48),
        say('voice', 'N4-10', VOICE_48),
      ],
    },
    {
      // Walking toward it (staying in the room): the line that comes from what they know.
      id: 'n4.toward',
      trigger: on.after('n4.voice48', 6500),
      onlyIn: ['room48'],
      when: not(isFlag('n4_spoke')),
      actions: [spokenToTheVoice],
    },
    {
      // Walking away: the voice answers the silence.
      id: 'n4.away',
      trigger: on.after('n4.voice48', 6500),
      notIn: ['room48'],
      when: not(isFlag('n4_spoke')),
      actions: [flag('n4_spoke', 'none'), say('voice', 'N4-11c', VOICE_48)],
    },
    {
      // Home in 47's hall again: lying down, the chain, or a minute ends the night.
      id: 'n4.home',
      trigger: on.zone('hall'),
      when: all(isFlag('entered_48'), isFlag('n4_spoke')),
      actions: [flag('home_n4')],
    },
    ending('n4.dawn_home', 'n4.home', 60_000),
    ending('n4.dawn_48', 'n4.toward', 45_000),
    ending('n4.dawn_away', 'n4.away', 45_000),
    ending('n4.dawn_door', 'n4.voice_door', 25_000),
    ending('n4.dawn_ajar', 'n4.voice_ajar', 25_000),
    // Last, so the chain above (retreat) answers first after 3:17.
    ...flatBeats('n4'),
  ],
  ambient: [
    { id: 'lift', actions: [sound('step_board', [-2.6, -1.0, 7.6], 0.3)] },
    {
      id: 'radiator',
      actions: [sound('radiator', 'room_radiator', 0.6)],
      when: not(isFlag('radiator_dead')),
    },
    { id: 'below_tv', actions: [sound('static', [0.5, -2.2, -1.5], 0.12)] },
    ...ambientBed('n4'),
  ],
}
