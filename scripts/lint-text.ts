/**
 * npm run lint:text — checks every Uzbek string (FIX_PROMPT 6.3) and the YAML keys:
 * generated files in sync, no missing or unused keys, Cyrillic, English words, wrong
 * apostrophes, forbidden clichés, sentences over 25 words, 4-word phrases repeated > 2 times.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { story } from '../src/content/story'
import {
  DYNAMIC_UI_PREFIXES,
  allStoryKeys,
  missingKeys,
  ui,
  uiKeys,
  usedKeys,
} from '../src/content/text'
import { averageSentenceLength, lintTexts, type TextEntry } from '../src/core/validate/textLint'

const root = resolve(import.meta.dirname, '..')
const errors: string[] = []

try {
  execFileSync(
    process.execPath,
    [join(root, 'node_modules/tsx/dist/cli.mjs'), 'scripts/text-build.ts', '--check'],
    {
      cwd: root,
      stdio: 'pipe',
    },
  )
} catch (error) {
  const out = (error as { stderr?: Buffer }).stderr?.toString().trim()
  errors.push(out || 'generated text is out of date — run npm run text:build')
}

// Story keys: every key used by the story exists; every YAML key is used.
for (const key of missingKeys) errors.push(`missing YAML key: ${key}`)
for (const key of allStoryKeys()) {
  if (!usedKeys.has(key)) errors.push(`unused YAML key (typo or leftover?): ${key}`)
}

// UI keys: literal ui('…') calls in the source, plus documented dynamic families.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}
const yamlUi = new Set(uiKeys())
const literalUi = new Set<string>()
for (const file of sourceFiles(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\bui\(\s*'([^'$]+)'/g)) {
    if (!yamlUi.has(match[1]!)) errors.push(`missing ui.yaml key: ${match[1]}`)
  }
  // Any string literal equal to a key counts as a use, so ui(c ? 'a.x' : 'a.y') is covered.
  for (const match of source.matchAll(/'([a-z0-9_]+(?:\.[a-z0-9_]+)+)'/gi)) literalUi.add(match[1]!)
}
for (const key of yamlUi) {
  if (!literalUi.has(key) && !DYNAMIC_UI_PREFIXES.some((p) => key.startsWith(p)))
    errors.push(`unused ui.yaml key: ${key}`)
}

// Language rules.
const entries: TextEntry[] = []
for (const node of Object.values(story.nodes)) {
  for (const [index, line] of node.lines.entries()) {
    for (const [v, variant] of line.variants.entries())
      entries.push({
        id: `${node.id}.l${index + 1}${v ? `#${v}` : ''}`,
        text: variant.text,
        kind: 'line',
      })
  }
  for (const choice of node.choices ?? [])
    entries.push({ id: `${node.id}.c_${choice.id}`, text: choice.label, kind: 'choice' })
}
for (const key of yamlUi) entries.push({ id: `ui/${key}`, text: ui(key), kind: 'ui' })
errors.push(...lintTexts(entries))

const average = averageSentenceLength(entries)
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\n${errors.length} text problem(s).`)
  process.exit(1)
}
console.log(
  `✓ ${entries.length} texts clean · average sentence ${average.toFixed(1)} words (target ≤ 14)`,
)
