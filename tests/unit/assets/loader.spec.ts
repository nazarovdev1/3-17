import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  bytesIn,
  fetchFile,
  filesIn,
  preloadGroup,
  resetAssetCache,
  cachedBuffer,
  type LoadProgress,
} from '@/assets/loader'

/** A fetch mock that streams each file's declared size in 3 chunks. */
function streamingFetch(fail: (url: string, call: number) => boolean = () => false) {
  const calls = new Map<string, number>()
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const call = (calls.get(url) ?? 0) + 1
    calls.set(url, call)
    if (fail(url, call)) return new Response(null, { status: 503 })
    const path = url.replace(/^\//, '').replace(/\?v=.*$/, '')
    const file = filesIn('flat47')
      .concat(filesIn('stairwell'), filesIn('flat48'))
      .find((f) => f.path === path)!
    const third = Math.ceil(file.bytes / 3)
    let sent = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= file.bytes) return controller.close()
        const n = Math.min(third, file.bytes - sent)
        controller.enqueue(new Uint8Array(n))
        sent += n
      },
    })
    return new Response(body, { status: 200 })
  })
}

beforeEach(() => resetAssetCache())
afterEach(() => vi.unstubAllGlobals())

it('preloads a group with monotonic byte progress ending at the exact total', async () => {
  vi.stubGlobal('fetch', streamingFetch())
  const seen: LoadProgress[] = []
  await preloadGroup('stairwell', (p) => seen.push({ ...p }))
  const total = bytesIn('stairwell')
  expect(seen[0]).toEqual({ loaded: 0, total })
  expect(seen.at(-1)).toEqual({ loaded: total, total })
  for (let i = 1; i < seen.length; i++)
    expect(seen[i]!.loaded).toBeGreaterThanOrEqual(seen[i - 1]!.loaded)
  // Streamed in chunks, so progress moved more than once per file.
  expect(seen.length).toBeGreaterThan(filesIn('stairwell').length * 2)
  for (const f of filesIn('stairwell')) expect(cachedBuffer(f)?.byteLength).toBe(f.bytes)
})

it('requests same-origin, hash-versioned URLs only', async () => {
  const fetchMock = streamingFetch()
  vi.stubGlobal('fetch', fetchMock)
  await preloadGroup('flat48')
  for (const [url] of fetchMock.mock.calls) {
    expect(url as string).toMatch(/^\/assets\/[^:]+\?v=[0-9a-f]{16}$/)
  }
})

it('retries a failed file and keeps progress honest', async () => {
  vi.stubGlobal(
    'fetch',
    streamingFetch((_, call) => call === 1),
  )
  const seen: LoadProgress[] = []
  await preloadGroup('flat48', (p) => seen.push({ ...p }))
  expect(seen.at(-1)!.loaded).toBe(bytesIn('flat48'))
  expect(Math.max(...seen.map((p) => p.loaded))).toBe(bytesIn('flat48'))
})

it('gives up after three attempts', async () => {
  vi.stubGlobal(
    'fetch',
    streamingFetch(() => true),
  )
  await expect(fetchFile(filesIn('flat48')[0]!)).rejects.toThrow(/503/)
})

it('fetches a file once even when asked twice at the same time', async () => {
  const fetchMock = streamingFetch()
  vi.stubGlobal('fetch', fetchMock)
  const file = filesIn('flat48')[0]!
  await Promise.all([fetchFile(file), fetchFile(file)])
  await fetchFile(file)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
