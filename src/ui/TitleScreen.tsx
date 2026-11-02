import { ui } from '@/content/text'
import { useGame } from './gameStore'
import type { GameMode } from '@/platform/device/mode'

/** Title screen: continue (if a run exists), new game, settings, gallery. */
export function TitleScreen({ mode }: { mode: GameMode }) {
  const setScreen = useGame((s) => s.setScreen)
  const hasRun = useGame((s) => s.run !== null)
  const continueRun = useGame((s) => s.continueRun)
  const startRun = useGame((s) => s.startRun)

  return (
    <div className="screen title-screen">
      <div className="title-lamp" aria-hidden="true" />
      <header className="title-head">
        <h1 className="title" aria-label="3:17">
          3<span className="colon">:</span>17
        </h1>
        <p className="subtitle">{ui('title.tagline')}</p>
      </header>
      <nav className="menu-list">
        {hasRun && <button onClick={continueRun}>{ui('common.continue')}</button>}
        <button onClick={startRun}>{ui('title.new_game')}</button>
        <button onClick={() => setScreen('settings')}>{ui('common.settings')}</button>
        <button onClick={() => setScreen('gallery')}>{ui('title.endings')}</button>
      </nav>
      <p className="title-mode">
        {mode === 'desktop' ? ui('title.mode_desktop') : ui('title.mode_mobile')}
      </p>
    </div>
  )
}
