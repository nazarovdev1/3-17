import { useGame } from './gameStore'
import { EndingVignette } from '@/presenters/mobile/EndingVignette'

const ENDING_TITLES: Record<string, string> = {
  A: 'Qoʻshni',
  B: 'Ketish',
  C: '3:18',
}

const ENDING_TEXT: Record<string, string> = {
  A: 'Siz eshikni ochdingiz. Xonadon 48 endi sizniki. Keyingi ijarachi kelganda, devor ichidan ovoz sizniki boʻladi.',
  B: 'Siz uydan chiqdingiz. Qor, havo, erkinlik. Faqat bitta oyna hali yonadi — sizniki. Uy kutayotgani toʻxtamadi.',
  C: 'Siz toʻxtagan soatni oʻradingiz. 3:18. Urish toʻxtadi. Ovoz bir ismni eslab qoldi: Sardor. Halq uzildi.',
}

/** Ending card (spec 4.3/5.4): names the ending, offers gallery / title. */
export function EndingScreen() {
  const card = useGame((s) => s.endingCard)
  const finish = useGame((s) => s.finishEnding)
  const setScreen = useGame((s) => s.setScreen)

  if (!card) return null
  const title = ENDING_TITLES[card.id] ?? card.id

  return (
    <div className="screen">
      <EndingVignette ending={card.id} />
      <h1 className="title" style={{ fontSize: 40 }}>
        {title}
      </h1>
      <p className="subtitle">{ENDING_TEXT[card.id]}</p>
      <div className="menu">
        <button
          onClick={() => {
            finish()
            setScreen('gallery')
          }}
        >
          Tugamlar galereyasi
        </button>
        <button onClick={finish}>Sarlavha ekraniga</button>
      </div>
    </div>
  )
}
