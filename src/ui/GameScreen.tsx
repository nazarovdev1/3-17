import { useEffect, useState } from 'react'
import { useGame } from './gameStore'
import { StaticNarrationProvider } from '@/core/narration/static'
import { visibleChoices } from '@/core/engine'
import { useSettings } from './settingsStore'
import type { GameState } from '@/core/state/types'

const narration = new StaticNarrationProvider()

const SPEAKER_CLASS: Record<string, string> = {
  narrator: 'speaker-narrator',
  voice: 'speaker-voice',
  player: 'speaker-player',
  landlord: 'speaker-landlord',
  muhabbat: 'speaker-muhabbat',
  diary: 'speaker-diary',
}

const TYPEWRITER_MS_PER_CHAR = 24

/**
 * The in-game screen: narration lines with a skippable typewriter, choices,
 * pause menu. Until the dedicated presenters land (Phases 4/6) this is the
 * presentation for both modes.
 */
export function GameScreen({ paused }: { paused: boolean }) {
  const step = useGame((s) => s.currentStep)
  const advance = useGame((s) => s.advance)
  const choose = useGame((s) => s.choose)
  const quitToTitle = useGame((s) => s.quitToTitle)
  const setScreen = useGame((s) => s.setScreen)

  const node = step?.node
  const state = step?.state

  if (!node || !state) return null

  const phase = step.phase
  const choices = node.choices ? visibleChoices(node, state) : []
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      className="game-area"
      style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      {/* Keyed by node so the typewriter restarts without effect cascades. */}
      <Narration key={node.id} state={state} />

      {phase === 'next' && (
        <div className="choices">
          <button
            onClick={(e) => {
              stop(e)
              advance()
            }}
          >
            Davom etish
          </button>
        </div>
      )}

      {phase === 'choices' && (
        <div className="choices">
          {choices.map((choice, i) => (
            <button
              key={choice.id}
              onClick={(e) => {
                stop(e)
                choose(choice.id)
              }}
            >
              {i + 1}. {choice.label}
            </button>
          ))}
        </div>
      )}

      {phase === 'ending' && (
        <div className="choices">
          <button
            onClick={(e) => {
              stop(e)
              setScreen('ending')
            }}
          >
            Davom etish
          </button>
        </div>
      )}

      <button
        className="pause-button"
        aria-label="Pauza"
        style={{ width: 'auto', position: 'absolute', top: 8, right: 8, padding: '4px 10px' }}
        onClick={(e) => {
          stop(e)
          setScreen('paused')
        }}
      >
        II
      </button>

      {paused && (
        <PauseMenu
          onResume={() => setScreen('game')}
          onSettings={() => setScreen('settings')}
          onQuit={quitToTitle}
        />
      )}
    </div>
  )
}

/** Typewriter narration; clicking the text skips to the end. */
function Narration({ state }: { state: GameState }) {
  const node = useGame((s) => s.currentStep?.node)
  const [typed, setTyped] = useState(() =>
    useSettings.getState().settings.reduceFlashing ? Number.MAX_SAFE_INTEGER : 0,
  )

  const lines = (node?.lines ?? []).map((line) => ({
    speaker: line.speaker,
    text: narration.resolveLineSync(line, state),
  }))
  const fullText = lines.map((l) => l.text).join('\n')

  useEffect(() => {
    if (typed >= fullText.length) return
    const timer = window.setTimeout(() => setTyped((t) => t + 1), TYPEWRITER_MS_PER_CHAR)
    return () => window.clearTimeout(timer)
  }, [typed, fullText])

  const shownText = fullText.slice(0, Math.min(typed, fullText.length))
  const shownLines = shownText.split('\n')

  return (
    <div className="narration" onClick={() => setTyped(fullText.length)} role="presentation">
      {shownLines.map((text, i) => (
        <p key={i} className={`line ${SPEAKER_CLASS[lines[i]?.speaker ?? 'narrator'] ?? ''}`}>
          {text}
        </p>
      ))}
    </div>
  )
}

export function PauseMenu({
  onResume,
  onSettings,
  onQuit,
}: {
  onResume: () => void
  onSettings: () => void
  onQuit: () => void
}) {
  return (
    <div
      className="screen"
      style={{ position: 'absolute', background: 'rgba(11,11,12,0.94)', zIndex: 100 }}
    >
      <div className="panel">
        <h2>PAUZA</h2>
        <div className="menu" style={{ width: '100%' }}>
          <button onClick={onResume}>Davom etish</button>
          <button onClick={onSettings}>Sozlamalar</button>
          <button onClick={onQuit}>Sarlavha ekraniga chiqish</button>
        </div>
      </div>
    </div>
  )
}
