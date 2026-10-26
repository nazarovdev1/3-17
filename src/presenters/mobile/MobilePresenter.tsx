import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame, onEngineEvents } from '@/ui/gameStore'
import { NarrationText, resolveAllLines } from '@/ui/NarrationText'
import { useSettings } from '@/ui/settingsStore'
import { visibleChoices } from '@/core/engine'
import { sanityBand } from '@/core/state/sanity'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import { drawVignette, VIGNETTE_H, VIGNETTE_W } from './vignettes'
import { HOTSPOTS } from './hotspots'
import { useParallax } from './useParallax'
import { ChatOverlay } from './ChatOverlay'
import { PauseMenu } from '@/ui/GameScreen'

const telegram = new TelegramAdapter()
function haptic(pattern: 'light' | 'heartbeat') {
  telegram.haptic(pattern)
  if (!telegram.isTelegram) telegram.vibrateFallback(pattern)
}

export function MobilePresenter({ paused }: { paused: boolean }) {
  const step = useGame((s) => s.currentStep)
  const setScreen = useGame((s) => s.setScreen)
  const settings = useSettings((s) => s.settings)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motion = useParallax(!paused)
  const [listening, setListening] = useState(false)
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null)
  const node = step?.node
  const state = step?.state
  const vignette = node?.mobile?.vignette ?? node?.location ?? 'room'
  const choices = useMemo(() => (node && state ? visibleChoices(node, state) : []), [node, state])
  const voiceLines = useMemo(
    () =>
      state && node?.mobile?.overlay === 'chat'
        ? resolveAllLines(state)
            .filter((line) => line.speaker === 'voice')
            .map((line) => line.text)
        : [],
    [state, node],
  )

  useEffect(
    () =>
      onEngineEvents((events) => {
        for (const event of events) {
          if (event.kind !== 'haptic') continue
          telegram.haptic(event.pattern)
          if (!telegram.isTelegram) telegram.vibrateFallback(event.pattern)
        }
      }),
    [],
  )

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || paused) return
    let frame = 0
    const start = performance.now()
    const draw = () => {
      drawVignette(vignette, {
        c: ctx,
        ...{ px: motion.parallax.current.x, py: motion.parallax.current.y },
        t: (performance.now() - start) / 1000,
        sanity: useGame.getState().run?.sanity ?? 100,
        reduceFlashing: settings.reduceFlashing,
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [vignette, paused, settings.reduceFlashing, motion.parallax])

  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current)
      hold.current = null
      setListening(false)
    },
    [node?.id, paused],
  )

  const release = () => {
    if (hold.current) clearTimeout(hold.current)
    hold.current = null
    setListening(false)
  }
  const startListening = (choiceId: string) => {
    if (paused || hold.current) return
    setListening(true)
    haptic('heartbeat')
    hold.current = setTimeout(() => {
      hold.current = null
      setListening(false)
      haptic('heartbeat')
      useGame.getState().choose(choiceId)
    }, 700)
  }
  if (!node || !state || !step) return null
  const peephole = vignette === 'peephole'
  const band = sanityBand(state.sanity)
  const select = (choiceId: string) => {
    if (paused) return
    haptic('light')
    useGame.getState().choose(choiceId)
  }

  return (
    <div
      className={`game-area mobile-game sanity-${band} ${settings.reduceFlashing ? 'reduce-flashing' : ''}`}
      data-node={node.id}
    >
      <div
        className={`mobile-scene ${peephole ? 'peephole-scene' : ''} ${listening ? 'listening' : ''}`}
        onPointerDown={motion.onPointerDown}
        onPointerMove={motion.onPointerMove}
        onPointerUp={motion.onPointerUp}
        onPointerCancel={motion.onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={VIGNETTE_W}
          height={VIGNETTE_H}
          aria-label="Xonadon manzarasi"
        />
        <span className="scene-caption">
          {state.night}-tun · {state.flags['time'] === '3:16' ? '3:16' : '3:17'} ·{' '}
          {node.location === 'flat48' ? '48' : '47'}
        </span>
        {choices.map((choice) => {
          const spot = HOTSPOTS[choice.id]
          if (!spot || peephole) return null
          const listen = choice.id === 'listen'
          return (
            <button
              key={choice.id}
              className={`hotspot ${listen ? 'hold-hotspot' : ''}`}
              aria-label={choice.label}
              title={choice.label}
              style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
              onClick={listen ? undefined : () => select(choice.id)}
              onPointerDown={
                listen
                  ? (event) => {
                      event.currentTarget.setPointerCapture(event.pointerId)
                      startListening(choice.id)
                    }
                  : undefined
              }
              onPointerUp={listen ? release : undefined}
              onPointerCancel={listen ? release : undefined}
              onKeyDown={
                listen
                  ? (event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault()
                        startListening(choice.id)
                      }
                    }
                  : undefined
              }
              onKeyUp={listen ? release : undefined}
              onBlur={listen ? release : undefined}
            >
              <span className="hotspot-label">{choice.label}</span>
            </button>
          )
        })}
        {voiceLines.length > 0 && <ChatOverlay key={node.id} messages={voiceLines} />}
      </div>
      <div className={`mobile-panel ${peephole ? 'peephole-panel' : ''}`}>
        <NarrationText key={node.id} state={state} />
        <div className="choices">
          {step.phase === 'next' && (
            <button onClick={() => useGame.getState().advance()}>Davom etish</button>
          )}
          {choices
            .filter((choice) => peephole || !HOTSPOTS[choice.id])
            .map((choice) => (
              <button key={choice.id} onClick={() => select(choice.id)}>
                {choice.label}
              </button>
            ))}
          {choices.some((choice) => HOTSPOTS[choice.id]) && !peephole && (
            <p className="hotspot-hint">
              Yaltirayotgan joylarni bosing.
              {choices.some((choice) => choice.id === 'listen') && ' Devorni bosib turing.'}
            </p>
          )}
        </div>
      </div>
      <button
        className="pause-button"
        aria-label="Pauza"
        onClick={() => {
          release()
          setScreen('paused')
        }}
      >
        II
      </button>
      {paused && (
        <PauseMenu
          onResume={() => setScreen('game')}
          onSettings={() => setScreen('settings')}
          onQuit={() => useGame.getState().quitToTitle()}
        />
      )}
    </div>
  )
}
