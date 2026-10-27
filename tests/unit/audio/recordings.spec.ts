import { expect, it, vi } from 'vitest'
import { loadRecordings } from '@/audio/recordings'

const { fetchFile } = vi.hoisted(() => ({ fetchFile: vi.fn() }))
vi.mock('@/assets/loader', () => ({
  fetchFile,
  manifest: {
    assets: [
      {
        kind: 'sound',
        audio: { cue: 'knock', loop: false },
        files: {
          v1: { path: 'good.m4a' },
          v2: { path: 'corrupt.m4a' },
          v3: { path: 'missing.m4a' },
        },
      },
      { kind: 'model', files: { model: { path: 'model.glb' } } },
    ],
  },
}))

it('decodes good variations and isolates fetch/decode failures for synth fallback', async () => {
  fetchFile.mockImplementation((file: { path: string }) => {
    if (file.path === 'missing.m4a') return Promise.reject(new Error('missing'))
    return Promise.resolve(new Uint8Array([file.path === 'good.m4a' ? 1 : 0]).buffer)
  })
  const decoded = {} as AudioBuffer
  const decodeAudioData = vi.fn((bytes: ArrayBuffer) => {
    if (new Uint8Array(bytes)[0] !== 1) return Promise.reject(new Error('corrupt'))
    return Promise.resolve(decoded)
  })
  const accept = vi.fn()
  const failed = vi.fn()
  await loadRecordings({ decodeAudioData } as unknown as AudioContext, accept, failed)
  expect(accept).toHaveBeenCalledExactlyOnceWith({
    cue: 'knock',
    loop: false,
    variation: 'good.m4a',
    buffer: decoded,
  })
  expect(failed.mock.calls.flat().sort()).toEqual(['corrupt.m4a', 'missing.m4a'])
  expect(fetchFile).toHaveBeenCalledTimes(3)
  expect(decodeAudioData).toHaveBeenCalledTimes(2)
})
