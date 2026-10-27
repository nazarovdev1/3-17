import { fetchFile, manifest } from '@/assets/loader'

export interface Recording {
  cue: string
  loop: boolean
  variation: string
  buffer: AudioBuffer
}

/** Decode a bounded queue; failed/missing files leave that cue's synth fallback available. */
export async function loadRecordings(
  context: AudioContext,
  accept: (recording: Recording) => void,
  failed: (path: string) => void,
) {
  const queue = manifest.assets
    .filter((a) => a.kind === 'sound' && a.audio)
    .flatMap((a) => Object.values(a.files).map((file) => ({ file, audio: a.audio! })))
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const bytes = await fetchFile(item.file)
        const buffer = await context.decodeAudioData(bytes.slice(0))
        accept({ ...item.audio, variation: item.file.path, buffer })
      } catch {
        failed(item.file.path)
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}
