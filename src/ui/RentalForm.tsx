import { ui } from '@/content/text'
import { useEffect, useRef, useState } from 'react'
import { useGame } from './gameStore'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import type { PlayerProfile } from '@/core/state/types'

type Alone = PlayerProfile['livesAlone']
type Fear = PlayerProfile['fear']
type Door = PlayerProfile['doorAtNight']

/**
 * The rental form Rustam aka hands over on the landing (owner decision R0 §6): a sheet of
 * paper filled in like a real form. The player must believe it is flavour; the voice quotes
 * the answers later. Signing hands it back and the night goes on.
 */
export function RentalForm() {
  const telegramName = new TelegramAdapter().firstName
  const [name, setName] = useState(telegramName ?? '')
  const [alone, setAlone] = useState<Alone>('ha')
  const [fear, setFear] = useState<Fear>('qorongʻulik')
  const [door, setDoor] = useState<Door>('yopiq')

  const sanitized = name.trim().slice(0, 20)
  // Focus a moment later: the key that took the form must not land in the name field.
  const nameField = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const timer = setTimeout(() => nameField.current?.focus(), 250)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="form-paper-layer">
      <form
        className="form-paper"
        onSubmit={(event) => {
          event.preventDefault()
          if (!sanitized) return
          useGame.getState().input({
            type: 'form',
            profile: { name: sanitized, livesAlone: alone, fear, doorAtNight: door },
          })
        }}
      >
        <h2>{ui('form.title')}</h2>
        <p className="form-paper-intro">{ui('form.intro')}</p>

        <label className="form-paper-line">
          <span>{ui('form.name')}</span>
          <input
            type="text"
            value={name}
            maxLength={20}
            ref={nameField}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset className="form-paper-line">
          <legend>{ui('form.alone')}</legend>
          <Boxes
            name="alone"
            options={[
              ['ha', ui('form.alone_ha')],
              ['yoʻq', ui('form.alone_yoq')],
              ['hozircha', ui('form.alone_hozircha')],
            ]}
            value={alone}
            onChange={(v) => setAlone(v as Alone)}
          />
        </fieldset>

        <fieldset className="form-paper-line">
          <legend>{ui('form.fear')}</legend>
          <Boxes
            name="fear"
            options={[
              ['qorongʻulik', ui('form.fear_qorongulik')],
              ['yolgʻizlik', ui('form.fear_yolgizlik')],
              ['kuzatuv', ui('form.fear_kuzatuv')],
              ['unutilish', ui('form.fear_unutilish')],
            ]}
            value={fear}
            onChange={(v) => setFear(v as Fear)}
          />
        </fieldset>

        <fieldset className="form-paper-line">
          <legend>{ui('form.door')}</legend>
          <Boxes
            name="door"
            options={[
              ['ochiq', ui('form.door_ochiq')],
              ['yopiq', ui('form.door_yopiq')],
            ]}
            value={door}
            onChange={(v) => setDoor(v as Door)}
          />
        </fieldset>

        <button type="submit" className="form-paper-sign" disabled={sanitized.length === 0}>
          {ui('form.sign')}
        </button>
      </form>
    </div>
  )
}

/** Tick boxes printed on the form: one may be marked. */
function Boxes({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="form-paper-boxes">
      {options.map(([v, label]) => (
        <label key={v} className={value === v ? 'marked' : ''}>
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}
