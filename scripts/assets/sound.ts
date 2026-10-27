import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AssetLicense, AssetSourceEntry } from './sources'

/** Exact URL allowlist: BY-SA, BY-NC, BY-ND and unknown versions fail closed. */
export function freesoundLicense(url: string): AssetLicense {
  const normalized = url.replace(/^http:/, 'https:').replace(/\/$/, '')
  if (normalized === 'https://creativecommons.org/publicdomain/zero/1.0') return 'CC0-1.0'
  const match = /^https:\/\/creativecommons\.org\/licenses\/by\/(1\.0|2\.0|2\.5|3\.0|4\.0)$/.exec(
    normalized,
  )
  if (match) return `CC-BY-${match[1]}` as AssetLicense
  throw new Error('Freesound license refused: only CC0 or CC-BY is permitted')
}

/** Read locally; credentials never enter URLs, cache metadata, or error messages. */
export function freesoundKey(): string {
  const path = join(import.meta.dirname, '..', '..', '.env.local')
  const local = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const value =
    process.env.FREESOUND_API_KEY ?? /^FREESOUND_API_KEY=(.+)$/m.exec(local)?.[1]?.trim()
  if (!value) throw new Error('FREESOUND_API_KEY is not set (env or .env.local)')
  return value.replace(/^(["'])(.*)\1$/, '$2')
}

export interface FreesoundInfo {
  id: number
  name: string
  username: string
  url: string
  license: string
  duration: number
  previews: Record<string, string>
}

export function validateSound(entry: AssetSourceEntry, info: FreesoundInfo) {
  if (entry.kind !== 'sound' || entry.source !== 'freesound')
    throw new Error(`${entry.id}: invalid sound source`)
  if (!/^\d+$/.test(entry.remoteId) || String(info.id) !== entry.remoteId)
    throw new Error(`${entry.id}: Freesound id mismatch`)
  if (freesoundLicense(info.license) !== entry.license)
    throw new Error(`${entry.id}: Freesound license differs from pinned license`)
  if (!info.username || !info.name || !/^https:\/\/freesound.org\//.test(info.url))
    throw new Error(`${entry.id}: incomplete Freesound attribution`)
  if (
    !entry.sound?.clips.length ||
    entry.sound.clips.some(
      (c) =>
        !Number.isFinite(c.start) ||
        c.start < 0 ||
        !Number.isFinite(c.duration) ||
        c.duration <= 0 ||
        c.duration > 60 ||
        c.start + c.duration > info.duration + 0.025,
    )
  )
    throw new Error(`${entry.id}: invalid sound excerpts`)
  if (!Number.isFinite(info.duration) || info.duration <= 0)
    throw new Error(`${entry.id}: invalid source duration`)
  const repeat = entry.sound.repeat
  if (
    repeat &&
    (!entry.sound.loop ||
      !Number.isInteger(repeat.count) ||
      repeat.count < 1 ||
      !Number.isFinite(repeat.every) ||
      repeat.every <= 0 ||
      repeat.count * repeat.every > 60 ||
      entry.sound.clips.some((c) => c.duration > repeat.every))
  )
    throw new Error(`${entry.id}: invalid repeat timing`)
}

/** Lossless short effects preserve transients; long ambience uses compact AAC-LC/M4A. */
export function encodeSound(
  input: string,
  output: string,
  start: number,
  duration: number,
  loop: boolean,
  eq: { lowpassHz?: number; highpassHz?: number; repeat?: { every: number; count: number } } = {},
) {
  const run = (args: string[]) => {
    const result = spawnSync(process.env.FFMPEG_PATH ?? 'ffmpeg', args, {
      encoding: 'utf8',
      windowsHide: true,
    })
    if (result.error || result.status !== 0)
      throw new Error('Sound encoding failed; install ffmpeg or set FFMPEG_PATH')
    return result.stderr
  }
  const base = [
    '-hide_banner',
    '-nostdin',
    '-ss',
    String(start),
    '-t',
    String(duration),
    '-i',
    input,
    '-ac',
    '1',
  ]
  const preprocessing = [
    'aformat=sample_fmts=dblp:channel_layouts=mono',
    'asidedata=mode=delete',
    'aresample=32000',
    ...(eq.highpassHz ? [`highpass=f=${eq.highpassHz}`] : []),
    ...(eq.lowpassHz ? [`lowpass=f=${eq.lowpassHz}`] : []),
    ...(eq.repeat
      ? [
          `afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, duration - 0.004)}:d=0.004`,
          `apad=whole_dur=${eq.repeat.every},atrim=duration=${eq.repeat.every}`,
          `aloop=loop=${eq.repeat.count - 1}:size=${Math.round(32000 * eq.repeat.every)}`,
        ]
      : []),
  ].join(',')
  const outputDuration = eq.repeat ? eq.repeat.every * eq.repeat.count : duration
  const lossless = !loop || !!eq.repeat
  let norm: string
  if (!loop) {
    // Integrated LUFS is undefined for very short switches/footfalls. Match their peaks.
    const analysis = run([...base, '-af', `${preprocessing},volumedetect`, '-f', 'null', '-'])
    const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(analysis)?.[1]
    if (!peak || !Number.isFinite(Number(peak))) throw new Error('Sound excerpt is silent')
    norm = `volume=${-6 - Number(peak)}dB:precision=double`
  } else {
    const target = -23
    const analysis = run([
      ...base,
      '-af',
      `${preprocessing},loudnorm=I=${target}:TP=-3:LRA=7:print_format=json`,
      '-f',
      'null',
      '-',
    ])
    const measurement = /\{\s*"input_i"[\s\S]*?\}/.exec(analysis)?.[0]
    if (!measurement) throw new Error('Missing loudness measurement')
    const m = JSON.parse(measurement) as Record<string, string>
    if (
      ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'].some(
        (k) => !Number.isFinite(Number(m[k])),
      )
    )
      throw new Error('Sound excerpt is silent or cannot be loudness-normalised')
    norm = `loudnorm=I=${target}:TP=-3:LRA=7:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  }
  // A short edge fade avoids loop clicks without carrying a tail into outage silence.
  const fade = loop ? 0.08 : 0.004
  const edgeFade = eq.repeat
    ? ''
    : `afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, outputDuration - fade)}:d=${fade},`
  const encode = (correction = 0) =>
    run([
      ...base,
      '-af',
      `${preprocessing},${norm},${edgeFade}volume=${correction}dB:precision=double`,
      '-ar',
      '32000',
      '-c:a',
      lossless ? 'flac' : 'aac',
      ...(!lossless
        ? ['-aac_pns', '0', '-b:a', '96k', '-movflags', '+faststart']
        : ['-compression_level', '8', '-sample_fmt', 's16']),
      '-map_metadata',
      '-1',
      '-map_metadata:s:a',
      '-1',
      '-y',
      output,
    ])
  encode()
  {
    // Measure the actual shipped decode, including resampling and codec changes.
    let correction = 0
    for (let attempt = 0; attempt < 12; attempt++) {
      const analysis = run([
        '-hide_banner',
        '-nostdin',
        '-i',
        output,
        '-af',
        loop ? 'loudnorm=print_format=json' : 'volumedetect',
        '-f',
        'null',
        '-',
      ])
      const peak = Number(
        (loop ? /"input_i"\s*:\s*"([\d.-]+)"/ : /max_volume:\s*(-?[\d.]+) dB/).exec(analysis)?.[1],
      )
      if (!Number.isFinite(peak)) throw new Error('Encoded sound has no measurable peak')
      const target = loop ? -23 : -6
      if (Math.abs(peak - target) <= 0.5) return
      if (attempt === 11)
        throw new Error(`Encoded sound peak did not converge (${peak} dBFS): ${output}`)
      correction += (target - peak) * 0.5
      encode(correction)
    }
  }
}
