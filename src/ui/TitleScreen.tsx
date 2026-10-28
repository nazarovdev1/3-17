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
    <div className="screen">
      <h1 className="title">3:17</h1>
      <p className="subtitle">{ui('title.tagline')}</p>
      <div className="menu">
        {hasRun && <button onClick={continueRun}>{ui('common.continue')}</button>}
        <button onClick={startRun}>{ui('title.new_game')}</button>
        <button onClick={() => setScreen('settings')}>{ui('common.settings')}</button>
        <button onClick={() => setScreen('gallery')}>{ui('title.endings')}</button>
      </div>
      <p className="subtitle" style={{ opacity: 0.4, fontSize: 12 }}>
        {mode === 'desktop' ? ui('title.mode_desktop') : ui('title.mode_mobile')}
      </p>
    </div>
  )
}
