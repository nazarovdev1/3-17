/**
 * npm run lint:text — checks every Uzbek string (FIX_PROMPT 6.3, REDESIGN §4) and the YAML keys:
 * generated files in sync, no missing or unused keys, Cyrillic, English words, wrong
 * apostrophes, forbidden clichés, sentences over 25 words, 4-word phrases repeated > 2 times.
 * The second-person ban applies to everything that is not spoken by the voice, Muhabbat opa,
 * Rustam aka or the mother (owner decision R0 §5): there is no narration left to break it.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { SEQUENCES, READABLES } from '../src/content/nights'
import { DYNAMIC_UI_PREFIXES, line, missingKeys, scriptKeys, ui, uiKeys } from '../src/content/text'
import { averageSentenceLength, lintTexts, type TextEntry } from '../src/core/validate/textLint'
import { textUses } from '../src/core/validate/beats'

const root = resolve(import.meta.dirname, '..')
const errors: string[] = []

try {
  execFileSync(
    process.execPath,
    [join(root, 'node_modules/tsx/dist/cli.mjs'), 'scripts/text-build.ts', '--check'],
    { cwd: root, stdio: 'pipe' },
  )
} catch (error) {
  const out = (error as { stderr?: Buffer }).stderr?.toString().trim()
  errors.push(out || 'generated text is out of date — run npm run text:build')
}

// Script keys: every in-world word is used by a night, an ending or a paper.
const uses = Object.values(SEQUENCES).flatMap((s) => textUses(s, { readables: READABLES }))
const used = new Set(uses.map((u) => u.key))
for (const paper of Object.values(READABLES)) for (const key of paper.lines) used.add(key)
for (const key of scriptKeys()) if (!used.has(key)) errors.push(`unused script.yaml key: ${key}`)

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
const SPOKEN = new Set(['voice', 'muhabbat', 'landlord', 'mother'])
const SECOND_PERSON = /\p{L}*(?:dingiz|dingizmi|yapsiz|yapsizmi)\b/iu
const entries: TextEntry[] = []
const speakerOf = new Map(uses.map((u) => [u.key, u.speaker]))
for (const key of scriptKeys()) {
  const text = line(key, 'Dilnoza')
  entries.push({ id: `script/${key}`, text, kind: 'line' })
  const speaker = speakerOf.get(key)
  const spoken = speaker !== undefined && SPOKEN.has(speaker)
  const paper = key.startsWith('K-') || key === 'N1-09' || key === 'N1-10' || key === 'N1-11'
  const transcript = uses.some((u) => u.key === key && u.kind === 'phone')
  if (!spoken && !paper && !transcript && SECOND_PERSON.test(text))
    errors.push(`script/${key}: second person outside speech ("${text.match(SECOND_PERSON)![0]}")`)
}
for (const key of yamlUi) {
  const text = ui(key)
  entries.push({ id: `ui/${key}`, text, kind: 'ui' })
  if (SECOND_PERSON.test(text) && !key.startsWith('form.') && !key.startsWith('warning.'))
    errors.push(`ui/${key}: second person in UI text ("${text.match(SECOND_PERSON)![0]}")`)
}
errors.push(...lintTexts(entries))
for (const key of missingKeys) errors.push(`missing YAML key: ${key}`)

const average = averageSentenceLength(entries)
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\n${errors.length} text problem(s).`)
  process.exit(1)
}
console.log(
  `✓ ${entries.length} texts clean · average sentence ${average.toFixed(1)} words (target ≤ 14)`,
)
