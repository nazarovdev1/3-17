import { build, say } from './build'
import { ENDING_C_CONDITION, flag, haptic, item, phoneNodes, sanity, sfx } from './features'

/**
 * Night 5 — "3:17". The last message ("eshigimiz ochiq"), the clock's keyhole and the brass
 * key, Sardor's last page. At 3:17 the voice quotes the player's own words; three endings.
 */
export const night5Nodes = build('night-5', [
  {
    id: 'n5_start',
    night: 5,
    location: 'room',
    checkpoint: true,
    mobile: { vignette: 'room' },
    lines: [say('narrator', 'l1'), say('narrator', [{ flag: 'entered_48' }, 'l2_kirgan'], 'l2')],
    next: 'n5_hub',
  },
  {
    id: 'n5_hub',
    night: 5,
    location: 'room',
    mobile: { vignette: 'room', hotspots: ['clock', 'front_door', 'window', 'carpet'] },
    lines: [say('narrator', 'l1')],
    choices: [
      { id: 'clock', to: 'n5_clock', when: { not: { flag: 'clock_examined' } } },
      { id: 'chain', to: 'n5_chain', when: { not: { flag: 'chain_checked' } } },
      {
        id: 'carpet',
        to: 'n5_diary7',
        when: { all: [{ flag: 'clock_examined' }, { not: { flag: 'found_diary7' } }] },
      },
      { id: 'phone', to: 'n5_phone', when: { not: { hasItem: 'mom_msg_5' } } },
      { id: 'leave_early', to: 'endB', effects: [sfx('chain'), sfx('door_open')] },
      { id: 'tea', to: 'n5_tea', when: { not: { flag: 'tea_n5' } } },
      { id: 'stay', to: 'n5_316' },
    ],
  },
  ...phoneNodes(5, 'n5_hub', {
    phone: [say('narrator', 'l1')],
    message: [say('mother', 'l1'), say('mother', 'l2'), say('narrator', 'l3')],
  }),
  {
    id: 'n5_tea',
    night: 5,
    location: 'kitchen',
    onEnter: [flag('tea_n5', true), sfx('kettle'), sanity(6)],
    desktop: { trigger: 'interact', objectId: 'kettle' },
    mobile: { vignette: 'kitchen', hotspots: ['kettle'] },
    lines: [say('narrator', [{ flag: 'took_bundle' }, 'l1_tugun'], 'l1'), say('narrator', 'l2')],
    next: 'n5_hub',
  },
  {
    id: 'n5_clock',
    night: 5,
    location: 'room',
    onEnter: [flag('clock_examined', true), sfx('clock_tick')],
    desktop: { trigger: 'interact', objectId: 'clock' },
    mobile: { vignette: 'room', hotspots: ['clock'] },
    lines: [say('narrator', 'l1'), say('narrator', 'l2'), say('narrator', 'l3')],
    next: 'n5_hub',
  },
  {
    id: 'n5_chain',
    night: 5,
    location: 'corridor',
    onEnter: [flag('chain_checked', true), sfx('chain')],
    desktop: { trigger: 'interact', objectId: 'front_door' },
    mobile: { vignette: 'corridor', hotspots: ['front_door'] },
    lines: [
      say('narrator', 'l1'),
      say('narrator', [{ profile: 'doorAtNight', eq: 'ochiq' }, 'l2_ochiq'], 'l2'),
      say('narrator', 'l3'),
    ],
    next: 'n5_hub',
  },
  {
    id: 'n5_diary7',
    night: 5,
    location: 'room',
    onEnter: [item('diary_7'), flag('found_diary7', true), sfx('page')],
    mobile: { vignette: 'room', hotspots: ['carpet'] },
    lines: [say('narrator', 'l1'), say('diary', 'l2'), say('diary', 'l3')],
    next: 'n5_hub',
  },
  {
    id: 'n5_316',
    night: 5,
    location: 'room',
    onEnter: [flag('time', '3:16'), sfx('window_dark')],
    desktop: { trigger: 'scripted', eventId: 'windows_dark' },
    mobile: { vignette: 'window', hotspots: ['opposite_building'] },
    lines: [say('narrator', 'l1'), say('narrator', 'l2')],
    next: 'n5_317',
  },
  {
    id: 'n5_317',
    night: 5,
    location: 'room',
    onEnter: [flag('time', '3:17'), sfx('fridge_stop'), haptic('medium')],
    desktop: { trigger: 'scripted', eventId: 'power_cut' },
    mobile: { vignette: 'room_dark' },
    lines: [say('narrator', 'l1'), say('narrator', 'l2'), say('narrator', 'l3')],
    next: 'n5_voice_final',
  },
  {
    id: 'n5_voice_final',
    night: 5,
    location: 'room',
    onEnter: [sfx('knock_soft'), haptic('knock'), sanity(-6)],
    desktop: { trigger: 'scripted', eventId: 'knocks' },
    mobile: { vignette: 'wall', overlay: 'chat' },
    lines: [
      say(
        'voice',
        [{ flag: 'draft_written' }, 'l1_qoralama'],
        [{ flag: 'n1_reaction', eq: 'javob' }, 'l1_javob'],
        'l1',
      ),
      say(
        'voice',
        [{ flag: 'asked_sardor' }, 'l2_sardor'],
        [{ flag: 'asked_why' }, 'l2_qayerdan'],
        'l2',
      ),
      say('voice', 'l3'),
    ],
    next: 'n5_final_choice',
  },
  {
    id: 'n5_final_choice',
    night: 5,
    location: 'room',
    mobile: { vignette: 'room_dark' },
    lines: [
      say('narrator', 'l1'),
      say('narrator', 'l2'),
      say('narrator', [{ flag: 'clock_examined' }, 'l3_soat'], 'l3'),
    ],
    choices: [
      {
        id: 'open48',
        to: 'endA',
        effects: [sanity(-10), sfx('door_open'), haptic('heavy')],
      },
      { id: 'leave', to: 'endB', effects: [sfx('chain'), sfx('door_open')] },
      { id: 'wind', to: 'endC', when: ENDING_C_CONDITION, effects: [sfx('clock_tick')] },
    ],
  },
])
