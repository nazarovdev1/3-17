import type { StoryNode } from '../engine/types'

/** Night 0 is the prologue (rental form + arrival), 1–5 are the game nights. */
export type Night = 0 | 1 | 2 | 3 | 4 | 5

export type EndingId = 'A' | 'B' | 'C'

export type LocationId =
  'room' | 'kitchen' | 'bathroom' | 'corridor' | 'balcony' | 'stairwell' | 'flat48'

export type ItemId = string

/** Sound ids produced by the audio engine (spec section 7). */
export type SfxId =
  | 'knock'
  | 'knock_triple'
  | 'knock_soft'
  | 'radiator'
  | 'fridge_stop'
  | 'step_wood'
  | 'step_tile'
  | 'chain'
  | 'kettle'
  | 'page'
  | 'clock_tick'
  | 'heartbeat'
  | 'whisper'
  | 'door_open'
  | 'door_close'
  | 'switch'
  | 'window_dark'
  | 'static'
  | 'tea'
  | 'pen'

/** Screen effect ids (spec section 6). */
export type FxId =
  | 'grain'
  | 'vignette'
  | 'scanline'
  | 'chromatic'
  | 'wobble'
  | 'drain'
  | 'tear'
  | 'corrupt'
  | 'flash'
  | 'glitch_fake'
  | 'darken'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'knock' | 'heartbeat'

export type SanityBand = 'clean' | 'subtle' | 'heavy' | 'corrupt'

/** Answers from the diegetic rental form (spec 5.3); stored in Uzbek. */
export interface PlayerProfile {
  name: string
  livesAlone: 'ha' | 'yoʻq' | 'hozircha'
  fear: 'qorongʻulik' | 'yolgʻizlik' | 'kuzatuv' | 'unutilish'
  doorAtNight: 'ochiq' | 'yopiq'
}

/** Flags for one-time meta-horror events (spec 5.6). */
export interface MetaHints {
  realClock317Fired: boolean
  returnCommentFired: boolean
  lateNightCommentFired: boolean
}

/** Complete mutable run state. Serialized by the save system. */
export interface GameState {
  profile: PlayerProfile | null
  currentNodeId: string | null
  night: Night
  sanity: number
  flags: Record<string, boolean | number | string>
  inventory: ItemId[]
  visitedNodes: string[]
  finished: boolean
  startedAt: string
  lastPlayedAt: string
  metaHints: MetaHints
}

/** Persistent meta progression, survives run resets (endings gallery, chapters). */
export interface MetaState {
  endingsSeen: EndingId[]
  chaptersUnlocked: Night[]
  contentWarningAccepted: boolean
}

export type Speaker = StoryNode['lines'][number]['speaker']
