import { useEffect, useState } from 'react'
import { useGame } from './gameStore'
import { StaticNarrationProvider } from './narrationProvider'
import { useSettings } from './settingsStore'
import type { GameState } from '@/core/state/types'
import { corruptText } from '@/core/state/sanity'

const narration = new StaticNarrationProvider()

export const SPEAKER_CLASS: Record<string, string> = {
  narrator: 'speaker-narrator',
  voice: 'speaker-voice',
  player: 'speaker-player',
  landlord: 'speaker-landlord',
  muhabbat: 'speaker-muhabbat',
  diary: 'speaker-diary',
}

const TYPEWRITER_MS_PER_CHAR = 24

/**
 * Typewriter narration for the current node. Clicking/tapping the text skips
 * it; "Reduce flashing" disables the animation entirely. Keyed by node id at
 * the call site so it restarts per node.
 */
export function NarrationText({
  state,
  omitVoice = false,
}: {
  state: GameState
  omitVoice?: boolean
}) {
  const node = useGame((s) => s.currentStep?.node)
  const metaLines = useGame((s) => s.metaLines)
  const [typed, setTyped] = useState(() =>
    useSettings.getState().settings.reduceFlashing ? Number.MAX_SAFE_INTEGER : 0,
  )
  const [corruptionTick, setCorruptionTick] = useState(0)
  const reduceFlashing = useSettings((s) => s.settings.reduceFlashing)
  useEffect(() => {
    if (state.sanity >= 15 || reduceFlashing) return
    const timer = window.setInterval(() => setCorruptionTick((tick) => tick + 1), 1400)
    return () => window.clearInterval(timer)
  }, [state.sanity, reduceFlashing])

  const lines = [...metaLines, ...(node?.lines ?? [])]
    .filter((line) => !omitVoice || line.speaker !== 'voice')
    .map((line) => ({
      speaker: line.speaker,
      text: narration.resolveLineSync(line, state),
    }))
  const fullText = lines.map((l) => l.text).join('\n')

  useEffect(() => {
    if (typed >= fullText.length) return
    const timer = window.setTimeout(() => setTyped((t) => t + 1), TYPEWRITER_MS_PER_CHAR)
    return () => window.clearTimeout(timer)
  }, [typed, fullText])

  const shownLines = fullText.slice(0, Math.min(typed, fullText.length)).split('\n')

  return (
    <div className="narration" onClick={() => setTyped(fullText.length)} role="presentation">
      {shownLines.map((text, i) => (
        <p key={i} className={`line ${SPEAKER_CLASS[lines[i]?.speaker ?? 'narrator'] ?? ''}`}>
          {state.sanity < 15 && !reduceFlashing && corruptionTick % 2 === 1
            ? corruptText(text, 0.3, 317 + i, corruptionTick)
            : text}
        </p>
      ))}
    </div>
  )
}

export function resolveAllLines(state: GameState): { speaker: string; text: string }[] {
  const node = useGame.getState().currentStep?.node
  return [...useGame.getState().metaLines, ...(node?.lines ?? [])].map((line) => ({
    speaker: line.speaker,
    text: narration.resolveLineSync(line, state),
  }))
}
