import { useState } from 'react'
import { useGame } from './gameStore'
import { useSettings } from './settingsStore'

/** First-launch content warning (spec 6.3) with the Reduce flashing toggle. */
export function ContentWarning() {
  const accept = useGame((s) => s.acceptWarning)
  const reduceFlashing = useSettings((s) => s.settings.reduceFlashing)
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="screen">
      <div className="panel">
        <h2>OGOHLANTIRISH</h2>
        <p className="subtitle">
          Bu psixologik qoʻrqinchli oʻyin. Unda yorugʻlik miltillashi, toʻsatdan tovushlar va
          bezovta qiluvchi mavzular bor. Qon va zoʻravonlik yoʻq.
        </p>
        <p className="subtitle">Quloqchinlar bilan oʻynash tavsiya etiladi.</p>
        <label className="row">
          <span>Miltillashni kamaytirish</span>
          <input
            type="checkbox"
            checked={reduceFlashing}
            onChange={(e) => useSettings.getState().update({ reduceFlashing: e.target.checked })}
          />
        </label>
        <label className="row">
          <span>Buni oʻqidim, davom etaman</span>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
        </label>
        <button disabled={!confirmed} onClick={accept}>
          Davom etish
        </button>
      </div>
    </div>
  )
}
