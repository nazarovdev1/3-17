import { ui } from '@/content/text'
/* eslint-disable react-hooks/immutability -- Renderer diagnostics configure a mutable Three.js renderer, not React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  N8AO,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping, NoToneMapping, PCFSoftShadowMap, type Mesh } from 'three'
import { StillCapture } from './StillCapture'
import { visibleChoices } from '@/core/engine'
import { useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { audio } from '@/audio/engine'
import { NarrationText } from '@/ui/NarrationText'
import { resolveAllLines } from '@/ui/NarrationText'
import { sanityBand } from '@/core/state/sanity'
import { PauseMenu } from '@/ui/GameScreen'
import { type QualityTier } from '@/platform/device/mode'
import { QualityGovernor } from '@/platform/device/quality'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { renderDpr, renderProfile } from './quality'
import { World } from './World'
import { CameraRig } from './CameraRig'
import { REACH, interactionPoint } from './layout'
import { figureAppearance } from './figure'
import { SCRIPTED_SOUNDS } from './events'
import { Inspect, readableOf } from './Inspect'
import { PeepholeEffect } from './PeepholeEffect'
import type { Choice } from '@/core/engine/types'
import './desktop.css'

interface Props {
  paused: boolean
  onFallback: () => void
}
function Runtime({
  tier,
  paused,
  onTier,
  onFallback,
  onLost,
}: {
  tier: QualityTier
  paused: boolean
  onTier: (tier: QualityTier) => void
  onFallback: () => void
  onLost: (lost: boolean) => void
}) {
  const { gl, size, setDpr } = useThree()
  const profile = useMemo(() => renderProfile(gl), [gl])
  const governor = useRef(new QualityGovernor())
  const elapsed = useRef(0)
  const last = useRef(0)
  const frames = useRef(0)
  useEffect(() => {
    setDpr(renderDpr(tier, profile, size.height))
    governor.current.tier = tier
    governor.current.resetWindow()
  }, [tier, size.height, setDpr, profile])
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const lost = (event: Event) => {
      event.preventDefault()
      desktopRuntime.context = 'lost'
      onLost(true)
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(onFallback, 1800)
    }
    const restored = () => {
      if (timeout) clearTimeout(timeout)
      timeout = null
      desktopRuntime.context = 'restored'
      elapsed.current = 0
      last.current = 0
      frames.current = 0
      governor.current.resetWindow()
      onLost(false)
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    gl.domElement.addEventListener('webglcontextrestored', restored)
    desktopRuntime.mounted = true
    desktopRuntime.context = 'ready'
    gl.info.autoReset = false
    return () => {
      if (timeout) clearTimeout(timeout)
      gl.domElement.removeEventListener('webglcontextlost', lost)
      gl.domElement.removeEventListener('webglcontextrestored', restored)
      desktopRuntime.mounted = false
    }
  }, [gl, onFallback, onLost])
  useFrame((_, delta) => {
    desktopRuntime.software = profile.software
    desktopRuntime.shadows = gl.shadowMap.enabled
    desktopRuntime.frames++
    frames.current++
    if (paused || document.hidden || delta > 0.5) {
      governor.current.resetWindow()
      frames.current = 0
      last.current = elapsed.current
      return
    }
    // ?quality=ultra (stills, QA captures) holds full quality whatever the frame rate.
    const warmedUp = elapsed.current > 2 && !profile.ultra
    elapsed.current += delta
    if (warmedUp) {
      const action = governor.current.sample(delta)
      if (action === 'low') onTier('low')
      else if (action === 'fallback') onFallback()
    }
    if (elapsed.current - last.current > 1) {
      desktopRuntime.fps = frames.current / (elapsed.current - last.current)
      frames.current = 0
      desktopRuntime.tier = tier
      desktopRuntime.calls = gl.info.render.calls
      desktopRuntime.triangles = gl.info.render.triangles
      desktopRuntime.geometries = gl.info.memory.geometries
      desktopRuntime.textures = gl.info.memory.textures
      desktopRuntime.renderHeight = gl.domElement.height
      last.current = elapsed.current
    }
    gl.info.reset()
  }, -2)
  return null
}
function SoftwareOutput() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const previous = gl.toneMapping
    // The CPU rasterizer avoids AgX's per-fragment logarithms/powers; native/ultra keep AgX.
    gl.toneMapping = ACESFilmicToneMapping
    return () => {
      gl.toneMapping = previous
    }
  }, [gl])
  return null
}

function PostEffects({
  peephole,
  tier,
  sanity,
  reduced,
}: {
  peephole: boolean
  tier: QualityTier
  sanity: number
  reduced: boolean
}) {
  const { size, gl } = useThree()
  const profile = useMemo(() => renderProfile(gl), [gl])
  const aperture = useMemo(
    () => new PeepholeEffect(size.width / size.height),
    [size.width, size.height],
  )
  useEffect(() => () => aperture.dispose(), [aperture])
  // Ambient occlusion and bloom only where the GPU can afford them (FIX_PROMPT §2).
  const rich = tier === 'high' && (!profile.software || profile.ultra)
  const aberration = !reduced && sanity < 70 ? (100 - sanity) * 0.000012 : 0
  if (profile.software && !profile.ultra && !peephole) return <SoftwareOutput />
  return (
    <EffectComposer multisampling={rich ? 4 : 0} enableNormalPass={false}>
      {rich ? (
        <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} quality="medium" halfRes />
      ) : (
        <></>
      )}
      {rich ? (
        <Bloom intensity={0.4} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
      ) : (
        <></>
      )}
      {aberration > 0 ? (
        <ChromaticAberration offset={[aberration, 0]} radialModulation={false} />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.6} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.035} />
      {peephole ? <primitive object={aperture} /> : <></>}
    </EffectComposer>
  )
}
function Interactor({
  choice,
  onSelect,
  extension,
  night,
}: {
  choice: Choice
  onSelect: (id: string) => void
  extension: number
  night: number
}) {
  const mesh = useRef<Mesh>(null)
  const point = interactionPoint(choice, extension, false, night)
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 2) * 0.15)
    const target = interactionPoint(choice, extension, desktopRuntime.clockShifted, night)
    if (mesh.current && target) mesh.current.position.set(...target)
  })
  if (!point) return null
  return (
    <mesh
      ref={mesh}
      position={point}
      onClick={(event) => {
        event.stopPropagation()
        if (event.distance < REACH + 0.6) onSelect(choice.id)
      }}
    >
      <sphereGeometry args={[0.035, 6, 4]} />
      <meshBasicMaterial color="#c5b88e" transparent opacity={0.65} />
    </mesh>
  )
}
export default function DesktopPresenter({ paused, onFallback }: Props) {
  const [supported] = useState(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      return !!gl
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (!supported) onFallback()
  }, [supported, onFallback])
  const step = useGame((s) => s.currentStep)
  const settings = useSettings((s) => s.settings)
  const [tier, setTier] = useState<QualityTier>('high')
  const [lost, setLost] = useState(false)
  // The torch follows the power: off while the bulbs burn, on after 3:17, unless the
  // player has switched it by hand (F).
  // A hand switch holds until the power changes: a cut turns the torch on again.
  const [torchOverride, setTorchOverride] = useState<{ on: boolean; needed: boolean } | null>(null)
  const outage =
    !!step &&
    (step.state.visitedNodes.includes(`n${step.state.night}_317`) ||
      step.node.mobile?.vignette === 'room_dark')
  const torchNeeded = outage || step?.node.location === 'flat48'
  // An eye to the peephole by choice; it lasts for the current beat only.
  const [peek, setPeek] = useState({ node: '', on: false })
  const peeking = peek.on && peek.node === step?.node.id
  const onPeek = useCallback(
    (on: boolean) => setPeek({ node: useGame.getState().currentStep?.node.id ?? '', on }),
    [],
  )
  const peepholeView =
    step?.node.mobile?.vignette === 'peephole' ||
    peeking ||
    ((import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
      new URLSearchParams(window.location.search).get('cam')?.startsWith('peephole') === true)
  // An eye at the peephole holds no torch: the landing is lit only by what is out there.
  const manual = torchOverride?.needed === torchNeeded ? torchOverride.on : null
  const flashlight = !peepholeView && (manual ?? torchNeeded)
  const [lightsOff, setLightsOff] = useState<Set<number>>(() => new Set())
  const [near, setNear] = useState<Choice | null>(null)
  const [control, setControl] = useState<'lock' | 'drag'>('drag')
  const [extension, setExtension] = useState(0)
  const [hint, setHint] = useState(() => {
    try {
      return sessionStorage.getItem('g317:controls') !== '1'
    } catch {
      return true
    }
  })
  const [profile, setProfile] = useState(() => renderProfile())
  const [still] = useState(
    () =>
      (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
      new URLSearchParams(window.location.search).get('render') === 'still',
  )
  const choices = useMemo(() => (step ? visibleChoices(step.node, step.state) : []), [step])
  const paper = useMemo(() => (step ? readableOf(step) : null), [step])
  const toggleFlashlight = useCallback(
    () =>
      setTorchOverride((value) => ({
        on: !(value?.needed === torchNeeded ? value.on : torchNeeded),
        needed: torchNeeded,
      })),
    [torchNeeded],
  )
  const toggleSwitch = useCallback((index: number) => {
    setLightsOff((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    audio.play('switch')
  }, [])
  const extend = useCallback(() => setExtension((length) => Math.min(6, length + 2)), [])
  const choose = useCallback((id: string) => {
    if (document.pointerLockElement) document.exitPointerLock()
    desktopRuntime.lastInteraction = id
    useGame.getState().choose(id)
  }, [])
  useEffect(() => {
    desktopRuntime.control = control
  }, [control])
  // Sounds from the wrong place, timed from the start of the beat.
  const nodeId = step?.node.id
  useEffect(() => {
    const cues = nodeId ? SCRIPTED_SOUNDS[nodeId] : undefined
    if (!cues || paused) return
    const timers = cues.map((cue) =>
      setTimeout(() => audio.play(cue.id, cue.position), cue.at * 1000),
    )
    return () => timers.forEach(clearTimeout)
  }, [nodeId, paused])
  useEffect(() => {
    if (!step || paused || still || step.phase !== 'next' || step.node.desktop?.trigger !== 'timed')
      return
    const characters = resolveAllLines(step.state).reduce(
      (total, line) => total + line.text.length,
      0,
    )
    const delay = Math.max(step.node.desktop.delayMs ?? 4000, characters * 24 + 1800)
    const timer = setTimeout(() => useGame.getState().advance(), delay)
    return () => clearTimeout(timer)
  }, [step, paused, still])
  if (!step || !supported) return null
  const corridorExtension =
    step.node.id === 'n3_corridor_loop'
      ? (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
        still &&
        new URLSearchParams(window.location.search).get('cam') === 'corridor_changed'
        ? 2
        : extension
      : 0
  const appearance = figureAppearance(step.node.id, step.state)
  const peephole = peepholeView
  return (
    <div
      className={`game-area desktop-game sanity-${sanityBand(step.state.sanity)} ${settings.reduceFlashing ? 'reduce-flashing' : ''}`}
      data-node={step.node.id}
      data-tier={tier}
    >
      <div className="desktop-view" aria-label={ui('desktop.scene_label')}>
        <Canvas
          onCreated={({ gl }) => setProfile(renderProfile(gl))}
          dpr={renderDpr(tier, profile, window.innerHeight)}
          shadows={profile.shadows ? { type: PCFSoftShadowMap } : false}
          frameloop={
            paused || lost
              ? 'never'
              : still && new URLSearchParams(window.location.search).has('cam')
                ? 'demand'
                : 'always'
          }
          camera={{ position: [0.6, 1.6, -0.6], fov: 66, near: 0.05, far: 80 }}
          gl={{
            preserveDrawingBuffer: still && new URLSearchParams(window.location.search).has('cam'),
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance',
            // Tone mapping (AgX) runs in the effect composer, on HDR input.
            toneMapping: NoToneMapping,
          }}
          fallback={<div className="desktop-loading">{ui('desktop.fallback_loading')}</div>}
        >
          {(import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') && still && (
            <StillCapture />
          )}
          <Runtime
            tier={tier}
            paused={paused}
            onTier={setTier}
            onFallback={onFallback}
            onLost={setLost}
          />
          <World
            outage={outage}
            doorAjar={step.state.night >= 4}
            corridorLength={corridorExtension + 1}
            windowsDark={outage || step.node.id.endsWith('_316')}
            lightsOff={lightsOff}
            clockRequested={!!step.state.flags['clock_shifted']}
            shadows={profile.shadows}
            appearance={appearance}
            node={step.node.id}
            state={step.state}
            peephole={peephole}
          />
          <CameraRig
            step={step}
            choices={choices}
            paused={paused}
            flashlight={flashlight}
            onNear={setNear}
            onControl={setControl}
            onFlashlight={toggleFlashlight}
            onSwitch={toggleSwitch}
            onExtend={extend}
            extension={corridorExtension}
            shadows={profile.shadows}
            peeking={peeking}
            onPeek={onPeek}
          />
          {!still &&
            choices.map((choice) => (
              <Interactor
                key={choice.id}
                choice={choice}
                onSelect={choose}
                extension={corridorExtension}
                night={step.state.night}
              />
            ))}
          <Inspect paper={paper} />
          <PostEffects
            peephole={peephole}
            tier={tier}
            sanity={step.state.sanity}
            reduced={settings.reduceFlashing}
          />
        </Canvas>
        <span className="crosshair" aria-hidden="true">
          ·
        </span>
        {near && !paused && (
          <div className="interaction-prompt">
            {near.id === 'listen' ? ui('desktop.hold_q') : 'E'} · {near.label}
          </div>
        )}
        {lost && <p className="desktop-recovering">{ui('desktop.recovering')}</p>}
      </div>
      <div className="desktop-topline">
        <span>
          {ui('desktop.topline', {
            night: step.state.night,
            flat: step.node.location === 'flat48' ? '48' : '47',
          })}
        </span>
        <button onClick={() => setTier(tier === 'high' ? 'low' : 'high')}>
          {ui('desktop.quality', {
            tier: tier === 'high' ? ui('desktop.quality_high') : ui('desktop.quality_low'),
          })}
        </button>
        <button onClick={toggleFlashlight}>
          {ui('desktop.flashlight', {
            state: flashlight ? ui('desktop.flashlight_on') : ui('desktop.flashlight_off'),
          })}
        </button>
        <button
          aria-label={ui('common.pause')}
          onClick={() => useGame.getState().setScreen('paused')}
        >
          II
        </button>
      </div>
      {hint && (
        <aside className="desktop-controls">
          <p>
            {ui('desktop.controls')
              .split(' · ')
              .map((row) => (
                <span key={row} className="desktop-controls-row">
                  {row}
                </span>
              ))}
          </p>
          <p>{control === 'lock' ? ui('desktop.control_lock') : ui('desktop.control_drag')}</p>
          <button
            onClick={() => {
              setHint(false)
              try {
                sessionStorage.setItem('g317:controls', '1')
              } catch {
                /* Session-only hint still closes. */
              }
            }}
          >
            {ui('desktop.got_it')}
          </button>
        </aside>
      )}
      <div className="desktop-hud">
        <NarrationText key={step.node.id} state={step.state} />
        <div className="choices">
          {step.phase === 'next' && (
            <button onClick={() => useGame.getState().advance()}>{ui('common.continue')}</button>
          )}
          {choices.map((choice, i) => (
            <button key={choice.id} data-choice-id={choice.id} onClick={() => choose(choice.id)}>
              {i + 1}. {choice.label}
            </button>
          ))}
        </div>
      </div>
      {paused && (
        <PauseMenu
          onResume={() => useGame.getState().setScreen('game')}
          onSettings={() => useGame.getState().setScreen('settings')}
          onQuit={() => useGame.getState().quitToTitle()}
        />
      )}
    </div>
  )
}
