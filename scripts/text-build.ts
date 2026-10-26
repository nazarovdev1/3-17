/**
 * Compiles the hand-edited Uzbek YAML (src/content/text/uz/*.yaml) into
 * src/content/text/uz.gen.json, then regenerates SCRIPT_UZ.md from the story.
 *
 *   npm run text:build           write both files
 *   npm run text:build -- --check  fail if either file is out of date (used by lint:text)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'yaml'
import type { Condition, Story } from '../src/core/engine/types'

const root = resolve(import.meta.dirname, '..')
const textDir = join(root, 'src/content/text/uz')
const jsonPath = join(root, 'src/content/text/uz.gen.json')
const scriptPath = join(root, 'SCRIPT_UZ.md')
const check = process.argv.includes('--check')

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix: string, into: Record<string, string>): void {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') flatten(value, path, into)
    else into[path] = String(value ?? '')
  }
}

export function compile(): { json: string; errors: string[] } {
  const errors: string[] = []
  const story: Record<string, Record<string, Record<string, string>>> = {}
  let ui: Record<string, string> = {}
  for (const file of readdirSync(textDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()) {
    const name = file.replace(/\.yaml$/, '')
    let data: unknown
    try {
      data = parse(readFileSync(join(textDir, file), 'utf8'))
    } catch (error) {
      errors.push(`${file}: YAML parse error — ${(error as Error).message}`)
      continue
    }
    if (data === null || typeof data !== 'object') {
      errors.push(`${file}: expected a mapping at the top level`)
      continue
    }
    if (name === 'ui') {
      ui = {}
      flatten(data as Tree, '', ui)
      continue
    }
    const section: Record<string, Record<string, string>> = {}
    for (const [nodeId, lines] of Object.entries(data as Tree)) {
      if (lines === null || typeof lines !== 'object') {
        errors.push(`${file}: "${nodeId}" must be a mapping of line keys`)
        continue
      }
      section[nodeId] = {}
      for (const [key, text] of Object.entries(lines)) {
        if (typeof text === 'object' && text !== null) {
          errors.push(`${file}: ${nodeId}.${key} must be plain text`)
          continue
        }
        section[nodeId][key] = String(text ?? '').trim()
      }
    }
    story[name] = section
  }
  return { json: `${JSON.stringify({ story, ui }, null, 2)}\n`, errors }
}

const SPEAKERS: Record<string, string> = {
  narrator: 'Hikoyachi',
  voice: 'Ovoz',
  player: 'Siz',
  landlord: 'Rustam aka',
  muhabbat: 'Muhabbat opa',
  diary: 'Kundalik',
  mother: 'Onam',
}

/** Flags that only hide a choice after it was used once. */
const ONCE =
  /^(inspected_|tea_n|saw_|found_diary|listened_|phone_done_|clock_examined|chain_checked|knows_|took_bundle|corridor_looped)/

/** Plain-language names for the flags the owner meets in SCRIPT_UZ.md. */
const FLAGS: Record<string, string> = {
  knows_48: 'Muhabbat opadan 48 haqida soʻralgan',
  knows_sardor: 'Muhabbat opadan Sardor haqida soʻralgan',
  answered_n3: '3-tunda ovozga javob berilgan',
  draft_written: '«Yaxshiman, ona» deb yozilgan',
  took_bundle: 'tugun ichkariga olingan',
  entered_48: 'qirq sakkizga kirilgan',
  asked_sardor: '«Sardormisan?» deb soʻralgan',
  asked_why: '«Qayerdan bilasan?» deb soʻralgan',
  clock_examined: 'soat koʻrilgan',
  n4_dark: '3:17 dan keyin',
  saw_figure: 'eshik koʻzidan qaralgan',
  saw_mirror: 'oynaga qaralgan',
  saw_calendar: 'kalendar koʻrilgan',
  corridor_looped: 'dahlizda toʻxtab, orqaga qaralgan',
  found_diary4: '4-sahifa topilgan',
  n1_reaction: '1-tundagi munosabat',
}

const PROFILE: Record<string, string> = {
  fear: 'anketada qoʻrquv',
  livesAlone: 'anketada «yolgʻiz yashaysizmi»',
  doorAtNight: 'anketada eshik',
}

function describe(condition: Condition): string {
  if ('all' in condition) return condition.all.map(describe).join(' va ')
  if ('any' in condition) return `(${condition.any.map(describe).join(' yoki ')})`
  if ('not' in condition) {
    const inner = condition.not
    if ('flag' in inner && ONCE.test(inner.flag)) return 'bir marta'
    if ('flag' in inner && inner.flag === 'n4_dark') return '3:17 dan oldin'
    if ('hasItem' in inner && inner.hasItem.startsWith('mom_msg_'))
      return `onaning ${inner.hasItem.slice(8)}-xabari hali eshitilmagan`
    return `${describe(inner)} — EMAS`
  }
  if ('flag' in condition) {
    const name = FLAGS[condition.flag] ?? `«${condition.flag}»`
    return condition.eq === undefined
      ? name
      : `${name}: ${typeof condition.eq === 'string' ? condition.eq : JSON.stringify(condition.eq)}`
  }
  if ('sanityGte' in condition) return `es-hush ≥ ${condition.sanityGte}`
  if ('sanityLt' in condition) return `es-hush < ${condition.sanityLt}`
  if ('hasItem' in condition) {
    const id = condition.hasItem
    return id.startsWith('mom_msg_') ? `onaning ${id.slice(8)}-xabari eshitilgan` : `bor: ${id}`
  }
  const { prefix, count } =
    'itemCountGte' in condition ? condition.itemCountGte : { prefix: '', count: 0 }
  if ('itemCountGte' in condition) {
    if (prefix === 'diary_') return `kundalik sahifalari ≥ ${count}`
    if (prefix === 'mom_msg_') return `onaning barcha ${count} xabari eshitilgan`
    return `${prefix}… soni ≥ ${count}`
  }
  return `${PROFILE[condition.profile] ?? condition.profile}: ${condition.eq}`
}

async function renderScript(): Promise<string> {
  const { story } = (await import(
    pathToFileURL(join(root, 'src/content/story/index.ts')).href
  )) as {
    story: Story
  }
  const { ui } = (await import(pathToFileURL(join(root, 'src/content/text/index.ts')).href)) as {
    ui: (key: string) => string
  }
  const out: string[] = [
    '# 3:17 — oʻzbekcha ssenariy',
    '',
    '> Bu fayl avtomatik yaratiladi (`npm run text:build`). Uni tahrirlamang — matnni',
    '> `src/content/text/uz/*.yaml` fayllarida oʻzgartiring. Har bir sahna sarlavhasida',
    '> tugun nomi (`n1_start`) va YAML kaliti koʻrsatilgan.',
    '',
  ]
  let night = 0
  for (const node of Object.values(story.nodes)) {
    if (node.ending && night !== 6) {
      night = 6
      out.push('---', '', '## Yakunlar', '')
    } else if (!node.ending && node.night !== night) {
      night = node.night
      out.push('---', '', `## ${night}-tun — ${ui(`nights.${night}`)}`, '')
    }
    const items = (node.onEnter ?? []).filter((e) => e.type === 'item').map((e) => e.id)
    out.push(`### \`${node.id}\` · ${ui(`locations.${node.location}`)}`)
    if (items.length) out.push(`*Topiladi: ${items.join(', ')}*`)
    out.push('')
    for (const [index, line] of node.lines.entries()) {
      const speaker = SPEAKERS[line.speaker] ?? line.speaker
      const variants = line.variants
      if (variants.length === 1) {
        out.push(`**${speaker}:** ${variants[0]!.text}  `)
      } else {
        out.push(`**${speaker}** (variantlar, l${index + 1}):`)
        for (const variant of variants) {
          const when = variant.when ? `agar ${describe(variant.when)}` : 'boshqa hollarda'
          out.push(`- *${when}:* ${variant.text}`)
        }
      }
    }
    out.push('')
    if (node.choices) {
      out.push('Tanlovlar:')
      for (const choice of node.choices) {
        const when = choice.when ? ` *(faqat: ${describe(choice.when)})*` : ''
        out.push(`1. ${choice.label} → \`${choice.to}\`${when}`)
      }
      out.push('')
    } else if (node.next) {
      out.push(`→ \`${node.next}\``, '')
    } else if (node.ending) {
      out.push(`**Yakun ${node.ending}: ${ui(`endings.${node.ending}.title`)}**`, '')
    }
  }
  return `${out.join('\n').trimEnd()}\n`
}

const { json, errors } = compile()
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`)
  process.exit(1)
}
const current = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf8') : ''
if (check) {
  if (current !== json) {
    console.error('✗ uz.gen.json is out of date with the YAML. Run: npm run text:build')
    process.exit(1)
  }
} else if (current !== json) {
  writeFileSync(jsonPath, json)
}
const script = await renderScript()
const currentScript = existsSync(scriptPath) ? readFileSync(scriptPath, 'utf8') : ''
if (check) {
  if (currentScript !== script) {
    console.error('✗ SCRIPT_UZ.md is out of date. Run: npm run text:build')
    process.exit(1)
  }
  console.log('✓ generated text is up to date')
} else {
  if (currentScript !== script) writeFileSync(scriptPath, script)
  console.log('✓ uz.gen.json and SCRIPT_UZ.md written')
}
