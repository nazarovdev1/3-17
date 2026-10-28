import { ui } from '@/content/text'
import { useGame } from './gameStore'
import type { Night } from '@/core/state/types'

/** Endings gallery + night select (unlocked after finishing). Ending titles live only here. */
export function GalleryScreen() {
  const meta = useGame((s) => s.meta)
  const setScreen = useGame((s) => s.setScreen)
  const playNight = useGame((s) => s.playNight)
  const nights: Night[] = [1, 2, 3, 4, 5]

  return (
    <div className="screen">
      <div className="panel">
        <h2>{ui('gallery.title')}</h2>
        {(['A', 'B', 'C'] as const).map((id) => (
          <div key={id} className="row">
            <span style={{ opacity: meta.endingsSeen.includes(id) ? 1 : 0.35 }}>
              {ui(`endings.${id}.title`)}{' '}
              {meta.endingsSeen.includes(id) ? '' : ui('gallery.locked')}
            </span>
          </div>
        ))}

        {meta.chaptersUnlocked.length > 0 && (
          <>
            <h2 style={{ marginTop: 12 }}>{ui('gallery.chapters')}</h2>
            {nights
              .filter((n) => meta.chaptersUnlocked.includes(n))
              .map((n) => (
                <button key={n} onClick={() => playNight(n)}>
                  {ui('gallery.night', { night: n })} · {ui(`nights.${n}`)}
                </button>
              ))}
          </>
        )}

        <button onClick={() => setScreen('title')}>{ui('common.back')}</button>
      </div>
    </div>
  )
}
