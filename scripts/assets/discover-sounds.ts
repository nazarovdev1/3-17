// Development-only candidate discovery. Selection stays pinned in sound-sources.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { freesoundKey, freesoundLicense } from './sound'

const defaults = [
  'footsteps parquet',
  'footsteps wooden floor',
  'footsteps tiles',
  'footsteps concrete',
  'door hinge creak',
  'door close',
  'door chain',
  'radiator knock',
  'fridge hum',
  'fridge stop',
  'kettle boiling',
  'pour tea',
  'paper page turn',
  'pen writing',
  'light switch',
  'wall knock',
  'cloth rustle',
  'breathing',
  'heartbeat',
  'phone vibration',
  'tv static',
  'television muffled',
  'winter city ambience',
  'wind window',
  'clock tick',
]
const queries = process.argv.length > 2 ? process.argv.slice(2) : defaults
interface Candidate {
  id: number
  name: string
  username: string
  license: string
  duration: number
  description: string
  previews: Record<string, string>
  url: string
}
const dir = join(import.meta.dirname, '..', '..', '.asset-cache')
const cache = join(dir, 'sound-search.json')
const results = (existsSync(cache) ? JSON.parse(readFileSync(cache, 'utf8')) : {}) as Record<
  string,
  Candidate[]
>
for (const query of queries) {
  const params = new URLSearchParams({
    query,
    filter: 'license:"Creative Commons 0"',
    fields: 'id,name,username,license,duration,description,previews,url',
    page_size: '5',
    sort: 'score',
  })
  const response = await fetch(`https://freesound.org/apiv2/search/text/?${params}`, {
    headers: { Authorization: `Token ${freesoundKey()}` },
  })
  if (!response.ok) throw new Error(`Freesound search status ${response.status}`)
  const data = (await response.json()) as { results: Candidate[] }
  results[query] = data.results.filter((c) => {
    try {
      return freesoundLicense(c.license) === 'CC0-1.0'
    } catch {
      return false
    }
  })
  console.log(
    query,
    results[query].map((c) => `${c.id} ${c.name} (${c.username}, ${c.duration}s)`).join(' | '),
  )
}
mkdirSync(dir, { recursive: true })
writeFileSync(cache, JSON.stringify(results, null, 2))
