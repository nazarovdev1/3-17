import type { GameClock } from './clock'
import type { EndingId, HapticPattern, ItemId, PlayerProfile, FxId } from '../state/types'

/**
 * The redesign's model (REDESIGN_PROMPT §2, docs/BEATS.md): the world is the source of
 * events. A night is a list of beats; each beat waits for a trigger (the clock, a place,
 * a gaze, an interaction, idleness) and then changes the world. There is no narrator and
 * there are no menus: text exists only as speech (subtitles), the phone and paper.
 */
export type ObjectId = string
export type ZoneId = string
/** An id from SCRIPT_UZ.md (e.g. "N1-12"); the words live in src/content/text/uz/script.yaml. */
export type TextKey = string
export type Point = [number, number, number]

/** Who can speak out loud. The narrator does not exist. */
export type Speaker = 'voice' | 'muhabbat' | 'landlord' | 'mother' | 'player_spoken'

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { flag: string; eq?: unknown }
  | { sanityGte: number }
  | { sanityLt: number }
  | { hasItem: ItemId }
  | { itemCountGte: { prefix: string; count: number } }
  | { profile: keyof PlayerProfile; eq: string }

export type Trigger =
  | { type: 'start' }
  | { type: 'clock'; at: GameClock }
  | { type: 'zone'; zone: ZoneId; dwellMs?: number }
  | { type: 'gaze'; target: ObjectId; minMs?: number }
  | { type: 'notLooking'; target: ObjectId; minMs: number }
  | { type: 'interact'; target: ObjectId }
  | { type: 'idle'; ms: number }
  | { type: 'after'; beat: string; delayMs?: number }
  | { type: 'sanityBelow'; value: number }
  | { type: 'hold'; target: ObjectId; minMs?: number }
  | { type: 'knock3'; target: ObjectId }
  /** Repeats every `ms` while `when` holds (night 5 holding at 3:17). */
  | { type: 'every'; ms: number }

/** The phone as a world object; the presenter draws exactly this. */
export interface PhoneWorld {
  place: 'table' | 'pillow' | 'hand' | 'pocket'
  screen: 'off' | 'lock' | 'message' | 'playing' | 'draft' | 'incoming' | 'call' | 'dead'
  faceDown: boolean
  missed: number
  /** Lock-screen date line, a ui key (phone.date_n1 …). */
  date: string
  /** Shown time; '' means the night clock. */
  time: string
  work: TextKey | null
  /** Tonight's voice message: the transcript lines and its length. */
  message: TextKey[] | null
  messageSeconds: number
  heard: boolean
  /** Night 2 draft: shown with Send, sent, or deleted. */
  draft: 'none' | 'shown' | 'sent' | 'deleted'
  /** Incoming call screen: whether an answer button exists. */
  canAnswer: boolean
}

export type Action =
  /** A recorded sound (SfxId); ids without a recording yet are skipped, never faked. */
  | { type: 'sound'; id: string; at?: ObjectId | Point; volume?: number }
  /** Ambient bed: maps to the audio engine's scenes. */
  | { type: 'scene'; scene: 'flat' | 'day' | 'silence' | 'street' | 'clock' | 'off' }
  | { type: 'power'; on: boolean }
  | { type: 'light'; id: string; state: 'on' | 'off' | 'flicker'; ms?: number }
  | { type: 'windows'; state: 'lit' | 'floorByFloor' | 'allAtOnce' }
  | { type: 'door'; id: ObjectId; state: 'open' | 'ajar' | 'closed' }
  | { type: 'object'; id: ObjectId; change: string }
  | { type: 'figure'; placement: string | null; ms?: number }
  | { type: 'phone'; set: Partial<PhoneWorld> }
  | { type: 'say'; speaker: Speaker; line: TextKey; from?: ObjectId | Point }
  | { type: 'haptic'; pattern: HapticPattern }
  /** hands: eyes go down to what was just put in the player's hand (the key ring). */
  | { type: 'camera'; effect: 'shake' | 'jolt' | 'sway' | 'push' | 'sitUp' | 'lookDown' | 'hands' }
  | { type: 'fx'; id: FxId; intensity?: number; ms?: number }
  | { type: 'flag'; key: string; value: boolean | number | string }
  | { type: 'sanity'; delta: number }
  | { type: 'item'; id: ItemId }
  | { type: 'readable'; id: string }
  | { type: 'form' }
  | { type: 'timeScale'; factor: number }
  | { type: 'fade'; to: 'black' | 'clear'; ms: number }
  /** Day or night through the windows; `ms` lets it change slowly (ending A's dusk). */
  | { type: 'daylight'; on: boolean; ms?: number }
  | { type: 'setClock'; at: GameClock }
  | { type: 'clockFreeze'; on: boolean }
  | { type: 'control'; limit: 'none' | 'shuffle' | 'locked' }
  | { type: 'endNight'; afterMs: number }
  | { type: 'ending'; id: EndingId }
  | { type: 'credits' }
  /** Whoever is talking stops mid-sentence: the current and queued subtitles are dropped. */
  | { type: 'hush' }
  /** Moves the player's body (the night-3 corridor gives up and puts them by the sofa). */
  | { type: 'place'; position: Point; yaw: number }
  /** Branch inside a beat on flags, items, sanity or the rental-form profile. */
  | { type: 'if'; when: Condition; then: TimedAction[]; else?: TimedAction[] }

/** Any action may wait a little after its beat fires. */
export type TimedAction = Action & { delayMs?: number }

export interface ResponseOption {
  /** Flag value written when this option resolves the window. */
  value: string
  actions: TimedAction[]
}

/** A moment the world waits for the player: answer, knock back, or say nothing. */
export interface ResponseWindow {
  /** Delay after the beat fires before the window opens (the voice finishes speaking). */
  openAfterMs: number
  windowMs: number
  flag: string
  answer?: ResponseOption & { target: ObjectId }
  knock?: ResponseOption & { target: ObjectId }
  silence: ResponseOption
}

export interface Beat {
  id: string
  trigger: Trigger
  when?: Condition
  /** Fires once per night (default). Repeatable beats may set a cooldown. */
  once?: boolean
  cooldownMs?: number
  /** Only while the player is in none of these zones (e.g. a call while away from the phone). */
  notIn?: ZoneId[]
  /** Only while the player is in one of these zones (Muhabbat opa talks while they stay). */
  onlyIn?: ZoneId[]
  actions: TimedAction[]
  waitFor?: ResponseWindow
}

/** Untold background events (REDESIGN §2 ambient scheduler). */
export interface AmbientEvent {
  id: string
  actions: TimedAction[]
  when?: Condition
  /** Only while the power is on (default) — after 3:17 the flat is silent. */
  requirePower?: boolean
  /** Fires only while this object is out of view (object changes). */
  unobserved?: ObjectId
}

export interface Sequence {
  /** 'n1' … 'n5', 'endA' … */
  id: string
  night: 1 | 2 | 3 | 4 | 5
  start: GameClock
  /** Where the player stands when the sequence begins. */
  spawn: { position: Point; yaw: number }
  /** Real seconds per game minute; lying on the sofa multiplies the pace. */
  realSecondsPerGameMinute: number
  beats: Beat[]
  ambient: AmbientEvent[]
  /** Real-time gap between ambient events. */
  ambientEveryMs: [number, number]
}

/** What the presenter senses each frame. */
export interface Sensors {
  zones: ZoneId[]
  /** Objects near the centre of view (gaze). */
  looking: ObjectId[]
  /** Objects anywhere in view (for "not looking"). */
  visible: ObjectId[]
  moving: boolean
}

export type PlayerInput =
  | { type: 'interact'; target: ObjectId }
  | { type: 'knock3'; target: ObjectId }
  | { type: 'holdStart'; target: ObjectId }
  | { type: 'holdEnd' }
  | { type: 'closeReadable' }
  | { type: 'form'; profile: PlayerProfile }

/** Transient things the presenter must play now (sounds, speech, effects). */
export type DirectorEvent =
  | Extract<
      Action,
      {
        type:
          | 'sound'
          | 'say'
          | 'haptic'
          | 'camera'
          | 'fx'
          | 'fade'
          | 'readable'
          | 'form'
          | 'credits'
          | 'scene'
          | 'place'
      }
    >
  | { type: 'nightStart'; night: number }
  | { type: 'endingStart'; id: EndingId }
  | { type: 'checkpoint' }

export interface Subtitle {
  speaker: Speaker
  line: TextKey
  until: number
}

/** The world as it stands; presenters render this. */
export interface WorldState {
  sequence: string
  night: number
  clock: number
  frozen: boolean
  timeScale: number
  power: boolean
  daylight: boolean
  /** How long the last change of daylight takes (0: at once). */
  daylightMs: number
  windows: 'lit' | 'floorByFloor' | 'allAtOnce'
  scene: 'flat' | 'day' | 'silence' | 'street' | 'clock' | 'off'
  doors: Record<ObjectId, 'open' | 'ajar' | 'closed'>
  objects: Record<ObjectId, string>
  lights: Record<string, 'on' | 'off' | 'flicker'>
  figure: string | null
  phone: PhoneWorld
  subtitle: Subtitle | null
  readable: string | null
  form: boolean
  listening: boolean
  control: 'none' | 'shuffle' | 'locked'
  /** A response window is open at this object (the presenter shows its glyph). */
  waiting: ObjectId | null
  ending: EndingId | null
  finished: boolean
}
