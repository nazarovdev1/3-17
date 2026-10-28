/**
 * Compiles the hand-edited Uzbek YAML (src/content/text/uz/*.yaml) into
 * src/content/text/uz.gen.json. It never writes SCRIPT_UZ.md: since the redesign (R0) that
 * file is the hand-written in-world script, and nothing may regenerate it from code.
 *
 *   npm run text:build             write uz.gen.json
 *   npm run text:build -- --check  fail if uz.gen.json is out of date (used by lint:text)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const textDir = join(root, 'src/content/text/uz')
const jsonPath = join(root, 'src/content/text/uz.gen.json')
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
if (check) console.log('✓ generated text is up to date')
else console.log('✓ uz.gen.json written')
