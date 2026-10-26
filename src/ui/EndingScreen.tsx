import { ui } from '@/content/text'
import { useGame } from './gameStore'
import { EndingVignette } from '@/presenters/mobile/EndingVignette'
import { NarrationText } from './NarrationText'

/** Ending card (spec 4.3/5.4): names the ending, offers gallery / title. */
export function EndingScreen() {
  const card = useGame((s) => s.endingCard)
  const run = useGame((s) => s.run)
  const finish = useGame((s) => s.finishEnding)
  const setScreen = useGame((s) => s.setScreen)

  if (!card) return null
  const title = ui(`endings.${card.id}.title`)

  return (
    <div className="screen ending-screen">
      <EndingVignette ending={card.id} />
      <h1 className="title" style={{ fontSize: 40 }}>
        {title}
      </h1>
      <div className="ending-narration">
        {run ? (
          <NarrationText key={card.nodeId} state={run} />
        ) : (
          <p className="subtitle">{ui(`endings.${card.id}.summary`)}</p>
        )}
      </div>
      <p className="ending-scroll-hint">{ui('ending.scroll_hint')}</p>
      <div className="menu">
        <button
          onClick={() => {
            finish()
            setScreen('gallery')
          }}
        >
          {ui('ending.gallery')}
        </button>
        <button onClick={finish}>{ui('common.to_menu')}</button>
      </div>
    </div>
  )
}
