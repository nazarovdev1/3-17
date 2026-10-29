/**
 * npm run validate:beats — every night and ending names only words, objects and zones that
 * exist; subtitles, diary pages and night budgets hold (REDESIGN §4, docs/BEATS.md).
 */
import { SEQUENCES, READABLES } from '../src/content/nights'
import { scriptKeys, wordsOf } from '../src/content/text'
import { BODY_TARGETS, objectPoint, PHONE_TARGETS } from '../src/content/world/objects'
import { ZONE_IDS } from '../src/content/world/zones'
import { validateSequences, worstCaseWords, textUses } from '../src/core/validate/beats'

const zones = ZONE_IDS
const virtual = new Set([
  'sofa',
  'fridge',
  'knock_prompt',
  'rustam',
  'opposite',
  'torch',
  'landing',
])
const errors = validateSequences(SEQUENCES, {
  scriptKeys: new Set(scriptKeys()),
  readables: READABLES,
  objectExists: (id) =>
    !!objectPoint(id) || PHONE_TARGETS.has(id) || BODY_TARGETS.has(id) || virtual.has(id),
  zoneExists: (id) => zones.has(id),
  wordsOf,
})
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  process.exit(1)
}
const per = Object.values(SEQUENCES).map(
  (s) =>
    `${s.id} ${worstCaseWords(
      textUses(s, { readables: READABLES }).map((u) => u.key),
      wordsOf,
    )}`,
)
console.log(
  `validate:beats: OK (${Object.keys(SEQUENCES).length} sequences · words ${per.join(' · ')})`,
)
