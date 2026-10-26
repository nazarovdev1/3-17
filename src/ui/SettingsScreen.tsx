import { useState } from 'react'
import { ui } from '@/content/text'
import { CreditsList } from './CreditsList'
import { useSettings, type TextSize } from './settingsStore'
import type { GameMode } from '@/platform/device/mode'

/** Settings screen (spec 8): mode, volumes, text size, flashing, head bob, credits. */
export function SettingsScreen({
  onBack,
  mode,
  onModeRequest,
}: {
  onBack: () => void
  mode: GameMode
  onModeRequest?: () => void
}) {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const [creditsOpen, setCreditsOpen] = useState(false)

  return (
    <div className="screen">
      <div className="panel">
        <h2>{ui('settings.title')}</h2>

        <div className="row">
          <span>
            {ui('settings.mode')}{' '}
            {mode === 'desktop'
              ? ui('settings.mode_current_desktop')
              : ui('settings.mode_current_mobile')}
          </span>
          <div className="segmented">
            {(['auto', 'mobile', 'desktop'] as const).map((m) => (
              <button
                key={m}
                className={settings.mode === m ? 'active' : ''}
                onClick={() => {
                  update({ mode: m })
                  onModeRequest?.()
                }}
              >
                {m === 'auto'
                  ? ui('settings.mode_auto')
                  : m === 'mobile'
                    ? ui('settings.mode_mobile')
                    : ui('settings.mode_desktop')}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label={ui('settings.master')}
          value={settings.masterVolume}
          onChange={(masterVolume) => update({ masterVolume })}
        />
        <Slider
          label={ui('settings.music')}
          value={settings.musicVolume}
          onChange={(musicVolume) => update({ musicVolume })}
        />
        <Slider
          label={ui('settings.effects')}
          value={settings.effectsVolume}
          onChange={(effectsVolume) => update({ effectsVolume })}
        />

        <div className="row">
          <span>{ui('settings.text_size')}</span>
          <div className="segmented">
            {(['S', 'M', 'L'] as TextSize[]).map((size) => (
              <button
                key={size}
                className={settings.textSize === size ? 'active' : ''}
                onClick={() => update({ textSize: size })}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <label className="row">
          <span>{ui('settings.reduce_flashing')}</span>
          <input
            type="checkbox"
            checked={settings.reduceFlashing}
            onChange={(e) => update({ reduceFlashing: e.target.checked })}
          />
        </label>

        <label className="row">
          <span>{ui('settings.head_bob')}</span>
          <input
            type="checkbox"
            checked={settings.headBob}
            onChange={(e) => update({ headBob: e.target.checked })}
          />
        </label>

        <div className="row">
          <span>{ui('settings.language')}</span>
          <span style={{ opacity: 0.6 }}>{ui('settings.language_value')}</span>
        </div>

        <button aria-expanded={creditsOpen} onClick={() => setCreditsOpen((open) => !open)}>
          {ui('settings.credits')}
        </button>
        {creditsOpen && <CreditsList />}

        <button onClick={onBack}>{ui('common.back')}</button>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="row">
      <span>{label}</span>
      <input
        aria-label={label}
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
