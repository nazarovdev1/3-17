import type { GameState, MetaState } from '../state/types'

/** Synchronous key-value storage (localStorage on the web). */
export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Async mirror storage (Telegram CloudStorage on the web). */
export interface CloudStorageAdapter {
  load(key: string): Promise<string | null>
  store(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

export interface RunSave {
  kind: 'run'
  saveVersion: number
  state: GameState
}

export interface MetaSave {
  kind: 'meta'
  saveVersion: number
  meta: MetaState
}
