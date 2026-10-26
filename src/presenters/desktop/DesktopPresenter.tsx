/* eslint-disable react-hooks/immutability -- Renderer diagnostics configure a mutable Three.js renderer, not React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, ChromaticAberration } from '@react-three/postprocessing'
import { NoToneMapping, type Mesh } from 'three'
import { visibleChoices } from '@/core/engine'
import { useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { audio } from '@/audio/engine'
import { NarrationText } from '@/ui/NarrationText'
import { resolveAllLines } from '@/ui/NarrationText'
import { sanityBand } from '@/core/state/sanity'
import { PauseMenu } from '@/ui/GameScreen'
import { QUALITY_HEIGHT, type QualityTier } from '@/platform/device/mode'
import { QualityGovernor } from '@/platform/device/quality'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { createResources } from './textures'
import { World } from './World'
import { CameraRig } from './CameraRig'
import { interactionPoint } from './layout'
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
  const governor = useRef(new QualityGovernor())
  const elapsed = useRef(0)
  const last = useRef(0)
  const frames = useRef(0)
  useEffect(() => {
    setDpr(Math.min(1, QUALITY_HEIGHT[tier] / Math.max(1, size.height)))
    governor.current.tier = tier
    governor.current.resetWindow()
  }, [tier, size.height, setDpr])
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
    desktopRuntime.frames++
    frames.current++
    if (paused || document.hidden || delta > 0.5) {
      governor.current.resetWindow()
      frames.current = 0
      last.current = elapsed.current
      return
    }
    const warmedUp = elapsed.current > 2
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
  const size = useThree((s) => s.size)
  const aperture = useMemo(
    () => new PeepholeEffect(size.width / size.height),
    [size.width, size.height],
  )
  useEffect(() => () => aperture.dispose(), [aperture])
  if (!peephole && (tier === 'low' || reduced || sanity >= 70)) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {!reduced && sanity < 70 ? (
        <ChromaticAberration
          offset={reduced ? [0, 0] : [(100 - sanity) * 0.000012, 0]}
          radialModulation={false}
        />
      ) : (
        <></>
      )}
      {peephole ? <primitive object={aperture} /> : <></>}
    </EffectComposer>
  )
}
function Interactor({
  choice,
  onSelect,
  extension,
}: {
  choice: Choice
  onSelect: (id: string) => void
  extension: number
}) {
  const mesh = useRef<Mesh>(null)
  const point = interactionPoint(choice, extension)
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 2) * 0.15)
    const target = interactionPoint(choice, extension, desktopRuntime.clockShifted ? 0.9 : 0)
    if (mesh.current && target) mesh.current.position.set(...target)
  })
  if (!point) return null
  return (
    <mesh
      ref={mesh}
      position={point}
      onClick={(event) => {
        event.stopPropagation()
        if (event.distance < 3.2) onSelect(choice.id)
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
  const [flashlight, setFlashlight] = useState(true)
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
  const resources = useMemo(() => createResources(), [])
  useEffect(() => () => resources.dispose(), [resources])
  const choices = useMemo(() => (step ? visibleChoices(step.node, step.state) : []), [step])
  const toggleFlashlight = useCallback(() => setFlashlight((value) => !value), [])
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
  useEffect(() => {
    if (!step || paused || step.phase !== 'next' || step.node.desktop?.trigger !== 'timed') return
    const characters = resolveAllLines(step.state).reduce(
      (total, line) => total + line.text.length,
      0,
    )
    const delay = Math.max(step.node.desktop.delayMs ?? 4000, characters * 24 + 1800)
    const timer = setTimeout(() => useGame.getState().advance(), delay)
    return () => clearTimeout(timer)
  }, [step, paused])
  if (!step || !supported) return null
  const corridorExtension = step.node.id === 'n3_corridor_loop' ? extension : 0
  const peephole = step.node.mobile?.vignette === 'peephole'
  const outage =
    step.state.visitedNodes.includes(`n${step.state.night}_317`) ||
    step.node.mobile?.vignette === 'room_dark'
  return (
    <div
      className={`game-area desktop-game sanity-${sanityBand(step.state.sanity)} ${settings.reduceFlashing ? 'reduce-flashing' : ''}`}
      data-node={step.node.id}
      data-tier={tier}
    >
      <div className="desktop-view" aria-label="Xonadon 47 — 3D manzara">
        <Canvas
          dpr={Math.min(1, QUALITY_HEIGHT[tier] / window.innerHeight)}
          frameloop={paused || lost ? 'never' : 'always'}
          camera={{ position: [0, 1.6, 0.2], fov: 66, near: 0.05, far: 45 }}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'low-power',
            toneMapping: NoToneMapping,
          }}
          fallback={<div className="desktop-loading">Yengil rejimga oʻtilmoqda…</div>}
        >
          <Runtime
            tier={tier}
            paused={paused}
            onTier={setTier}
            onFallback={onFallback}
            onLost={setLost}
          />
          <World
            resources={resources}
            outage={outage}
            doorAjar={step.state.night >= 4}
            corridorLength={corridorExtension + 1}
            peephole={peephole}
            windowsDark={outage || step.node.id.endsWith('_316')}
            lightsOff={lightsOff}
            neighbor={step.state.night === 2 && step.node.location === 'stairwell'}
            clockRequested={!!step.state.flags['clock_shifted']}
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
          />
          {choices.map((choice) => (
            <Interactor
              key={choice.id}
              choice={choice}
              onSelect={choose}
              extension={corridorExtension}
            />
          ))}
          <PostEffects
            peephole={peephole}
            tier={tier}
            sanity={step.state.sanity}
            reduced={settings.reduceFlashing}
          />
        </Canvas>
        <div className="desktop-film" />
        <div className="desktop-grain" style={{ backgroundImage: `url(${resources.grain})` }} />
        <span className="crosshair" aria-hidden="true">
          ·
        </span>
        {near && !paused && (
          <div className="interaction-prompt">
            {near.id === 'listen' ? 'Q — bosib turing' : 'E'} · {near.label}
          </div>
        )}
        {lost && <p className="desktop-recovering">Tasvir tiklanmoqda…</p>}
      </div>
      <div className="desktop-topline">
        <span>
          {step.state.night}-tun / 4-qavat / {step.node.location === 'flat48' ? '48' : '47'}
        </span>
        <button onClick={() => setTier(tier === 'high' ? 'low' : 'high')}>
          Sifat: {tier === 'high' ? 'yuqori' : 'past'}
        </button>
        <button onClick={toggleFlashlight}>
          Chiroq: {flashlight ? 'yoqilgan' : 'oʻchirilgan'} · F
        </button>
        <button aria-label="Pauza" onClick={() => useGame.getState().setScreen('paused')}>
          II
        </button>
      </div>
      {hint && (
        <aside className="desktop-controls">
          <p>
            WASD — yurish
            <br />
            Sichqoncha — qarash
            <br />E — tekshirish · F — chiroq
            <br />Q — devorni tinglash
            <br />
            1–9 — tanlash · Space — matn
            <br />
            Esc — pauza
          </p>
          <p>
            {control === 'lock' ? 'Sichqoncha ushlangan.' : 'Bosib sudrab qarashingiz ham mumkin.'}
          </p>
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
            Tushunarli
          </button>
        </aside>
      )}
      <div className="desktop-hud">
        <NarrationText key={step.node.id} state={step.state} />
        <div className="choices">
          {step.phase === 'next' && (
            <button onClick={() => useGame.getState().advance()}>Davom etish</button>
          )}
          {choices.map((choice, i) => (
            <button key={choice.id} onClick={() => choose(choice.id)}>
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
