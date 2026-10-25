import { useMemo, useReducer } from 'react'
import { advance, choose, startGame, visibleChoices, type Step } from '@/core/engine'
import { StaticNarrationProvider } from '@/core/narration/static'
import { story } from '@/content/story'
import type { PlayerProfile } from '@/core/state/types'

const NOW = new Date().toISOString()

function defaultProfile(): PlayerProfile {
  return {
    name: 'Mehmon',
    livesAlone: 'ha',
    fear: 'qorongʻulik',
    doorAtNight: 'yopiq',
  }
}

type Action =
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'advance' }
  | { type: 'choose'; choiceId: string }

interface PresenterState {
  step: Step
}

const narration = new StaticNarrationProvider()

function freshStep(): Step {
  return startGame(story, defaultProfile(), NOW)
}

function reduce(state: PresenterState, action: Action): PresenterState {
  switch (action.type) {
    case 'start':
    case 'restart':
      return { step: freshStep() }
    case 'advance':
      return { step: advance(story, state.step.state) }
    case 'choose':
      return { step: choose(story, state.step.state, action.choiceId) }
  }
}

/**
 * Debug/proofreading presenter (?presenter=text). Plays the whole story as text
 * with buttons — used to check the script end to end and by fast e2e runs.
 */
export function TextPresenter() {
  const [state, dispatch] = useReducer(reduce, undefined, () => ({ step: freshStep() }))
  const step = state.step
  const node = step.node

  const choices = useMemo(
    () => (node.choices ? visibleChoices(node, step.state) : []),
    [node, step.state],
  )

  const [resolvedLines, resolveError] = useMemo(() => {
    const lines: string[] = []
    let error: string | null = null
    for (const line of node.lines) {
      try {
        lines.push(`${line.speaker}: ${narration.resolveLineSync(line, step.state)}`)
      } catch (err) {
        error = String(err)
        break
      }
    }
    return [lines, error] as const
  }, [node, step.state])

  return (
    <main style={{ padding: 16, maxWidth: 640, margin: '0 auto', color: '#CFC6B0' }}>
      <p style={{ opacity: 0.6 }}>
        Node: {node.id} · tun {node.night} · es-hush: {step.state.sanity}
      </p>
      {resolveError && <p style={{ color: '#8E1F1F' }}>{resolveError}</p>}
      {resolvedLines.map((text, i) => (
        <p key={`${node.id}-${i}`}>{text}</p>
      ))}

      {step.phase === 'ending' && (
        <>
          <h2 style={{ color: '#D98A2B' }}>Tugam: {node.ending}</h2>
          <button onClick={() => dispatch({ type: 'restart' })}>Boshidan</button>
        </>
      )}

      {step.phase === 'next' && (
        <button onClick={() => dispatch({ type: 'advance' })}>Davom etish</button>
      )}

      {step.phase === 'choices' && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {choices.map((choice, i) => (
            <li key={choice.id} style={{ margin: '8px 0' }}>
              <button onClick={() => dispatch({ type: 'choose', choiceId: choice.id })}>
                {i + 1}. {choice.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
