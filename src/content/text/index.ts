import generated from './uz.gen.json' with { type: 'json' }

/**
 * All Uzbek text lives in `src/content/text/uz/*.yaml` (edited by hand) and is compiled to
 * `uz.gen.json` by `npm run text:build`. Code reads text only through this module.
 *
 * Story sections are `{ nodeId: { key: text } }`; the `ui` section is flattened to dotted keys.
 */
export type StorySection = Record<string, Record<string, string>>

interface Bundle {
  story: Record<string, StorySection>
  ui: Record<string, string>
}

const bundle = generated as Bundle

/** Keys requested by code but absent from the YAML. Reported by the validator, never thrown. */
export const missingKeys: string[] = []
/** Every key code has requested, to report YAML keys that nothing uses. */
export const usedKeys = new Set<string>()

export function storySection(file: string): StorySection {
  return bundle.story[file] ?? {}
}

export function storyFiles(): string[] {
  return Object.keys(bundle.story)
}

/** Resolves one story text; unknown keys render visibly instead of crashing the game. */
export function storyText(file: string, nodeId: string, key: string): string {
  const id = `${file}/${nodeId}.${key}`
  usedKeys.add(id)
  const text = bundle.story[file]?.[nodeId]?.[key]
  if (text === undefined) {
    if (!missingKeys.includes(id)) missingKeys.push(id)
    return `⟦${id}⟧`
  }
  return text
}

/** UI string by dotted key, with optional `{name}` substitutions. */
export function ui(key: string, values?: Record<string, string | number>): string {
  usedKeys.add(`ui/${key}`)
  let text = bundle.ui[key]
  if (text === undefined) {
    if (!missingKeys.includes(`ui/${key}`)) missingKeys.push(`ui/${key}`)
    return `⟦ui/${key}⟧`
  }
  if (values) {
    for (const [name, value] of Object.entries(values))
      text = text.split(`{${name}}`).join(String(value))
  }
  return text
}

/** UI key families looked up with computed keys (e.g. `nights.${n}`); lint:text treats them as used. */
export const DYNAMIC_UI_PREFIXES = [
  'nights.',
  'locations.',
  'endings.',
  'form.alone_',
  'form.fear_',
  'form.door_',
] as const

export function uiKeys(): string[] {
  return Object.keys(bundle.ui)
}

/** All story keys present in the YAML, as `file/node.key`. */
export function allStoryKeys(): string[] {
  const keys: string[] = []
  for (const [file, section] of Object.entries(bundle.story)) {
    for (const [nodeId, lines] of Object.entries(section)) {
      for (const key of Object.keys(lines)) keys.push(`${file}/${nodeId}.${key}`)
    }
  }
  return keys
}
