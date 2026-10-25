import { SAVE_VERSION } from '../constants'
import type { GameState, MetaState } from '../state/types'
import { MemoryStorage } from './memory'
import { validateMetaSave, validateRunSave } from './migrations'
import type { CloudStorageAdapter, MetaSave, RunSave, StorageAdapter } from './types'

const RUN_KEY = 'g317:run'
const META_KEY = 'g317:meta'

export function defaultMetaState(): MetaState {
  return { endingsSeen: [], chaptersUnlocked: [], contentWarningAccepted: false }
}

export function defaultMetaSave(): MetaSave {
  return { kind: 'meta', saveVersion: SAVE_VERSION, meta: defaultMetaState() }
}

/**
 * Run + meta persistence. localStorage (sync) is always the source of truth;
 * the cloud adapter is a best-effort mirror and a fallback when local is empty.
 * Cloud errors are swallowed: saving must never break gameplay.
 */
export class SaveService {
  constructor(
    private readonly local: StorageAdapter = new MemoryStorage(),
    private readonly cloud: CloudStorageAdapter | null = null,
  ) {}

  saveRun(state: GameState): void {
    const payload: RunSave = { kind: 'run', saveVersion: SAVE_VERSION, state }
    const raw = JSON.stringify(payload)
    try {
      this.local.set(RUN_KEY, raw)
    } catch {
      // Private-browsing style failures are non-fatal.
    }
    this.cloud?.store(RUN_KEY, raw).catch(() => undefined)
  }

  async loadRun(): Promise<GameState | null> {
    let localRaw: string | null
    try {
      localRaw = this.local.get(RUN_KEY)
    } catch {
      localRaw = null
    }
    const local = validateRunSave(localRaw)
    if (local) return local.state
    if (this.cloud) {
      try {
        const cloudRaw = await this.cloud.load(RUN_KEY)
        const cloud = validateRunSave(cloudRaw)
        if (cloud) return cloud.state
      } catch {
        // Cloud unavailable: fall through to "no save".
      }
    }
    return null
  }

  clearRun(): void {
    try {
      this.local.remove(RUN_KEY)
    } catch {
      // ignore
    }
    this.cloud?.delete(RUN_KEY).catch(() => undefined)
  }

  saveMeta(meta: MetaState): void {
    const payload: MetaSave = { kind: 'meta', saveVersion: SAVE_VERSION, meta }
    const raw = JSON.stringify(payload)
    try {
      this.local.set(META_KEY, raw)
    } catch {
      // ignore
    }
    this.cloud?.store(META_KEY, raw).catch(() => undefined)
  }

  async loadMeta(): Promise<MetaState> {
    let localRaw: string | null
    try {
      localRaw = this.local.get(META_KEY)
    } catch {
      localRaw = null
    }
    const local = validateMetaSave(localRaw)
    if (local) return local.meta
    if (this.cloud) {
      try {
        const cloudRaw = await this.cloud.load(META_KEY)
        const cloud = validateMetaSave(cloudRaw)
        if (cloud) return cloud.meta
      } catch {
        // Cloud unavailable.
      }
    }
    return defaultMetaState()
  }
}
