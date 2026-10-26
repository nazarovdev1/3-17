import { useSettings, type TextSize } from './settingsStore'
import type { GameMode } from '@/platform/device/mode'

/** Settings screen (spec 8): mode, volumes, text size, flashing, head bob. */
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

  return (
    <div className="screen">
      <div className="panel">
        <h2>SOZLAMALAR</h2>

        <div className="row">
          <span>Rejim (joriy: {mode === 'desktop' ? '3D' : '2D'})</span>
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
                {m === 'auto' ? 'Auto' : m === 'mobile' ? 'Telefon' : 'Kompyuter'}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Umumiy tovush"
          value={settings.masterVolume}
          onChange={(masterVolume) => update({ masterVolume })}
        />
        <Slider
          label="Musiqa"
          value={settings.musicVolume}
          onChange={(musicVolume) => update({ musicVolume })}
        />
        <Slider
          label="Effektlar"
          value={settings.effectsVolume}
          onChange={(effectsVolume) => update({ effectsVolume })}
        />

        <div className="row">
          <span>Matn oʻlchami</span>
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
          <span>Miltillashni kamaytirish</span>
          <input
            type="checkbox"
            checked={settings.reduceFlashing}
            onChange={(e) => update({ reduceFlashing: e.target.checked })}
          />
        </label>

        <label className="row">
          <span>Bosh silkinishi (koʻchish rejimi)</span>
          <input
            type="checkbox"
            checked={settings.headBob}
            onChange={(e) => update({ headBob: e.target.checked })}
          />
        </label>

        <div className="row">
          <span>Til</span>
          <span style={{ opacity: 0.6 }}>Oʻzbek (oʻzgarmas)</span>
        </div>

        <button onClick={onBack}>Orqaga</button>
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
