// Development-only waveform inspection; never ships to the game.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { SOUND_SOURCES } from './sound-sources'

const analyses = []
for (const entry of SOUND_SOURCES) {
  const path = `.asset-cache/${entry.id}/source.mp3`
  const result = spawnSync(
    process.env.FFMPEG_PATH ?? 'ffmpeg',
    ['-v', 'error', '-i', path, '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1'],
    { maxBuffer: 32 * 1024 * 1024, windowsHide: true },
  )
  if (result.status !== 0) throw new Error(`Cannot decode ${entry.id}`)
  const pcm = new Float32Array(
    result.stdout.buffer,
    result.stdout.byteOffset,
    result.stdout.byteLength / 4,
  )
  const envelope: number[] = []
  for (let i = 0; i < pcm.length; i += 160) {
    let power = 0
    for (let j = i; j < Math.min(i + 160, pcm.length); j++) power += pcm[j]! ** 2
    envelope.push(Math.sqrt(power / 160))
  }
  const max = Math.max(...envelope)
  const segments: [number, number][] = []
  let last = -100
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i]! < max * 0.3) continue
    if (i - last > 10) segments.push([Math.max(0, i * 0.02 - 0.04), i * 0.02 + 0.08])
    else segments[segments.length - 1]![1] = i * 0.02 + 0.08
    last = i
  }
  const meta = JSON.parse(readFileSync(`.asset-cache/${entry.id}/meta.json`, 'utf8')) as {
    title: string
  }
  analyses.push({
    id: entry.id,
    title: meta.title,
    duration: pcm.length / 8000,
    max,
    segments,
    envelope,
  })
  console.log(
    entry.id,
    'segments',
    JSON.stringify(
      segments.slice(0, 18).map(([a, b]) => [Number(a.toFixed(2)), Number(b.toFixed(2))]),
    ),
  )
}
writeFileSync('.asset-cache/sound-waveforms.json', JSON.stringify(analyses))
