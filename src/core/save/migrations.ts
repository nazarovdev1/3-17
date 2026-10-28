import { SAVE_VERSION } from '../constants'
import type { GameState, MetaState } from '../state/types'
import type { MetaSave, RunSave } from './types'

/**
 * Migrations bring older payloads up to SAVE_VERSION.
 * Key = source version; the migration returns the payload as version + 1.
 */
export const migrations = new Map<number, (data: unknown) => unknown>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Old story-graph flags that still mean something in the Director model. */
const N1_REACTION: Record<string, string> = { javob: 'answer', sukut: 'silent', urdi: 'knock' }

/**
 * v1 → v2: the story graph is gone. A run resumes at the start of the night it was in;
 * the flags the new nights read are renamed; node bookkeeping is dropped.
 */
migrations.set(1, (data: unknown) => {
  if (!isRecord(data)) return data
  const old = isRecord(data['flags']) ? data['flags'] : {}
  const flags: Record<string, unknown> = {}
  const reaction = old['n1_reaction']
  if (typeof reaction === 'string' && N1_REACTION[reaction])
    flags['n1_response'] = N1_REACTION[reaction]
  if (old['knows_48']) flags['heard_48'] = true
  if (old['knows_sardor']) flags['heard_sardor'] = true
  if (old['answered_n3']) flags['n3_answered'] = true
  if (old['asked_sardor']) flags['n4_spoke'] = 'sardor'
  else if (old['asked_why']) flags['n4_spoke'] = 'where'
  if (old['took_bundle']) flags['took_parcel'] = true
  if (old['entered_48']) flags['entered_48'] = true
  const node = typeof data['currentNodeId'] === 'string' ? data['currentNodeId'] : ''
  const nodeNight = /^n([1-5])_/.exec(node)?.[1]
  const night = Number(nodeNight ?? data['night'] ?? 1) || 1
  const inventory = Array.isArray(data['inventory'])
    ? data['inventory'].filter(
        (id): id is string => typeof id === 'string' && /^(diary_[1-7]|mom_msg_[1-5])$/.test(id),
      )
    : []
  const rest = { ...data }
  delete rest['currentNodeId']
  delete rest['visitedNodes']
  return { ...rest, night: Math.min(5, Math.max(1, night)), flags, inventory }
})

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false
  const profile = value['profile']
  const profileOk =
    profile === null ||
    (isRecord(profile) &&
      typeof profile['name'] === 'string' &&
      typeof profile['livesAlone'] === 'string' &&
      typeof profile['fear'] === 'string' &&
      typeof profile['doorAtNight'] === 'string')
  return (
    profileOk &&
    typeof value['night'] === 'number' &&
    typeof value['sanity'] === 'number' &&
    isRecord(value['flags']) &&
    Array.isArray(value['inventory']) &&
    value['inventory'].every((i) => typeof i === 'string') &&
    typeof value['finished'] === 'boolean' &&
    typeof value['startedAt'] === 'string' &&
    typeof value['lastPlayedAt'] === 'string' &&
    isRecord(value['metaHints']) &&
    typeof value['metaHints']['realClock317Fired'] === 'boolean' &&
    typeof value['metaHints']['returnCommentFired'] === 'boolean' &&
    typeof value['metaHints']['lateNightCommentFired'] === 'boolean'
  )
}

function isMetaState(value: unknown): value is MetaState {
  if (!isRecord(value)) return false
  const endings = value['endingsSeen']
  const chapters = value['chaptersUnlocked']
  return (
    Array.isArray(endings) &&
    endings.every((e) => e === 'A' || e === 'B' || e === 'C') &&
    Array.isArray(chapters) &&
    chapters.every((c) => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 5) &&
    typeof value['contentWarningAccepted'] === 'boolean'
  )
}

/**
 * Parses a raw stored string into a versioned payload, walking migrations from
 * its version up to SAVE_VERSION. Returns null for anything unreadable —
 * a corrupted save must never crash the game (spec 4.3).
 */
export function validateRunSave(raw: string | null): RunSave | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed['kind'] !== 'run') return null
  let version = parsed['saveVersion']
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null
  if (version > SAVE_VERSION) return null
  let data: unknown = parsed['state']
  while (version < SAVE_VERSION) {
    const migrate = migrations.get(version)
    if (!migrate) return null
    data = migrate(data)
    version += 1
  }
  if (!isGameState(data)) return null
  return {
    kind: 'run',
    saveVersion: SAVE_VERSION,
    state: { ...data, sanity: Math.max(0, Math.min(100, data.sanity)) },
  }
}

/** Meta progress has the same shape in v1 and v2; both are accepted. */
export function validateMetaSave(raw: string | null): MetaSave | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed['kind'] !== 'meta') return null
  const version = parsed['saveVersion']
  if (typeof version !== 'number' || version < 1 || version > SAVE_VERSION) return null
  if (!isMetaState(parsed['meta'])) return null
  return { kind: 'meta', saveVersion: SAVE_VERSION, meta: parsed['meta'] }
}
