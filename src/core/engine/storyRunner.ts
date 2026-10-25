import type { GameState, Night, PlayerProfile } from '../state/types'
import { applyEffects } from './effects'
import { evaluateCondition } from './conditions'
import {
  EngineError,
  type Choice,
  type EngineEvent,
  type EnginePhase,
  type Step,
  type Story,
  type StoryNode,
} from './types'

export function createInitialState(profile: PlayerProfile, nowIso: string): GameState {
  return {
    profile,
    currentNodeId: null,
    night: 0,
    sanity: 100,
    flags: {},
    inventory: [],
    visitedNodes: [],
    finished: false,
    startedAt: nowIso,
    lastPlayedAt: nowIso,
    metaHints: {
      realClock317Fired: false,
      returnCommentFired: false,
      lateNightCommentFired: false,
    },
  }
}

export function getNode(story: Story, nodeId: string): StoryNode {
  const node = story.nodes[nodeId]
  if (!node) throw new EngineError(`Unknown node: ${nodeId}`)
  return node
}

export function nodePhase(node: StoryNode): EnginePhase {
  if (node.ending) return 'ending'
  if (node.choices) return 'choices'
  if (node.next) return 'next'
  throw new EngineError(`Node ${node.id} has no choices, next or ending`)
}

export function visibleChoices(node: StoryNode, state: GameState): Choice[] {
  return (node.choices ?? []).filter(
    (choice) => !choice.when || evaluateCondition(choice.when, state),
  )
}

function enterNode(story: Story, state: GameState, nodeId: string): Step {
  const node = getNode(story, nodeId)
  const phase = nodePhase(node)
  const events: EngineEvent[] = []
  let next: GameState = { ...state, currentNodeId: node.id }

  if (!next.visitedNodes.includes(node.id)) {
    next = { ...next, visitedNodes: [...next.visitedNodes, node.id] }
  }
  if (next.night !== node.night) {
    next = { ...next, night: node.night }
    events.push({ kind: 'night', night: node.night })
  }

  const applied = applyEffects(next, node.onEnter)
  next = applied.state
  events.push(...applied.events)

  if (node.checkpoint) {
    events.push({ kind: 'autosave' })
  }
  if (node.ending) {
    next = { ...next, finished: true }
    events.push({ kind: 'ending', id: node.ending })
  }
  return { state: next, node, phase, events }
}

/** Starts a fresh run: applies the start node of the story. */
export function startGame(story: Story, profile: PlayerProfile, nowIso: string): Step {
  const state = createInitialState(profile, nowIso)
  return enterNode(story, state, story.start)
}

/** Advances from a `next` node to its successor. */
export function advance(story: Story, state: GameState): Step {
  const nodeId = state.currentNodeId
  if (!nodeId) throw new EngineError('Cannot advance: no current node')
  const node = getNode(story, nodeId)
  const phase = nodePhase(node)
  if (phase !== 'next' || !node.next) {
    throw new EngineError(`Cannot advance from node ${node.id} in phase ${phase}`)
  }
  return enterNode(story, state, node.next)
}

/** Picks a visible choice and applies its effects + transition. */
export function choose(story: Story, state: GameState, choiceId: string): Step {
  const nodeId = state.currentNodeId
  if (!nodeId) throw new EngineError('Cannot choose: no current node')
  const node = getNode(story, nodeId)
  const phase = nodePhase(node)
  if (phase !== 'choices' || !node.choices) {
    throw new EngineError(`Cannot choose on node ${node.id} in phase ${phase}`)
  }
  const choice = visibleChoices(node, state).find((c) => c.id === choiceId)
  if (!choice) throw new EngineError(`Choice ${choiceId} is not available on node ${node.id}`)
  const applied = applyEffects(state, choice.effects)
  return enterNode(story, applied.state, choice.to)
}

/**
 * Rebuilds the view of the current node after a save load WITHOUT re-applying
 * onEnter effects (no double sanity/items/autosave).
 */
export function resume(story: Story, state: GameState): Step {
  const nodeId = state.currentNodeId
  if (!nodeId) throw new EngineError('Cannot resume: no current node')
  const node = getNode(story, nodeId)
  return { state, node, phase: nodePhase(node), events: [] }
}

/** Jumps to an arbitrary node (debug node jumper). Applies onEnter effects. */
export function goTo(story: Story, state: GameState, nodeId: string): Step {
  return enterNode(story, state, nodeId)
}

/** True while the wall clock is inside 00:00–05:00 local (meta-horror, spec 5.6). */
export function isLateNight(now: Date): boolean {
  const hour = now.getHours()
  return hour < 5
}

/** True for exactly one minute: 3:17 local (meta-horror, spec 5.6). */
export function is317(now: Date): boolean {
  return now.getHours() === 3 && now.getMinutes() === 17
}

export type { Night }
