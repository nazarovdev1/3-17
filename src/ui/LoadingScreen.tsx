import { ui } from '@/content/text'
import { useEffect, useState } from 'react'
import { useAssetLoad } from './assetLoadStore'

/** Things the flat's tenants learn too late, shown one at a time while the flat loads. */
const TIPS = [
  'loading.tip_1',
  'loading.tip_2',
  'loading.tip_3',
  'loading.tip_4',
  'loading.tip_5',
  'loading.tip_6',
] as const
const TIP_MS = 5200

/**
 * Diegetic loading screen (FIX_PROMPT §3): Rustam aka's key ring — the door key and the
 * small brass one — over a progress line that moves with real bytes.
 */
export function LoadingScreen() {
  const { status, loaded, total, start } = useAssetLoad()
  const fraction = total > 0 ? Math.min(1, loaded / total) : 0
  const percent = Math.floor(fraction * 100)
  const failed = status === 'error'
  // A random tip first, then the rest in turn: nobody reads the same one twice in a row.
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length))
  useEffect(() => {
    const timer = window.setInterval(() => setTip((n) => (n + 1) % TIPS.length), TIP_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="screen loading-screen" data-status={status}>
      <svg className="keyring" viewBox="0 0 120 150" aria-hidden="true">
        <defs>
          <linearGradient id="steel" x1="0" x2="1">
            <stop offset="0" stopColor="#5d6266" />
            <stop offset="0.5" stopColor="#a7acae" />
            <stop offset="1" stopColor="#4a4f53" />
          </linearGradient>
          <linearGradient id="brass" x1="0" x2="1">
            <stop offset="0" stopColor="#6b5122" />
            <stop offset="0.5" stopColor="#b8913f" />
            <stop offset="1" stopColor="#5a431b" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="22" r="15" fill="none" stroke="url(#steel)" strokeWidth="2.4" />
        <g className="key key-door">
          <circle cx="52" cy="46" r="9" fill="none" stroke="url(#steel)" strokeWidth="5" />
          <rect x="49.5" y="54" width="5" height="62" rx="1" fill="url(#steel)" />
          <path d="M54.5 98h7v4h-4v4h5v4h-8z" fill="url(#steel)" />
        </g>
        <g className="key key-brass">
          <circle cx="72" cy="44" r="6" fill="none" stroke="url(#brass)" strokeWidth="3.4" />
          <rect x="70.6" y="49" width="2.8" height="30" rx="0.8" fill="url(#brass)" />
          <path d="M73.4 72h3.6v2.4h-2v2.4h2.6v2.2h-4.2z" fill="url(#brass)" />
        </g>
      </svg>

      <p className="loading-place">{ui('loading.place')}</p>

      <div
        className="loading-line"
        role="progressbar"
        aria-label={ui('loading.label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="loading-fill" style={{ transform: `scaleX(${fraction})` }} />
      </div>

      {failed ? (
        <>
          <p className="loading-note" role="alert">
            {ui('loading.error')}
          </p>
          <button className="loading-retry" onClick={start}>
            {ui('loading.retry')}
          </button>
        </>
      ) : (
        <p className="loading-note">{ui('loading.percent', { percent })}</p>
      )}

      <p className="loading-tip" key={tip} aria-live="off">
        <span className="loading-tip-label">{ui('loading.tip')}</span>
        {ui(TIPS[tip]!)}
      </p>
    </div>
  )
}
