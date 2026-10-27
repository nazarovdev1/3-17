// Offline acoustic measurements of the actual shipped recordings, not source previews.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AssetManifest } from '../../src/assets/types'

const codec = process.env.FFMPEG_PATH ?? 'ffmpeg'
const probe = process.env.FFMPEG_PATH
  ? join(dirname(codec), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')
  : 'ffprobe'
const manifest = JSON.parse(readFileSync('src/assets/manifest.gen.json', 'utf8')) as AssetManifest
const report = []
function run(binary: string, args: string[], raw = false) {
  const result = spawnSync(binary, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error('Audio measurement failed')
  return raw ? result.stdout : result.stderr
}
for (const asset of manifest.assets.filter((a) => a.kind === 'sound')) {
  for (const file of Object.values(asset.files)) {
    const path = join('public', file.path)
    const infoResult = spawnSync(probe, ['-v', 'error', '-show_streams', '-of', 'json', path], {
      encoding: 'utf8',
      windowsHide: true,
    })
    if (infoResult.status !== 0) throw new Error(`${file.path}: cannot inspect stream`)
    const info = JSON.parse(infoResult.stdout) as {
      streams: { channels: number; sample_rate: string }[]
    }
    if (info.streams[0]?.channels !== 1 || info.streams[0].sample_rate !== '32000')
      throw new Error(`${file.path}: expected mono/32 kHz`)
    const measurement = run(codec, [
      '-hide_banner',
      '-nostdin',
      '-i',
      path,
      '-af',
      asset.audio!.loop ? 'loudnorm=print_format=json' : 'volumedetect',
      '-f',
      'null',
      '-',
    ]).toString()
    const value = asset.audio!.loop
      ? Number(/"input_i"\s*:\s*"([\d.-]+)"/.exec(measurement)?.[1])
      : Number(/max_volume:\s*(-?[\d.]+) dB/.exec(measurement)?.[1])
    if (
      !Number.isFinite(value) ||
      Math.abs(value - (asset.audio!.loop ? -23 : -6)) > (asset.audio!.loop ? 0.75 : 0.5)
    )
      throw new Error(`${file.path}: level out of bounds (${value})`)
    const data = run(
      codec,
      ['-v', 'error', '-i', path, '-ac', '1', '-ar', '32000', '-f', 'f32le', 'pipe:1'],
      true,
    )
    const pcm = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4)
    if (!pcm.length || !pcm.every(Number.isFinite)) throw new Error(`${file.path}: invalid PCM`)
    if (asset.audio!.cue === 'fridge_stop' && pcm.length / 32000 > 0.35)
      throw new Error('Fridge stop has a long tail')
    if (asset.audio!.cue === 'clock' && asset.audio!.loop) {
      for (let second = 0; second < 4; second++) {
        const gap = pcm.slice((second + 0.4) * 32000, (second + 0.9) * 32000)
        if (gap.some((n) => Math.abs(n) > 0.00001))
          throw new Error('Clock has no true inter-tick silence')
      }
    }
    report.push({
      path: file.path,
      sha256: file.sha256,
      bytes: file.bytes,
      seconds: pcm.length / 32000,
      level: value,
      unit: asset.audio!.loop ? 'LUFS' : 'dBFS peak',
    })
  }
}
mkdirSync('.asset-cache', { recursive: true })
writeFileSync('.asset-cache/sound-verification.json', JSON.stringify(report, null, 2))
console.log(
  `Verified ${report.length} mono/32 kHz files; -23 ±0.75 LUFS loops, -6 ±0.5 dBFS effects, short fridge stop and silent clock gaps.`,
)
