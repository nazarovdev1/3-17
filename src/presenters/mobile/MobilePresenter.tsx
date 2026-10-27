import { ui } from '@/content/text'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame, onEngineEvents } from '@/ui/gameStore'
import { NarrationText, resolveAllLines } from '@/ui/NarrationText'
import { useSettings } from '@/ui/settingsStore'
import { visibleChoices } from '@/core/engine'
import { sanityBand } from '@/core/state/sanity'
import { TelegramAdapter } from '@/platform/telegram/adapter'
import { layoutHotspots } from './hotspots'
import { StillScene, stillManifest } from './StillScene'
import { stillId } from './still-scenes'
import { useParallax } from './useParallax'
import { ChatOverlay } from './ChatOverlay'
import { PauseMenu } from '@/ui/GameScreen'
import { audio } from '@/audio/engine'
import { PhoneClock } from './PhoneClock'

const telegram = new TelegramAdapter()
function haptic(pattern: 'light' | 'heartbeat') {
  telegram.haptic(pattern)
  if (!telegram.isTelegram) telegram.vibrateFallback(pattern)
}

export function MobilePresenter({ paused }: { paused: boolean }) {
  const step = useGame((s) => s.currentStep)
  const setScreen = useGame((s) => s.setScreen)
  const settings = useSettings((s) => s.settings)
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sceneSize, setSceneSize] = useState({ width: 360, height: 352 })
  const motion = useParallax(!paused)
  const [listening, setListening] = useState(false)
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null)
  const node = step?.node
  const state = step?.state
  const baseVignette = node?.mobile?.vignette ?? node?.location ?? 'room'
  const vignette =
    baseVignette === 'window' &&
    (node?.id.endsWith('_316') || state?.visitedNodes.includes(`n${state.night}_317`))
      ? 'window_dark'
      : baseVignette
  const choices = useMemo(() => (node && state ? visibleChoices(node, state) : []), [node, state])
  const frameId = state && node ? stillId(vignette, node.id, state) : 'room-on'
  const spots = useMemo(
    () =>
      layoutHotspots(
        choices,
        stillManifest.frames[frameId]?.anchors ?? {},
        sceneSize.width,
        sceneSize.height,
      ),
    [choices, frameId, sceneSize],
  )
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
    if (!sceneRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSceneSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(sceneRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current)
      hold.current = null
      setListening(false)
      audio.setListening(false)
    },
    [node?.id, paused],
  )

  const release = () => {
    audio.setListening(false)
    if (hold.current) clearTimeout(hold.current)
    hold.current = null
    setListening(false)
  }
  const startListening = (choiceId: string) => {
    if (paused || hold.current) return
    setListening(true)
    audio.setListening(true)
    haptic('heartbeat')
    hold.current = setTimeout(() => {
      hold.current = null
      setListening(false)
      audio.setListening(false)
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
      data-vignette={vignette}
    >
      <div
        ref={sceneRef}
        className={`mobile-scene ${peephole ? 'peephole-scene' : ''} ${listening ? 'listening' : ''}`}
        onPointerDown={motion.onPointerDown}
        onPointerMove={motion.onPointerMove}
        onPointerUp={motion.onPointerUp}
        onPointerCancel={motion.onPointerUp}
      >
        <StillScene
          key={frameId}
          id={frameId}
          motion={motion.parallax}
          paused={paused}
          reduced={settings.reduceFlashing}
          cold={state.night === 5 && ['corridor', 'landing48'].includes(vignette)}
        />
        {frameId.startsWith('phone-night') && (
          <PhoneClock
            state={state}
            width={sceneSize.width}
            height={sceneSize.height}
            motion={motion.parallax}
            reduced={settings.reduceFlashing}
            paused={paused}
          />
        )}
        <span className="scene-caption">
          {state.night}-tun · {node.location === 'flat48' ? '48' : '47'}
          {typeof state.flags['time'] === 'string' && ` · ${state.flags['time']}`}
        </span>
        {choices.map((choice) => {
          const spot = spots[choice.id]
          if (!spot || peephole) return null
          const listen = choice.id === 'listen'
          return (
            <button
              key={choice.id}
              data-choice-id={choice.id}
              className={`hotspot ${listen ? 'hold-hotspot' : ''}`}
              aria-label={choice.label}
              title={choice.label}
              style={{ left: spot.x, top: spot.y }}
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
        {voiceLines.length > 0 && (
          <ChatOverlay
            key={node.id}
            messages={voiceLines}
            paused={paused}
            immediate={settings.reduceFlashing}
          />
        )}
      </div>
      <div className={`mobile-panel ${peephole ? 'peephole-panel' : ''}`}>
        <NarrationText key={node.id} state={state} omitVoice={voiceLines.length > 0} />
        <div className="choices">
          {step.phase === 'next' && (
            <button onClick={() => useGame.getState().advance()}>{ui('common.continue')}</button>
          )}
          {choices
            .filter((choice) => peephole || !spots[choice.id])
            // When the wall is out of frame, its hold button leads the panel so it stays above
            // the fold on short screens; the hint names it as the scene's main interaction.
            .sort((a, b) => Number(b.id === 'listen') - Number(a.id === 'listen'))
            .map((choice) => (
              <button
                key={choice.id}
                data-choice-id={choice.id}
                onClick={choice.id === 'listen' ? undefined : () => select(choice.id)}
                onPointerDown={
                  choice.id === 'listen'
                    ? (event) => {
                        event.currentTarget.setPointerCapture(event.pointerId)
                        startListening(choice.id)
                      }
                    : undefined
                }
                onPointerUp={choice.id === 'listen' ? release : undefined}
                onPointerCancel={choice.id === 'listen' ? release : undefined}
                onKeyDown={
                  choice.id === 'listen'
                    ? (event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault()
                          startListening(choice.id)
                        }
                      }
                    : undefined
                }
                onKeyUp={choice.id === 'listen' ? release : undefined}
                onBlur={choice.id === 'listen' ? release : undefined}
              >
                {choice.label}
              </button>
            ))}
          {choices.some((choice) => spots[choice.id] || choice.id === 'listen') && !peephole && (
            <p className="hotspot-hint">
              {ui('mobile.hotspot_hint')}
              {choices.some((choice) => choice.id === 'listen') && ` ${ui('mobile.hold_hint')}`}
            </p>
          )}
        </div>
      </div>
      <button
        className="pause-button"
        aria-label={ui('common.pause')}
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
