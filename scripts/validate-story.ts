/**
 * Story graph validation (spec 12). Fails on structural, reachability, ending
 * and diary problems. Before Phase 2 there is no content module yet, so this
 * exits 0 with a note instead of failing the pipeline.
 */
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { validateStory } from '../src/core/validate/validate'
import type { Story } from '../src/core/engine/types'

const storyPath = resolve(import.meta.dirname, '../src/content/story/index.ts')

if (!existsSync(storyPath)) {
  console.log('validate-story: src/content/story/index.ts not authored yet (before Phase 2); OK')
  process.exit(0)
}

const module = (await import(pathToFileURL(storyPath).href)) as { story: Story }
const outcome = validateStory(module.story)

for (const warning of outcome.warnings) {
  console.warn(`WARN: ${warning}`)
}
if (!outcome.ok) {
  for (const error of outcome.errors) {
    console.error(`ERROR: ${error}`)
  }
  console.error(`validate-story: FAILED with ${outcome.errors.length} error(s)`)
  process.exit(1)
}
console.log(
  `validate-story: OK (${Object.keys(module.story.nodes).length} nodes, ${outcome.warnings.length} warning(s))`,
)
