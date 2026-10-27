import { ui } from '@/content/text'
import { manifest } from '@/assets/loader'
import { stillManifest } from '@/presenters/mobile/StillScene'

/** Fonts are bundled through @fontsource; the rest comes from the asset manifest. */
export const FONT_CREDITS = [
  { title: 'Literata', author: 'TypeTogether', license: 'OFL-1.1' },
  { title: 'Inter', author: 'Rasmus Andersson', license: 'OFL-1.1' },
]

const SOURCE = {
  polyhaven: 'Poly Haven',
  ambientcg: 'ambientCG',
  sketchfab: 'Sketchfab',
  original: '3:17',
  freesound: 'Freesound',
} as const

/** Credits for every bundled third-party asset (FIX_PROMPT §3), shown in Settings. */
export function CreditsList() {
  return (
    <section className="credits" aria-label={ui('settings.credits_title')}>
      <h3>{ui('settings.credits_title')}</h3>
      <p className="credits-intro">{ui('settings.credits_intro')}</p>
      <p className="credits-intro">{ui('settings.credits_stills')}</p>
      <h4>{ui('settings.credits_fonts')}</h4>
      <ul>
        {FONT_CREDITS.map((f) => (
          <li key={f.title}>
            <span>{f.title}</span> — {f.author} · {f.license}
          </li>
        ))}
      </ul>
      <h4>{ui('settings.credits_assets')}</h4>
      <ul>
        {manifest.assets.map((a) => (
          <li key={a.id}>
            <span>{a.title}</span> — {a.author} ·{' '}
            {a.source === 'original' ? (
              SOURCE[a.source]
            ) : (
              <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                {SOURCE[a.source]}
              </a>
            )}{' '}
            · {a.license}
          </li>
        ))}
      </ul>
      {stillManifest.credit && (
        <>
          <h4>{ui('settings.credits_rendered')}</h4>
          <ul>
            {Object.keys(stillManifest.frames)
              .sort()
              .map((id) => (
                <li key={id}>
                  <span>{id}</span> — {stillManifest.credit!.author} ·{' '}
                  <a href={stillManifest.credit!.sourceUrl} target="_blank" rel="noreferrer">
                    3:17
                  </a>{' '}
                  · {stillManifest.credit!.license}
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  )
}
