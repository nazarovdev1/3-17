import { create } from 'zustand'
import type { GameMode } from '@/platform/device/mode'

export type TextSize = 'S' | 'M' | 'L'

export interface Settings {
  mode: GameMode | 'auto'
  masterVolume: number
  musicVolume: number
  effectsVolume: number
  textSize: TextSize
  reduceFlashing: boolean
  headBob: boolean
}

const SETTINGS_KEY = 'g317:settings'

export const DEFAULT_SETTINGS: Settings = {
  mode: 'auto',
  masterVolume: 0.8,
  musicVolume: 0.7,
  effectsVolume: 0.8,
  textSize: 'M',
  reduceFlashing: false,
  headBob: true,
}

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    const merged: Settings = { ...DEFAULT_SETTINGS, ...parsed }
    // Guard against nonsense values from a hand-edited storage.
    merged.masterVolume = clamp01(merged.masterVolume)
    merged.musicVolume = clamp01(merged.musicVolume)
    merged.effectsVolume = clamp01(merged.effectsVolume)
    if (!['S', 'M', 'L'].includes(merged.textSize)) merged.textSize = 'M'
    if (!['auto', 'mobile', 'desktop'].includes(merged.mode)) merged.mode = 'auto'
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function clamp01(v: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8
}

interface SettingsStore {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

/** Player settings, persisted to localStorage independently of the run save. */
export const useSettings = create<SettingsStore>((set, get) => ({
  settings: load(),
  update: (patch) => {
    const next = { ...get().settings, ...patch }
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    set({ settings: next })
  },
  reset: () => {
    try {
      window.localStorage.removeItem(SETTINGS_KEY)
    } catch {
      // ignore
    }
    set({ settings: { ...DEFAULT_SETTINGS } })
  },
}))
