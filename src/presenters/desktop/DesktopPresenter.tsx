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
import { ACESFilmicToneMapping, NoToneMapping, PCFSoftShadowMap } from 'three'
import { StillCapture } from './StillCapture'
import { useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { audio } from '@/audio/engine'
import { sanityBand } from '@/core/state/sanity'
import { PauseMenu } from '@/ui/PauseMenu'
import { PlayOverlays } from '@/ui/play/Overlays'
import { type QualityTier } from '@/platform/device/mode'
import { QualityGovernor } from '@/platform/device/quality'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { renderDpr, renderProfile } from './quality'
import { World } from './World'
import { CameraRig, type Near } from './CameraRig'
import { Inspect, readableOf } from './Inspect'
import { PeepholeEffect } from './PeepholeEffect'
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
  const world = useGame((s) => s.world)
  const sanity = useGame((s) => s.run?.sanity ?? 100)
  const name = useGame((s) => s.run?.profile?.name ?? '')
  const flags = useGame((s) => s.run?.flags ?? NO_FLAGS)
  const lateNight = useGame((s) => !!s.run?.flags['late_night'])
  const interactableList = useGame((s) => s.interactables)
  const interactables = useMemo(
    () => new Set(interactableList ? interactableList.split(',') : []),
    [interactableList],
  )
  const settings = useSettings((s) => s.settings)
  const [tier, setTier] = useState<QualityTier>('high')
  const [lost, setLost] = useState(false)
  // The torch follows the night (on the dark stairwell, off in the lit flat) until the
  // player switches it by hand (F); a hand switch holds until the night changes it again.
  const phoneTorch = world?.lights['phone_torch'] === 'on'
  const torchWanted = world?.lights['torch'] === 'on' || phoneTorch
  const [torchOverride, setTorchOverride] = useState<{ on: boolean; wanted: boolean } | null>(null)
  const [peeking, setPeeking] = useState(false)
  const manual = torchOverride?.wanted === torchWanted ? torchOverride.on : null
  const flashlight = !peeking && (manual ?? torchWanted)
  // Switch circuits (room, kitchen, bath, hall): where the night left them, then the player's hand.
  const [switched, setSwitched] = useState<{ sequence: string; on: Record<number, boolean> }>({
    sequence: '',
    on: {},
  })
  const sequence = world?.sequence ?? ''
  const lightsOff = useMemo(() => {
    const off = new Set<number>()
    CIRCUITS.forEach((name, i) => {
      const mine = switched.sequence === sequence ? switched.on[i] : undefined
      const lit = mine ?? world?.lights[`flat_${name}`] !== 'off'
      if (!lit) off.add(i)
    })
    return off
  }, [switched, sequence, world?.lights])
  const [near, setNear] = useState<Near | null>(null)
  // Night 3's corridor (BEATS n3 #7): its extra metres, while the loop is on.
  const [stretch, setStretch] = useState({ sequence: '', metres: 0 })
  const looping = !!flags['corridor_loop'] && !flags['corridor_done']
  const extension = looping && stretch.sequence === sequence ? stretch.metres : 0
  const extend = useCallback((metres: number) => setStretch({ sequence, metres }), [sequence])
  const [, setControl] = useState<'lock' | 'drag'>('drag')
  const [profile, setProfile] = useState(() => renderProfile())
  const [still] = useState(
    () =>
      (import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
      new URLSearchParams(window.location.search).get('render') === 'still',
  )
  const paper = useMemo(() => readableOf(world?.readable ?? null, name), [world?.readable, name])
  const toggleFlashlight = useCallback(
    () =>
      setTorchOverride((value) => ({
        on: !(value?.wanted === torchWanted ? value.on : torchWanted),
        wanted: torchWanted,
      })),
    [torchWanted],
  )
  const toggleSwitch = useCallback(
    (index: number) => {
      setSwitched((previous) => {
        const on = previous.sequence === sequence ? previous.on : {}
        return { sequence, on: { ...on, [index]: lightsOff.has(index) } }
      })
      audio.play('switch')
    },
    [sequence, lightsOff],
  )
  if (!world || !supported) return null
  const peepholeView =
    peeking ||
    ((import.meta.env.DEV || import.meta.env.VITE_GAME_API === '1') &&
      new URLSearchParams(window.location.search).get('cam')?.startsWith('peephole') === true)
  const glyph = near && !paused && !paper && !world.form ? (near.kind === 'hold' ? 'Q' : 'E') : null
  return (
    <div
      className={`game-area desktop-game sanity-${sanityBand(sanity)} ${settings.reduceFlashing ? 'reduce-flashing' : ''}`}
      data-sequence={world.sequence}
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
            world={world}
            flags={flags}
            lateNight={lateNight}
            corridorLength={1 + extension}
            lightsOff={lightsOff}
            shadows={profile.shadows}
            peephole={peepholeView}
          />
          <CameraRig
            world={world}
            interactables={interactables}
            paused={paused}
            flashlight={flashlight}
            phoneTorch={phoneTorch}
            onNear={setNear}
            onControl={setControl}
            onFlashlight={toggleFlashlight}
            onSwitch={toggleSwitch}
            shadows={profile.shadows}
            peeking={peeking}
            onPeek={setPeeking}
            extension={extension}
            onExtend={extend}
          />
          <Inspect paper={paper} />
          <PostEffects
            peephole={peepholeView}
            tier={tier}
            sanity={sanity}
            reduced={settings.reduceFlashing}
          />
        </Canvas>
        <span className="crosshair" aria-hidden="true">
          ·
        </span>
        {glyph && (
          <span className="use-glyph" aria-hidden="true">
            {glyph}
          </span>
        )}
        {lost && <p className="desktop-recovering">{ui('desktop.recovering')}</p>}
      </div>
      <PlayOverlays controls={world.night === 1 && world.sequence === 'n1'} />
      <button
        className="pause-corner"
        aria-label={ui('common.pause')}
        onClick={() => useGame.getState().setScreen('paused')}
      >
        II
      </button>
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

const NO_FLAGS: Record<string, unknown> = {}
/** Light-switch circuits in SWITCHES order (layout.ts). */
const CIRCUITS = ['room', 'kitchen', 'bath', 'hall'] as const
