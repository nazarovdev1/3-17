import { useEffect } from 'react'
import { GameShell } from '@/ui/GameShell'
import { ErrorBoundary } from '@/ui/ErrorBoundary'
import { configureSaveService, useGame } from '@/ui/gameStore'
import { LocalStorageAdapter } from '@/platform/storage/local'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import { TextPresenter } from '@/presenters/text/TextPresenter'

/**
 * Root switch: ?presenter=text keeps the proofreading presenter; everything
 * else goes through the shell (boot → warning → title → game).
 */
export default function App() {
  const presenter = new URLSearchParams(window.location.search).get('presenter')
  if (presenter === 'text') return <TextPresenter />

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
        const hasRun = useGame.getState().run !== null
        useGame.getState().setScreen(!accepted ? 'warning' : 'title')
        if (hasRun) void 0 // title screen offers "Davom etish"
      })
    // ready() as soon as the first frame renders (spec 9).
    telegram.onReady()
  }, [])

  return <GameShell />
}
