import { useState } from 'react'
import { useGame } from './gameStore'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import type { PlayerProfile } from '@/core/state/types'

type Alone = PlayerProfile['livesAlone']
type Fear = PlayerProfile['fear']
type Door = PlayerProfile['doorAtNight']

/**
 * Diegetic rental form (spec 5.3). The player must believe this is flavour;
 * the answers feed text variants for the whole game.
 */
export function RentalForm() {
  const startRun = useGame((s) => s.startRun)
  const telegramName = new TelegramAdapter().firstName
  const [name, setName] = useState(telegramName ?? '')
  const [alone, setAlone] = useState<Alone>('ha')
  const [fear, setFear] = useState<Fear>('qorongʻulik')
  const [door, setDoor] = useState<Door>('yopiq')

  const sanitized = name.trim().slice(0, 20)

  return (
    <div className="screen">
      <div className="panel">
        <h2>IJARA ANKETASI</h2>
        <p className="subtitle" style={{ fontSize: 13 }}>
          Xonadon 47, Chilonzor, Toshkent. Ijarachi: Rustam aka. Toʻldiring va imzolang.
        </p>

        <div className="form-field">
          <label>Ismingiz</label>
          <input
            type="text"
            value={name}
            maxLength={20}
            placeholder={telegramName ?? 'Ismingiz'}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Yolgʻiz yashaysizmi?</label>
          <Segmented
            options={[
              ['ha', 'Ha'],
              ['yoʻq', 'Yoʻq'],
              ['hozircha', 'Hozircha'],
            ]}
            value={alone}
            onChange={(v) => setAlone(v as Alone)}
          />
        </div>

        <div className="form-field">
          <label>Eng koʻp nimadan qoʻrqasiz?</label>
          <Segmented
            options={[
              ['qorongʻulik', 'Qorongʻulik'],
              ['yolgʻizlik', 'Yolgʻizlik'],
              ['kuzatuv', 'Kimdir kuzatayotgani'],
              ['unutilish', 'Unutilish'],
            ]}
            value={fear}
            onChange={(v) => setFear(v as Fear)}
          />
        </div>

        <div className="form-field">
          <label>Uxlaganda eshigingiz…</label>
          <Segmented
            options={[
              ['ochiq', 'Ochiq'],
              ['yopiq', 'Yopiq'],
            ]}
            value={door}
            onChange={(v) => setDoor(v as Door)}
          />
        </div>

        <button
          disabled={sanitized.length === 0}
          onClick={() =>
            startRun({
              name: sanitized,
              livesAlone: alone,
              fear,
              doorAtNight: door,
            })
          }
        >
          Imzolash
        </button>
      </div>
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}
