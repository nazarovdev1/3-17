import type { CloudStorageAdapter, StorageAdapter } from './types'

/** In-memory storage for tests and for environments without persistence. */
export class MemoryStorage implements StorageAdapter, CloudStorageAdapter {
  private map = new Map<string, string>()

  get(key: string): string | null {
    return this.map.get(key) ?? null
  }

  async load(key: string): Promise<string | null> {
    return this.get(key)
  }

  set(key: string, value: string): void {
    this.map.set(key, value)
  }

  async store(key: string, value: string): Promise<void> {
    this.set(key, value)
  }

  remove(key: string): void {
    this.map.delete(key)
  }

  async delete(key: string): Promise<void> {
    this.remove(key)
  }
}
