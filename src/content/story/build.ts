import type { Choice, Condition, Line, StoryNode } from '@/core/engine/types'
import { storyText } from '@/content/text'

/**
 * Story structure is written in TypeScript; every text comes from the YAML by key.
 * A line key is `l1`, `l2`, …; a conditional variant of line 3 is `l3_<reason>`;
 * a choice label is `c_<choiceId>`. The YAML section is chosen per file (night-1 … endings).
 */
export interface DraftVariant {
  when: Condition
  key: string
}

export interface DraftLine {
  speaker: Line['speaker']
  /** Conditional variants first (first match wins); `key` is the unconditional fallback. */
  variants: DraftVariant[]
  key: string
}

export type DraftChoice = Omit<Choice, 'label'>

export interface DraftNode extends Omit<StoryNode, 'lines' | 'choices'> {
  lines: DraftLine[]
  choices?: DraftChoice[]
}

/** One line; pass `[condition, key]` pairs before the fallback key for variants. */
export function say(
  speaker: Line['speaker'],
  ...keys: [...([Condition, string] | string)[]]
): DraftLine {
  const fallback = keys[keys.length - 1]
  if (typeof fallback !== 'string') throw new Error('say(): the last key must be unconditional')
  const variants = keys.slice(0, -1).map((entry) => {
    if (typeof entry === 'string') throw new Error('say(): only the last key may be unconditional')
    return { when: entry[0], key: entry[1] }
  })
  return { speaker, variants, key: fallback }
}

export function build(file: string, drafts: DraftNode[]): StoryNode[] {
  return drafts.map((draft) => {
    const { lines, choices, ...rest } = draft
    const node: StoryNode = {
      ...rest,
      lines: lines.map((line) => ({
        speaker: line.speaker,
        variants: [
          ...line.variants.map((variant) => ({
            when: variant.when,
            text: storyText(file, draft.id, variant.key),
          })),
          { text: storyText(file, draft.id, line.key) },
        ],
      })),
    }
    if (choices) {
      node.choices = choices.map((choice) => ({
        ...choice,
        label: storyText(file, draft.id, `c_${choice.id}`),
      }))
    }
    return node
  })
}
