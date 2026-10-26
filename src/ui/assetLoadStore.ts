import { create } from 'zustand'
import { bytesIn, preloadGroup } from '@/assets/loader'

/**
 * Desktop loading state (FIX_PROMPT §3): flat 47 and the 3D chunk must be in memory before
 * play starts; the stairwell and flat 48 stream in afterwards without blocking.
 */
export type LoadStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * The desktop JS chunk is downloaded by the browser, not by our fetch, so its bytes cannot
 * be streamed; it counts as one block of roughly its gzipped size (see `npm run budget`).
 */
export const CHUNK_WEIGHT = 280 * 1024

interface AssetLoadState {
  status: LoadStatus
  loaded: number
  total: number
  start: () => void
}

const loadDesktopChunk = () => import('@/presenters/desktop/DesktopPresenter')

export const useAssetLoad = create<AssetLoadState>((set, get) => ({
  status: 'idle',
  loaded: 0,
  total: 0,
  start: () => {
    const { status } = get()
    if (status === 'loading' || status === 'done') return
    const assetTotal = bytesIn('flat47')
    let assets = 0
    let chunk = 0
    const report = () => set({ loaded: assets + chunk, total: assetTotal + CHUNK_WEIGHT })
    set({ status: 'loading' })
    report()
    Promise.all([
      loadDesktopChunk().then(() => {
        chunk = CHUNK_WEIGHT
        report()
      }),
      preloadGroup('flat47', (p) => {
        assets = p.loaded
        report()
      }),
    ])
      .then(() => {
        set({ status: 'done' })
        // Background: nothing waits on these; a failure here retries when they are needed.
        void preloadGroup('stairwell')
          .then(() => preloadGroup('flat48'))
          .catch(() => {})
      })
      .catch(() => set({ status: 'error' }))
  },
}))
