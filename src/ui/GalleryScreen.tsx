import { useGame } from './gameStore'
import type { Night } from '@/core/state/types'

const ENDING_TITLES: Record<string, string> = {
  A: 'Qoʻshni',
  B: 'Ketish',
  C: '3:18',
}

/** Endings gallery + chapter select (unlocked after finishing, spec 4.3). */
export function GalleryScreen() {
  const meta = useGame((s) => s.meta)
  const setScreen = useGame((s) => s.setScreen)
  const goToNode = useGame((s) => s.goToNode)

  const nightStarts: [Night, string][] = [
    [1, 'n1_start'],
    [2, 'n2_day_start'],
    [3, 'n3_start'],
    [4, 'n4_start'],
    [5, 'n5_start'],
  ]

  return (
    <div className="screen">
      <div className="panel">
        <h2>TUGAMLAR</h2>
        {(['A', 'B', 'C'] as const).map((id) => (
          <div key={id} className="row">
            <span style={{ opacity: meta.endingsSeen.includes(id) ? 1 : 0.35 }}>
              {ENDING_TITLES[id]} {meta.endingsSeen.includes(id) ? '' : '— ochilmagan'}
            </span>
          </div>
        ))}

        {meta.chaptersUnlocked.length > 0 && (
          <>
            <h2 style={{ marginTop: 12 }}>BOBKLAR</h2>
            {nightStarts
              .filter(([n]) => meta.chaptersUnlocked.includes(n))
              .map(([n, nodeId]) => (
                <button
                  key={n}
                  onClick={() => {
                    goToNode(nodeId)
                    setScreen('game')
                  }}
                >
                  {n}-tun
                </button>
              ))}
          </>
        )}

        <button onClick={() => setScreen('title')}>Orqaga</button>
      </div>
    </div>
  )
}
