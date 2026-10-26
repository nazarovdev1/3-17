import { ui } from '@/content/text'
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
        <h2>{ui('warning.title')}</h2>
        <p className="subtitle">{ui('warning.body')}</p>
        <p className="subtitle">{ui('warning.headphones')}</p>
        <label className="row">
          <span>{ui('warning.reduce_flashing')}</span>
          <input
            type="checkbox"
            checked={reduceFlashing}
            onChange={(e) => useSettings.getState().update({ reduceFlashing: e.target.checked })}
          />
        </label>
        <label className="row">
          <span>{ui('warning.confirm')}</span>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
        </label>
        <button disabled={!confirmed} onClick={accept}>
          {ui('common.continue')}
        </button>
      </div>
    </div>
  )
}
