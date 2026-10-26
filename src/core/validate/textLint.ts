/**
 * Uzbek text rules (FIX_PROMPT 6.3), shared by `npm run lint:text` and unit tests.
 * Pure functions: no file system, no DOM.
 */
export interface TextEntry {
  /** Where the text lives, e.g. `night-1/n1_start.l2` or `ui/title.new_game`. */
  id: string
  text: string
  /** Story lines take part in the repeated-phrase check; choices and UI do not. */
  kind: 'line' | 'choice' | 'ui'
}

export const MAX_SENTENCE_WORDS = 25
export const MAX_PHRASE_REPEATS = 2
export const PHRASE_LENGTH = 4

const LETTER = '\\p{L}ʻ’'
const WORD_RE = new RegExp(`[${LETTER}0-9:]+`, 'gu')

/** Clichés and calques that tell the feeling instead of showing it (matched as word prefixes). */
export const FORBIDDEN_PHRASES = [
  'yuragim tez ura',
  'yuragi tez ura',
  'yuragingiz tez ura',
  'yuragingizning urishi',
  'sovuq ter',
  'qoʻrquv meni qamrab',
  'qoʻrquv qamrab',
  'qoʻrquvga tushdi',
  'dahshat',
  'vahima',
  'sirli',
  'oʻzimni yomon his',
  'menda bir savol bor',
  'juda qoʻrqinchli',
  'qanday qilib bu yerga',
  'shunday emasmi',
  'oq shovqin',
  'reallik',
  'kozachok',
  'oʻrtoq',
  'normal',
] as const

/** Common English words; Uzbek Latin also never uses "w", nor "c" outside "ch". */
const ENGLISH = new Set(
  (
    'the and of to is are was were you your it this that with for not have has be will can do ' +
    'does did okay ok hello hi sorry please yes my me we they he she him her what who why how ' +
    'when where there here from about into out up down just like love home door night wall ' +
    'phone mother voice game play start settings loading error'
  ).split(' '),
)

/** The few words where the tutuq ’ really follows an "o". */
const TUTUQ_AFTER_O = ['mo’jiz', 'mo’tadil', 'mo’min', 'mo’l', 'mo’ljal']

/** Key names on the keyboard are allowed in UI hints. */
const ALLOWED_FOREIGN = new Set(['wasd', 'esc'])

function words(text: string): string[] {
  // {placeholders} are filled in by the game; they are not words.
  return (text.replace(/\{\w+\}/g, ' ').match(WORD_RE) ?? []).map((w) => w.toLowerCase())
}

function sentences(text: string): string[] {
  return text
    .replace(/[«»“”"()]/g, ' ')
    .split(/[.!?…]+|—/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalize(text: string): string {
  return ` ${words(text).join(' ')}`
}

export function lintEntry(entry: TextEntry): string[] {
  const errors: string[] = []
  const { id, text } = entry
  if (text.trim() === '') errors.push(`${id}: empty text`)
  if (/[Ѐ-ӿ]/.test(text)) errors.push(`${id}: Cyrillic letters`)
  for (const bad of ["'", '`', 'ʼ', '‘']) {
    if (text.includes(bad))
      errors.push(
        `${id}: wrong apostrophe "${bad}" — use ʻ (U+02BB) in oʻ/gʻ and ’ (U+2019) for tutuq`,
      )
  }
  for (const match of text.matchAll(/(.)ʻ/gu)) {
    if (!/[oOgG]/.test(match[1] ?? ''))
      errors.push(`${id}: ʻ (U+02BB) after "${match[1]}" — it belongs only in oʻ and gʻ`)
  }
  for (const word of words(text)) {
    if (/g’/.test(word) || (/o’/.test(word) && !TUTUQ_AFTER_O.some((ok) => word.startsWith(ok))))
      errors.push(`${id}: "${word}" uses ’ where oʻ/gʻ needs ʻ (U+02BB)`)
  }
  for (const word of words(text)) {
    if (ALLOWED_FOREIGN.has(word)) continue
    if (ENGLISH.has(word) || word.includes('w') || /c(?!h)/.test(word))
      errors.push(`${id}: foreign word "${word}"`)
  }
  const normalized = normalize(text)
  for (const phrase of FORBIDDEN_PHRASES) {
    if (normalized.includes(` ${phrase}`)) errors.push(`${id}: forbidden cliché "${phrase}"`)
  }
  for (const sentence of sentences(text)) {
    const count = words(sentence).length
    if (count > MAX_SENTENCE_WORDS)
      errors.push(`${id}: sentence of ${count} words (max ${MAX_SENTENCE_WORDS}): "${sentence}"`)
  }
  return errors
}

/** Story lines only: the same 4-word phrase more than twice across the script. */
export function repeatedPhrases(entries: readonly TextEntry[]): string[] {
  const seen = new Map<string, string[]>()
  for (const entry of entries) {
    if (entry.kind !== 'line') continue
    for (const sentence of sentences(entry.text)) {
      const tokens = words(sentence)
      for (let i = 0; i + PHRASE_LENGTH <= tokens.length; i++) {
        const phrase = tokens.slice(i, i + PHRASE_LENGTH).join(' ')
        const where = seen.get(phrase) ?? []
        where.push(entry.id)
        seen.set(phrase, where)
      }
    }
  }
  const errors: string[] = []
  for (const [phrase, where] of seen) {
    if (where.length > MAX_PHRASE_REPEATS)
      errors.push(
        `phrase "${phrase}" repeated ${where.length}× (max ${MAX_PHRASE_REPEATS}): ${where.join(', ')}`,
      )
  }
  return errors
}

export function lintTexts(entries: readonly TextEntry[]): string[] {
  return [...entries.flatMap(lintEntry), ...repeatedPhrases(entries)]
}

/** Average words per sentence across story lines (the target is about 14 or fewer). */
export function averageSentenceLength(entries: readonly TextEntry[]): number {
  const lengths = entries
    .filter((e) => e.kind === 'line')
    .flatMap((e) => sentences(e.text).map((s) => words(s).length))
  return lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
}
