import { describe, expect, it } from 'vitest'
import { Director } from '@/core/director/director'
import { STILL, newRun, simulate } from '@/core/director/simulate'
import type { Sequence, Sensors } from '@/core/director/types'
import { SEQUENCES } from '@/content/nights'
import { wordsOf } from '@/content/text'
import { ENDING_C } from '@/content/nights/n2to5'
import { evaluateCondition } from '@/core/director/conditions'

const profile = {
  name: 'Dilnoza',
  livesAlone: 'ha' as const,
  fear: 'qorongʻulik' as const,
  doorAtNight: 'yopiq' as const,
}

const tiny = (
  beats: Sequence['beats'],
  extra: Partial<Sequence> = {},
): Record<string, Sequence> => ({
  t: {
    id: 't',
    night: 1,
    start: '03:00',
    spawn: { position: [0, 1.6, 0], yaw: 0 },
    // One game minute per real minute: easy to reason about.
    realSecondsPerGameMinute: 60,
    beats,
    ambient: [],
    ambientEveryMs: [1e9, 1e9],
    ...extra,
  },
})

describe('Director', () => {
  it('advances the clock by itself and fires clock beats', () => {
    const seq = tiny([
      {
        id: 'a',
        trigger: { type: 'clock', at: '03:01' },
        actions: [{ type: 'flag', key: 'a', value: true }],
      },
    ])
    const { director } = simulate(seq, { start: 't', wordsOf: () => 1, maxMs: 59_000 })
    expect(director.run.flags['a']).toBeUndefined()
    director.tick(1100, STILL)
    expect(director.run.flags['a']).toBe(true)
  })

  it('lying down speeds time eightfold and any movement ends it', () => {
    const seq = tiny([
      {
        id: 'lie',
        trigger: { type: 'interact', target: 'sofa' },
        once: false,
        actions: [{ type: 'timeScale', factor: 8 }],
      },
    ])
    const d = new Director({ sequences: seq, run: newRun(), wordsOf: () => 1 }, 't')
    d.tick(10, STILL)
    d.input({ type: 'interact', target: 'sofa' })
    const before = d.world.clock
    d.tick(1000, STILL)
    // One real second at ×8 is eight seconds of game time.
    expect(d.world.clock - before).toBeCloseTo(8 / 60, 5)
    expect(d.tick(10, { ...STILL, moving: true })).toContainEqual({
      type: 'camera',
      effect: 'sitUp',
    })
    expect(d.world.timeScale).toBe(1)
  })

  it('the night taking time back to normal gets a lying player up', () => {
    const seq = tiny([
      {
        id: 'lie',
        trigger: { type: 'interact', target: 'sofa' },
        actions: [{ type: 'timeScale', factor: 8 }],
      },
      {
        id: 'late',
        trigger: { type: 'clock', at: '03:01' },
        actions: [{ type: 'timeScale', factor: 1 }],
      },
    ])
    const d = new Director({ sequences: seq, run: newRun(), wordsOf: () => 1 }, 't')
    d.tick(10, STILL)
    d.input({ type: 'interact', target: 'sofa' })
    const events = []
    for (let t = 0; t < 20_000; t += 100) events.push(...d.tick(100, STILL))
    expect(d.world.timeScale).toBe(1)
    expect(events).toContainEqual({ type: 'camera', effect: 'sitUp' })
  })

  it('notLooking, gaze, zone dwell and idle triggers need their time', () => {
    const seq = tiny([
      {
        id: 'unseen',
        trigger: { type: 'notLooking', target: 'clock', minMs: 3000 },
        actions: [{ type: 'flag', key: 'unseen', value: true }],
      },
      {
        id: 'gaze',
        trigger: { type: 'gaze', target: 'window', minMs: 1000 },
        actions: [{ type: 'flag', key: 'gaze', value: true }],
      },
      {
        id: 'zone',
        trigger: { type: 'zone', zone: 'hall', dwellMs: 500 },
        actions: [{ type: 'flag', key: 'zone', value: true }],
      },
      {
        id: 'idle',
        trigger: { type: 'idle', ms: 5000 },
        actions: [{ type: 'flag', key: 'idle', value: true }],
      },
    ])
    const d = new Director({ sequences: seq, run: newRun(), wordsOf: () => 1 }, 't')
    const look: Sensors = {
      zones: ['hall'],
      looking: ['window'],
      visible: ['window', 'clock'],
      moving: true,
    }
    for (let i = 0; i < 10; i++) d.tick(100, look)
    expect(d.run.flags['gaze']).toBe(true)
    expect(d.run.flags['zone']).toBe(true)
    expect(d.run.flags['unseen']).toBeUndefined()
    for (let i = 0; i < 31; i++) d.tick(100, { ...look, visible: [], moving: false })
    expect(d.run.flags['unseen']).toBe(true)
    for (let i = 0; i < 20; i++) d.tick(100, STILL)
    expect(d.run.flags['idle']).toBe(true)
  })

  it('a response window resolves by answer, knock or silence', () => {
    const beats: Sequence['beats'] = [
      {
        id: 'v',
        trigger: { type: 'start' },
        actions: [],
        waitFor: {
          openAfterMs: 0,
          windowMs: 20_000,
          flag: 'r',
          answer: { target: 'wall', value: 'answer', actions: [] },
          knock: { target: 'wall', value: 'knock', actions: [] },
          silence: { value: 'silent', actions: [] },
        },
      },
      {
        id: 'after',
        trigger: { type: 'after', beat: 'v:resolved' },
        actions: [{ type: 'flag', key: 'done', value: true }],
      },
    ]
    for (const [input, value] of [
      [{ type: 'interact', target: 'wall' }, 'answer'],
      [{ type: 'knock3', target: 'wall' }, 'knock'],
      [null, 'silent'],
    ] as const) {
      const d = new Director({ sequences: tiny(beats), run: newRun(), wordsOf: () => 1 }, 't')
      d.tick(100, STILL)
      expect(d.world.waiting).toBe('wall')
      if (input) d.input(input)
      for (let i = 0; i < 210; i++) d.tick(100, STILL)
      expect(d.run.flags['r']).toBe(value)
      expect(d.run.flags['done']).toBe(true)
    }
  })

  it('subtitles queue one after another and last 0.6 s + 0.35 s per word', () => {
    const seq = tiny([
      {
        id: 's',
        trigger: { type: 'start' },
        actions: [
          { type: 'say', speaker: 'voice', line: 'A' },
          { type: 'say', speaker: 'voice', line: 'B' },
        ],
      },
    ])
    const d = new Director({ sequences: seq, run: newRun(), wordsOf: () => 4 }, 't')
    d.tick(100, STILL)
    expect(d.world.subtitle?.line).toBe('A')
    for (let i = 0; i < 20; i++) d.tick(100, STILL) // 2.0 s = 0.6 + 4 × 0.35
    expect(d.world.subtitle).toBeNull() // a short breath between lines
    for (let i = 0; i < 4; i++) d.tick(100, STILL)
    expect(d.world.subtitle?.line).toBe('B')
  })

  it('ambient events respect their 3-minute cooldown and stop after the power cut', () => {
    const seq = tiny(
      [
        {
          id: 'cut',
          trigger: { type: 'clock', at: '03:10' },
          actions: [{ type: 'power', on: false }],
        },
      ],
      {
        ambient: [{ id: 'r', actions: [{ type: 'sound', id: 'radiator' }] }],
        ambientEveryMs: [10_000, 10_000],
      },
    )
    const { director } = simulate(seq, {
      start: 't',
      wordsOf: () => 1,
      maxMs: 15 * 60_000,
      stepMs: 200,
    })
    const times = director.log.filter((l) => l.source === 'ambient:r').map((l) => l.t)
    expect(times.length).toBeGreaterThan(1)
    for (let i = 1; i < times.length; i++)
      expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(180_000)
    expect(times.every((t) => t < 10 * 60_000)).toBe(true)
  })

  it('is deterministic for a seed and an input stream', () => {
    const run = () =>
      simulate(SEQUENCES, {
        start: 'n1',
        run: newRun(profile),
        wordsOf,
        maxMs: 8 * 60_000,
        seed: 7,
        script: { inputs: [{ at: 20_000, input: { type: 'form', profile } }] },
      }).director.log.map((l) => `${l.t}:${l.source}:${l.action.type}`)
    expect(run()).toEqual(run())
  })

  it('applies actions in order: sanity clamps, items once, and cues reach the presenter', () => {
    const seq = tiny([
      {
        id: 'go',
        trigger: { type: 'start' },
        actions: [
          { type: 'sanity', delta: -150 },
          { type: 'flag', key: 'n', value: 3 },
          { type: 'flag', key: 's', value: 'x' },
          { type: 'item', id: 'diary_1' },
          { type: 'item', id: 'diary_1' },
          { type: 'sound', id: 'knock_triple', at: 'party_wall' },
          { type: 'fx', id: 'glitch_fake', intensity: 0.5, ms: 900 },
          { type: 'haptic', pattern: 'knock' },
        ],
      },
    ])
    const run = newRun()
    const d = new Director({ sequences: seq, run, wordsOf: () => 1 }, 't')
    const events = d.tick(10, STILL).filter((e) => ['sound', 'fx', 'haptic'].includes(e.type))
    expect(d.run.sanity).toBe(0)
    expect(d.run.flags).toMatchObject({ n: 3, s: 'x' })
    expect(d.run.inventory).toEqual(['diary_1'])
    expect(events).toEqual([
      { type: 'sound', id: 'knock_triple', at: 'party_wall' },
      { type: 'fx', id: 'glitch_fake', intensity: 0.5, ms: 900 },
      { type: 'haptic', pattern: 'knock' },
    ])
    d.input({ type: 'interact', target: 'nothing' })
    d.tick(10, STILL)
    expect(d.run.sanity).toBe(0)
  })

  it('a new run starts at full sanity with the form profile; the next night announces itself', () => {
    const run = newRun(profile)
    expect(run.sanity).toBe(100)
    const d = new Director({ sequences: SEQUENCES, run, wordsOf }, 'n1')
    const events = []
    for (let t = 0; t < 9 * 60_000 && d.sequenceId === 'n1'; t += 100)
      events.push(...d.tick(100, STILL))
    expect(events).toContainEqual({ type: 'nightStart', night: 2 })
    expect(events).toContainEqual({ type: 'checkpoint' })
    expect(d.run.profile).toEqual(profile)
  })
})

describe('Night 1', () => {
  const idle = () =>
    simulate(SEQUENCES, {
      start: 'n1',
      run: newRun(),
      wordsOf,
      maxMs: 9 * 60_000,
      script: {
        // Rustam presses the form into the player's hands; the player signs it and then
        // stands still on the landing for the rest of the night.
        inputs: [{ at: 1000, input: (d) => (d.world.form ? { type: 'form', profile } : null) }],
        sensors: () => ({ zones: ['landing'], looking: [], visible: [], moving: false }),
      },
    })

  it('3:17 arrives by itself for a player who does nothing, before 9 real minutes', () => {
    const d = new Director({ sequences: SEQUENCES, run: newRun(profile), wordsOf }, 'n1')
    let cut = -1
    for (let t = 0; t < 9 * 60_000 && cut < 0; t += 100) {
      d.tick(100, STILL)
      if (d.run.flags['power_off']) cut = t
    }
    expect(cut).toBeGreaterThan(0)
    expect(cut).toBeLessThan(9 * 60_000)
  })

  it('holds at least 6 s of real silence between the power cut and the knocks', () => {
    const { director } = simulate(SEQUENCES, {
      start: 'n1',
      run: newRun(profile),
      wordsOf,
      maxMs: 7 * 60_000,
    })
    const cut = director.log.find((l) => l.action.type === 'power' && !l.action.on)!.t
    const next = director.log.find(
      (l) => l.t > cut && (l.action.type === 'sound' || l.action.type === 'say'),
    )!
    expect(next.action.type === 'sound' && next.action.id).toBe('knock_triple')
    expect(next.t - cut).toBeGreaterThanOrEqual(6000)
  })

  it('at least two things happen in the first 90 s of standing still', () => {
    const { director } = idle()
    const early = director.log.filter(
      (l) => l.t <= 90_000 && ['sound', 'say', 'object', 'form', 'phone'].includes(l.action.type),
    )
    expect(new Set(early.map((l) => l.source)).size).toBeGreaterThanOrEqual(2)
  })

  it('silence at the wall sets the response and the night moves on to night 2', () => {
    const d = new Director({ sequences: SEQUENCES, run: newRun(profile), wordsOf }, 'n1')
    for (let t = 0; t < 9 * 60_000 && d.sequenceId === 'n1'; t += 100) d.tick(100, STILL)
    expect(d.run.flags['n1_response']).toBe('silent')
    expect(d.sequenceId).toBe('n2')
    expect(d.run.night).toBe(2)
  })

  it('answering at the wall says the player line and chooses the voice reply by the form', () => {
    const d = new Director(
      { sequences: SEQUENCES, run: newRun(profile), wordsOf, record: true },
      'n1',
    )
    let answered = false
    for (let t = 0; t < 9 * 60_000 && d.sequenceId === 'n1'; t += 100) {
      if (!answered && d.world.waiting === 'party_wall') {
        d.input({ type: 'interact', target: 'party_wall' })
        answered = true
      }
      d.tick(100, STILL)
    }
    const lines = d.log
      .filter((l) => l.action.type === 'say')
      .map((l) => (l.action as { line: string }).line)
    expect(lines).toEqual(expect.arrayContaining(['N1-12', 'N1-13a.1', 'N1-13a.2', 'N1-13a.3']))
    expect(d.run.flags['n1_response']).toBe('answer')
  })
})

describe('Nights 4 and 5', () => {
  const voice48 = (setup: (run: ReturnType<typeof newRun>) => void) => {
    const d = new Director(
      { sequences: SEQUENCES, run: newRun(profile), wordsOf, record: true },
      'n4',
    )
    d.tick(10, STILL)
    d.run.flags['power_off'] = true
    setup(d.run)
    for (let t = 0; t < 3000; t += 100) d.tick(100, { ...STILL, zones: ['room48'] })
    return d.log
      .filter((l) => l.action.type === 'say')
      .map((l) => (l.action as { line: string }).line)
  }

  it('in 48 the voice says the mother’s words, then answers by what the player knows', () => {
    expect(voice48(() => undefined)).toEqual(['N4-09', 'N4-10', 'N4-11c'])
    expect(voice48((run) => (run.flags['heard_sardor'] = true))).toEqual([
      'N4-09',
      'N4-10',
      'N4-11a.1',
      'N4-11a.2',
      'N4-11a.3',
    ])
    // It admits hearing a message the player skipped.
    expect(voice48((run) => run.inventory.push('mom_msg_3'))).toEqual(
      expect.arrayContaining(['N4-11b.2', 'N4-11b.3']),
    )
  })

  it('ending C needs all 7 diary pages, all 5 messages, sanity 40 and no answer on night 3', () => {
    const run = newRun(profile)
    for (let i = 1; i <= 7; i++) run.inventory.push(`diary_${i}`)
    for (let i = 1; i <= 5; i++) run.inventory.push(`mom_msg_${i}`)
    run.sanity = 40
    expect(evaluateCondition(ENDING_C, run)).toBe(true)
    expect(evaluateCondition(ENDING_C, { ...run, sanity: 39 })).toBe(false)
    expect(evaluateCondition(ENDING_C, { ...run, flags: { n3_answered: true } })).toBe(false)
    const missing = (prefix: string) => ({
      ...run,
      inventory: run.inventory.filter((id) => id !== `${prefix}1`),
    })
    expect(evaluateCondition(ENDING_C, missing('diary_'))).toBe(false)
    expect(evaluateCondition(ENDING_C, missing('mom_msg_'))).toBe(false)
  })
})
