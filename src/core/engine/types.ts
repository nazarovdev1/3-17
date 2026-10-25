import type {
  EndingId,
  FxId,
  GameState,
  HapticPattern,
  ItemId,
  LocationId,
  Night,
  PlayerProfile,
  SfxId,
} from '../state/types'

export type NodeId = string

export interface DesktopHint {
  /** How this node is triggered in the 3D scene. */
  trigger: 'interact' | 'zone' | 'timed' | 'scripted'
  /** Object the player interacts with (trigger: interact). */
  objectId?: string
  /** Zone the player walks into (trigger: zone). */
  zoneId?: string
  /** Delay after the previous node before auto-firing (trigger: timed). */
  delayMs?: number
  /** Scripted event id (trigger: scripted). */
  eventId?: string
}

export interface MobileHint {
  /** Vignette scene id to render. */
  vignette: string
  /** Hotspot ids made tappable in this node. */
  hotspots?: string[]
  /** Voice chat overlay instead of the narration panel. */
  overlay?: 'chat' | 'none'
}

export interface Line {
  speaker: 'narrator' | 'voice' | 'player' | 'landlord' | 'muhabbat' | 'diary'
  /** First matching variant wins; the last variant must have no condition. */
  variants: { when?: Condition; text: string }[]
}

export interface Choice {
  id: string
  label: string
  to: NodeId
  when?: Condition
  effects?: Effect[]
}

export type Effect =
  | { type: 'sanity'; delta: number }
  | { type: 'flag'; key: string; value: boolean | number | string }
  | { type: 'item'; id: ItemId }
  | { type: 'sfx'; id: SfxId }
  | { type: 'fx'; id: FxId; intensity?: number; durationMs?: number }
  | { type: 'haptic'; pattern: HapticPattern }

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

export interface StoryNode {
  id: NodeId
  night: Night
  location: LocationId
  lines: Line[]
  /** If present, `next` must be absent. */
  choices?: Choice[]
  /** Required when `choices` is absent and this is not an ending. */
  next?: NodeId
  onEnter?: Effect[]
  ending?: EndingId
  checkpoint?: boolean
  desktop?: DesktopHint
  mobile?: MobileHint
}

export interface Story {
  start: NodeId
  nodes: Record<NodeId, StoryNode>
}

/** Side effects the presenter must execute (audio, fx, haptics, autosave). */
export type EngineEvent =
  | { kind: 'sfx'; id: SfxId }
  | { kind: 'fx'; id: FxId; intensity?: number; durationMs?: number }
  | { kind: 'haptic'; pattern: HapticPattern }
  | { kind: 'autosave' }
  | { kind: 'ending'; id: EndingId }
  | { kind: 'night'; night: Night }

export type EnginePhase = 'lines' | 'choices' | 'next' | 'ending'

export interface Step {
  state: GameState
  node: StoryNode
  phase: EnginePhase
  events: EngineEvent[]
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngineError'
  }
}
