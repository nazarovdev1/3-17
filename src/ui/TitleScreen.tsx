import { useGame } from './gameStore'
import type { GameMode } from '@/platform/device/mode'

/** Title screen: continue (if a run exists), new game, settings, gallery. */
export function TitleScreen({ mode }: { mode: GameMode }) {
  const setScreen = useGame((s) => s.setScreen)
  const hasRun = useGame((s) => s.run !== null)
  const continueRun = useGame((s) => s.continueRun)

  return (
    <div className="screen">
      <h1 className="title">3:17</h1>
      <p className="subtitle">
        Chilonzor. Toʻqqiz qavatli uy. Xonadon 47. Har tun soat 3:17’da kimdir devorni uradi.
      </p>
      <div className="menu">
        {hasRun && <button onClick={continueRun}>Davom etish</button>}
        <button onClick={() => setScreen('form')}>Yangi oʻyin</button>
        <button onClick={() => setScreen('settings')}>Sozlamalar</button>
        <button onClick={() => setScreen('gallery')}>Tugamlar</button>
      </div>
      <p className="subtitle" style={{ opacity: 0.4, fontSize: 12 }}>
        rejim: {mode === 'desktop' ? 'kompyuter (3D)' : 'telefon (2D)'}
      </p>
    </div>
  )
}
