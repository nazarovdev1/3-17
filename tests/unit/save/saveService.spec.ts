import { describe, expect, it } from 'vitest'
import { SaveService, defaultMetaState } from '@/core/save/saveService'
import { MemoryStorage } from '@/core/save/memory'
import { migrations, validateMetaSave, validateRunSave } from '@/core/save/migrations'
import { SAVE_VERSION } from '@/core/constants'
import type { GameState, MetaState } from '@/core/state/types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    profile: { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
    night: 2,
    sanity: 63,
    flags: { n1_response: 'answer', heard_48: true },
    inventory: ['diary_1', 'key_ring'],
    finished: false,
    startedAt: '2026-01-09T20:00:00.000Z',
    lastPlayedAt: '2026-01-09T23:00:00.000Z',
    metaHints: {
      realClock317Fired: true,
      returnCommentFired: false,
      lateNightCommentFired: false,
    },
    ...overrides,
  }
}

describe('SaveService.run', () => {
  it('saves and loads a run round-trip', async () => {
    const service = new SaveService(new MemoryStorage())
    const state = makeState()
    service.saveRun(state)
    expect(await service.loadRun()).toEqual(state)
  })

  it('returns null when there is no save', async () => {
    const service = new SaveService(new MemoryStorage())
    expect(await service.loadRun()).toBeNull()
  })

  it('falls back to the cloud when local is empty', async () => {
    const local = new MemoryStorage()
    const cloud = new MemoryStorage()
    const state = makeState()
    new SaveService(cloud).saveRun(state)
    const service = new SaveService(local, cloud)
    expect(await service.loadRun()).toEqual(state)
  })

  it('prefers local over cloud', async () => {
    const local = new MemoryStorage()
    const cloud = new MemoryStorage()
    new SaveService(local).saveRun(makeState({ night: 2 }))
    new SaveService(cloud).saveRun(makeState({ night: 4 }))
    expect((await new SaveService(local, cloud).loadRun())?.night).toBe(2)
  })

  it('cloud write failures are swallowed', async () => {
    const service = new SaveService(new MemoryStorage(), {
      load: async () => null,
      store: async () => {
        throw new Error('offline')
      },
      delete: async () => {
        throw new Error('offline')
      },
    })
    expect(() => service.saveRun(makeState())).not.toThrow()
  })

  it('clearRun removes the save locally and in the cloud', async () => {
    const cloud = new MemoryStorage()
    const service = new SaveService(new MemoryStorage(), cloud)
    service.saveRun(makeState())
    service.clearRun()
    expect(await service.loadRun()).toBeNull()
    expect(await cloud.load('g317:run')).toBeNull()
  })
})

describe('corrupted save recovery (spec 4.3)', () => {
  it.each([
    'not json at all {{{',
    '"just a string"',
    '{"kind":"run","saveVersion":1,"state":{}}',
    '{"kind":"run","saveVersion":0,"state":null}',
    '{"kind":"run","saveVersion":99,"state":{}}',
    '{"kind":"meta","saveVersion":1,"meta":{"endingsSeen":["X"],"chaptersUnlocked":[],"contentWarningAccepted":false}}',
    '{"kind":"run","saveVersion":1,"state":{"sanity":1000}}',
  ])('rejects %j', async (raw) => {
    const local = new MemoryStorage()
    local.set('g317:run', raw)
    const service = new SaveService(local)
    expect(await service.loadRun()).toBeNull()
  })

  it('never throws on garbage input', () => {
    expect(validateRunSave(null)).toBeNull()
    expect(validateRunSave('')).toBeNull()
    expect(validateRunSave('\u0000garbage')).toBeNull()
  })
})

describe('migrations', () => {
  it('migrates a v1 story-graph save to the start of its night with its meaning kept', () => {
    const legacy = {
      profile: { name: 'Ali', livesAlone: 'ha', fear: 'qorongʻulik', doorAtNight: 'yopiq' },
      currentNodeId: 'n3_hub',
      night: 3,
      sanity: 58,
      flags: {
        n1_reaction: 'urdi',
        knows_sardor: true,
        answered_n3: true,
        took_bundle: true,
        inspected_clock: true,
        time: '3:17',
      },
      inventory: ['landlord_note', 'diary_1', 'diary_2', 'mom_msg_1'],
      visitedNodes: ['n1_start', 'n3_hub'],
      finished: false,
      startedAt: '2026-01-09T20:00:00.000Z',
      lastPlayedAt: '2026-01-09T23:00:00.000Z',
      metaHints: {
        realClock317Fired: false,
        returnCommentFired: false,
        lateNightCommentFired: false,
      },
    }
    const migrated = validateRunSave(JSON.stringify({ kind: 'run', saveVersion: 1, state: legacy }))
    expect(migrated?.saveVersion).toBe(SAVE_VERSION)
    const state = migrated!.state as GameState & Record<string, unknown>
    expect(state.night).toBe(3)
    expect(state.flags).toEqual({
      n1_response: 'knock',
      heard_sardor: true,
      n3_answered: true,
      took_parcel: true,
    })
    expect(state.inventory).toEqual(['diary_1', 'diary_2', 'mom_msg_1'])
    expect(state['currentNodeId']).toBeUndefined()
    expect(state['visitedNodes']).toBeUndefined()
    expect(state.sanity).toBe(58)
    expect(state.profile?.name).toBe('Ali')
  })

  it('takes the night from the old node id, and a start node to night 1', () => {
    const raw = (node: string | null, night: number) =>
      JSON.stringify({
        kind: 'run',
        saveVersion: 1,
        state: { ...makeState(), currentNodeId: node, visitedNodes: [], night },
      })
    expect(validateRunSave(raw('n5_hub', 4))?.state.night).toBe(5)
    expect(validateRunSave(raw(null, 0))?.state.night).toBe(1)
  })

  it('rejects a payload older than the registry can migrate', () => {
    const raw = JSON.stringify({ kind: 'run', saveVersion: 0, state: makeState() })
    expect(validateRunSave(raw)).toBeNull()
    expect(migrations.has(1)).toBe(true)
  })

  it('accepts meta progress saved by v1 and v2 alike', () => {
    const meta = { endingsSeen: ['B'], chaptersUnlocked: [1], contentWarningAccepted: true }
    expect(validateMetaSave(JSON.stringify({ kind: 'meta', saveVersion: 1, meta }))?.meta).toEqual(
      meta,
    )
    expect(validateMetaSave(JSON.stringify({ kind: 'meta', saveVersion: 2, meta }))?.meta).toEqual(
      meta,
    )
  })
})
describe('SaveService.meta', () => {
  it('round-trips meta progression', async () => {
    const service = new SaveService(new MemoryStorage())
    const meta: MetaState = {
      endingsSeen: ['A'],
      chaptersUnlocked: [0, 1],
      contentWarningAccepted: true,
    }
    service.saveMeta(meta)
    expect(await service.loadMeta()).toEqual(meta)
  })

  it('returns defaults when no meta exists', async () => {
    const service = new SaveService(new MemoryStorage())
    expect(await service.loadMeta()).toEqual(defaultMetaState())
  })

  it('recovers from a corrupted meta save', async () => {
    const local = new MemoryStorage()
    local.set('g317:meta', '{"kind":"meta","saveVersion":1,"meta":{"endingsSeen":"ALL"}}')
    const service = new SaveService(local)
    expect(await service.loadMeta()).toEqual(defaultMetaState())
  })

  it('validateMetaSave accepts a valid payload', () => {
    const raw = JSON.stringify({
      kind: 'meta',
      saveVersion: SAVE_VERSION,
      meta: defaultMetaState(),
    })
    expect(validateMetaSave(raw)).not.toBeNull()
  })
})
