import type { Condition, Effect, Story, StoryNode } from '../engine/types'
import { KNOWN_PLACEHOLDERS } from '../narration/static'

export const ENDING_IDS = ['A', 'B', 'C'] as const
export const DIARY_PREFIX = 'diary_'
export const REQUIRED_DIARY_COUNT = 7

export interface ValidationOutcome {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const PLACEHOLDER_RE = /\{(\w+)\}/g

function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1] ?? '')
}

function nodeEdges(node: StoryNode): string[] {
  const targets: string[] = []
  if (node.next) targets.push(node.next)
  for (const choice of node.choices ?? []) targets.push(choice.to)
  return targets
}

function allEffects(story: Story): Effect[] {
  const effects: Effect[] = []
  for (const node of Object.values(story.nodes)) {
    effects.push(...(node.onEnter ?? []))
    for (const choice of node.choices ?? []) effects.push(...(choice.effects ?? []))
  }
  return effects
}

function flagsSetByEffects(effects: readonly Effect[]): Set<string> {
  const set = new Set<string>()
  for (const effect of effects) {
    if (effect.type === 'flag') set.add(effect.key)
  }
  return set
}

function flagsReferencedByCondition(condition: Condition, into: Set<string>): void {
  if ('all' in condition) {
    for (const c of condition.all) flagsReferencedByCondition(c, into)
  } else if ('any' in condition) {
    for (const c of condition.any) flagsReferencedByCondition(c, into)
  } else if ('not' in condition) {
    flagsReferencedByCondition(condition.not, into)
  } else if ('flag' in condition) {
    into.add(condition.flag)
  }
}

function conditionsOf(story: Story): Condition[] {
  const conditions: Condition[] = []
  for (const node of Object.values(story.nodes)) {
    for (const line of node.lines) {
      for (const variant of line.variants) {
        if (variant.when) conditions.push(variant.when)
      }
    }
    for (const choice of node.choices ?? []) {
      if (choice.when) conditions.push(choice.when)
    }
  }
  return conditions
}

/** Collects structural, reachability, ending and diary problems (spec 12). */
export function validateStory(story: Story): ValidationOutcome {
  const errors: string[] = []
  const warnings: string[] = []
  const nodeIds = Object.keys(story.nodes)

  if (nodeIds.length === 0) {
    return { ok: false, errors: ['story has no nodes'], warnings }
  }
  const startNode = story.nodes[story.start]
  if (!startNode) {
    errors.push(`start node "${story.start}" does not exist`)
  }

  // --- per-node structural checks -------------------------------------------
  for (const node of Object.values(story.nodes)) {
    const where = `node "${node.id}"`

    if (node.lines.length === 0) {
      errors.push(`${where}: no lines`)
    }
    for (const [index, line] of node.lines.entries()) {
      if (line.variants.length === 0) {
        errors.push(`${where} line ${index}: no variants`)
        continue
      }
      const last = line.variants[line.variants.length - 1]
      if (last && last.when) {
        errors.push(`${where} line ${index}: last variant must be an unconditional fallback`)
      }
      for (const [vi, variant] of line.variants.entries()) {
        if (variant.text.trim().length === 0) {
          errors.push(`${where} line ${index} variant ${vi}: empty text`)
        }
        for (const ph of placeholdersOf(variant.text)) {
          if (!KNOWN_PLACEHOLDERS.includes(ph as (typeof KNOWN_PLACEHOLDERS)[number])) {
            errors.push(`${where} line ${index} variant ${vi}: unknown placeholder {${ph}}`)
          }
        }
      }
    }

    const exitCount = (node.choices ? 1 : 0) + (node.next ? 1 : 0) + (node.ending ? 1 : 0)
    if (exitCount === 0) {
      errors.push(`${where}: has neither choices, next nor ending`)
    }
    if (exitCount > 1) {
      errors.push(`${where}: has more than one of choices / next / ending`)
    }

    const choiceIds = new Set<string>()
    for (const choice of node.choices ?? []) {
      if (choice.id.length === 0) {
        errors.push(`${where}: choice with empty id`)
      }
      if (choiceIds.has(choice.id)) {
        errors.push(`${where}: duplicate choice id "${choice.id}"`)
      }
      choiceIds.add(choice.id)
      if (choice.label.trim().length === 0) {
        errors.push(`${where} choice "${choice.id}": empty label`)
      }
      if (placeholdersOf(choice.label).length > 0) {
        errors.push(`${where} choice "${choice.id}": labels cannot contain placeholders`)
      }
    }
  }

  // --- edge targets ----------------------------------------------------------
  for (const node of Object.values(story.nodes)) {
    for (const target of nodeEdges(node)) {
      if (!story.nodes[target]) {
        errors.push(`node "${node.id}": points to missing node "${target}"`)
      }
    }
  }

  // --- reachability from start ------------------------------------------------
  const reachable = new Set<string>()
  if (startNode) {
    const queue = [story.start]
    reachable.add(story.start)
    while (queue.length > 0) {
      const id = queue.pop()
      const node = id !== undefined ? story.nodes[id] : undefined
      if (!node) continue
      for (const target of nodeEdges(node)) {
        if (!reachable.has(target)) {
          reachable.add(target)
          queue.push(target)
        }
      }
    }
  }
  for (const id of nodeIds) {
    if (!reachable.has(id)) {
      errors.push(`node "${id}": unreachable from start`)
    }
  }

  // --- every node can reach an ending (also catches cycles without exits) -----
  const endingNodes = Object.values(story.nodes).filter((n) => n.ending)
  const canReachEnding = new Set<string>(endingNodes.map((n) => n.id))
  const queue = [...canReachEnding]
  while (queue.length > 0) {
    const id = queue.pop()
    if (id === undefined) continue
    for (const node of Object.values(story.nodes)) {
      if (canReachEnding.has(node.id)) continue
      if (nodeEdges(node).includes(id)) {
        canReachEnding.add(node.id)
        queue.push(node.id)
      }
    }
  }
  for (const id of nodeIds) {
    if (!canReachEnding.has(id)) {
      errors.push(`node "${id}": cannot reach any ending (cycle without exit?)`)
    }
  }

  // --- endings present and reachable ------------------------------------------
  for (const endingId of ENDING_IDS) {
    const nodes = endingNodes.filter((n) => n.ending === endingId)
    if (nodes.length === 0) {
      errors.push(`ending ${endingId}: no node declares it`)
      continue
    }
    if (nodes.length > 1) {
      errors.push(`ending ${endingId}: declared by multiple nodes`)
    }
    if (!reachable.has(nodes[0]!.id)) {
      errors.push(`ending ${endingId}: unreachable from start`)
    }
  }

  // --- diary pages -------------------------------------------------------------
  const diaryGrants = new Map<string, string[]>()
  for (const node of Object.values(story.nodes)) {
    for (const effect of [
      ...(node.onEnter ?? []),
      ...(node.choices ?? []).flatMap((c) => c.effects ?? []),
    ]) {
      if (effect.type === 'item' && effect.id.startsWith(DIARY_PREFIX)) {
        const granted = diaryGrants.get(effect.id) ?? []
        granted.push(node.id)
        diaryGrants.set(effect.id, granted)
      }
    }
  }
  for (const [id, nodes] of diaryGrants) {
    if (nodes.length > 1) {
      errors.push(`diary page "${id}": granted more than once (${nodes.join(', ')})`)
    }
  }
  if (diaryGrants.size !== REQUIRED_DIARY_COUNT) {
    errors.push(`diary pages: found ${diaryGrants.size}, expected ${REQUIRED_DIARY_COUNT}`)
  }

  // --- warnings: conditions on flags nothing ever sets --------------------------
  const setFlags = flagsSetByEffects(allEffects(story))
  const referenced = new Set<string>()
  for (const condition of conditionsOf(story)) {
    flagsReferencedByCondition(condition, referenced)
  }
  for (const flag of referenced) {
    if (!setFlags.has(flag)) {
      warnings.push(`flag "${flag}" is used in a condition but never set by any effect`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
