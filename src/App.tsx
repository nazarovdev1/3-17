import { lazy, Suspense, useEffect } from 'react'
import { GameShell } from '@/ui/GameShell'
import { ErrorBoundary } from '@/ui/ErrorBoundary'
import { configureSaveService, useGame } from '@/ui/gameStore'
import { LocalStorageAdapter } from '@/platform/storage/local'
import { TelegramAdapter } from '@/platform/telegram/adapter'

// Asset QA bench: dev and test builds only, compiled out of production.
const ASSET_VIEW_ENABLED = import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1'
const AssetViewer = ASSET_VIEW_ENABLED ? lazy(() => import('@/debug/AssetViewer')) : null

/**
 * Root: the asset QA bench in test builds, otherwise the shell (boot → warning → title →
 * game).
 */
export default function App() {
  if (AssetViewer && new URLSearchParams(window.location.search).get('assetview') === '1') {
    return (
      <Suspense fallback={null}>
        <AssetViewer />
      </Suspense>
    )
  }

  return (
    <ErrorBoundary label="root">
      <Shell />
    </ErrorBoundary>
  )
}

function Shell() {
  useEffect(() => {
    const telegram = new TelegramAdapter()
    configureSaveService(new LocalStorageAdapter(), telegram.cloudStorage())
    void useGame
      .getState()
      .init()
      .then(() => {
        const accepted = useGame.getState().meta.contentWarningAccepted
        useGame.getState().setScreen(!accepted ? 'warning' : 'title')
      })
    // ready() as soon as the first frame renders (spec 9).
    telegram.onReady()
  }, [])

  return <GameShell />
}
