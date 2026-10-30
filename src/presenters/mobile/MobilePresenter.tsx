import { line, ui } from '@/content/text'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sensors, useGame } from '@/ui/gameStore'
import { useSettings } from '@/ui/settingsStore'
import { sanityBand } from '@/core/state/sanity'
import { formatClock } from '@/core/director/clock'
import { READABLES } from '@/content/nights'
import { layoutHotspots } from './hotspots'
import { StillScene, stillManifest } from './StillScene'
import { stillFor } from './still-scenes'
import { useParallax } from './useParallax'
import { PauseMenu } from '@/ui/PauseMenu'
import { PlayOverlays } from '@/ui/play/Overlays'
import { MOBILE_VIEWS, mobileStart, type Edge } from './views'
import { doorPass } from './doors'
import { audio } from '@/audio/engine'
import { SCREEN, drawScreen } from '../phoneScreen'
import { phoneTime } from '../desktop/phone'

const ARROW: Record<Edge, string> = { left: '‹', right: '›', back: '⌄', forward: '⌃', aside: '' }
/** The shared walls: hold to listen, three taps to knock, one tap to answer. */
const WALLS = new Set(['party_wall', 'party_wall48'])

/**
 * Mobile fallback (R1): the HD stills of the real flat from fixed viewpoints, run by the same
 * Director as the 3D flat. Objects are tapped where they are; the wall is held to listen and
 * knocked on with three taps. No narration, no choice menus. R5 replaces it with the 3D view.
 */
export function MobilePresenter({ paused }: { paused: boolean }) {
  const world = useGame((s) => s.world)
  if (!world) return null
  return <Viewpoints key={world.sequence} paused={paused} />
}

function Viewpoints({ paused }: { paused: boolean }) {
  const world = useGame((s) => s.world)!
  const name = useGame((s) => s.run?.profile?.name ?? '')
  const sanity = useGame((s) => s.run?.sanity ?? 100)
  const lateNight = useGame((s) => !!s.run?.flags['late_night'])
  const canListen = useGame((s) => !!s.run?.flags['n2_voice_done']) && world.sequence === 'n2'
  const interactableList = useGame((s) => s.interactables)
  const settings = useSettings((s) => s.settings)
  const input = useGame((s) => s.input)
  const [viewId, setViewId] = useState(() => mobileStart(world.sequence))
  const view = MOBILE_VIEWS[viewId]!
  // The player's own choice per hinged door; the story's new word on a door clears it.
  const [doorChoices, setDoorChoices] = useState<Record<string, boolean>>({})
  const storyDoors = useRef(world.doors)
  useEffect(() => {
    const before = storyDoors.current
    storyDoors.current = world.doors
    const changed = Object.keys({ ...before, ...world.doors }).filter(
      (id) => before[id] !== world.doors[id],
    )
    if (changed.length)
      setDoorChoices((c) =>
        Object.fromEntries(Object.entries(c).filter(([id]) => !changed.includes(id))),
      )
  }, [world.doors])
  const toggleDoor = (id: Parameters<typeof doorPass>[0]) => {
    const pass = doorPass(id, world, doorChoices)
    if (pass.locked) return audio.play('chain', undefined, 0.8)
    audio.play(pass.open ? 'door_close' : 'door_open', undefined, 0.8)
    setDoorChoices((c) => ({ ...c, [id]: !pass.open }))
  }
  const sceneRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 360, height: 352 })
  const motion = useParallax(!paused)

  // The Director senses the viewpoint: its zones, and the objects it shows.
  useEffect(() => {
    sensors.zones = view.zones
    sensors.looking = view.objects.map((o) => o.id)
    sensors.visible = sensors.looking
    sensors.moving = true
    const settle = setTimeout(() => (sensors.moving = false), 250)
    return () => clearTimeout(settle)
  }, [view])

  useEffect(() => {
    if (!sceneRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(sceneRef.current)
    return () => observer.disconnect()
  }, [])

  const interactables = useMemo(
    () => new Set(interactableList ? interactableList.split(',') : []),
    [interactableList],
  )
  const holdingPhone = world.phone.place === 'hand'
  const frameId = stillFor(holdingPhone ? 'phone' : view.still, world.night, world.power)
  const spots = useMemo(
    () =>
      layoutHotspots(
        view.objects.filter(
          (o) =>
            interactables.has(o.id) ||
            o.id === world.waiting ||
            (o.id === 'party_wall' && canListen),
        ),
        stillManifest.frames[frameId]?.anchors ?? {},
        size.width,
        size.height,
      ),
    [view, interactables, world.waiting, frameId, size, canListen],
  )
  const paper = world.readable ? READABLES[world.readable] : undefined

  return (
    <div
      className={`game-area mobile-game sanity-${sanityBand(sanity)} ${settings.reduceFlashing ? 'reduce-flashing' : ''}`}
      data-sequence={world.sequence}
      data-view={viewId}
    >
      <div
        ref={sceneRef}
        className={`mobile-scene ${world.listening ? 'listening' : ''}`}
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
          cold={world.night === 5 && view.still === 'corridor'}
        />
        {!holdingPhone &&
          Object.entries(spots).map(([id, spot]) =>
            WALLS.has(id) ? (
              <WallSpot key={id} target={id} at={spot} />
            ) : (
              <button
                key={id}
                data-object={id}
                className="hotspot"
                aria-label={ui('mobile.scene_label')}
                style={{ left: spot.x, top: spot.y }}
                onClick={() => !paused && input({ type: 'interact', target: id })}
              />
            ),
          )}
        {!holdingPhone &&
          (
            [
              ...Object.entries(view.exits),
              ...Object.entries(view.doorExits ?? {}).flatMap(([edge, exit]) => {
                const state = world.doors[exit.door]
                return state === 'ajar' || state === 'open' ? [[edge, exit.to] as const] : []
              }),
            ] as [Edge, string][]
          )
            // A closer look is offered only where something there can be handled.
            .filter(
              ([edge, to]) =>
                edge !== 'aside' || MOBILE_VIEWS[to]!.objects.some((o) => interactables.has(o.id)),
            )
            .map(([edge, to]) => {
              const gate = view.gates?.[edge]
              const pass = gate ? doorPass(gate, world, doorChoices) : null
              // A closed door stands between here and there: the control is the door itself.
              return pass && !pass.open ? (
                <button
                  key={edge}
                  data-door={gate}
                  className={`view-exit view-exit-${edge} view-door ${pass.locked ? 'locked' : ''}`}
                  aria-label={ui('mobile.door')}
                  onClick={() => !paused && gate && toggleDoor(gate)}
                >
                  <span className="door-icon" aria-hidden="true" />
                </button>
              ) : (
                <button
                  key={edge}
                  className={`view-exit view-exit-${edge}`}
                  aria-label={ui('mobile.go')}
                  onClick={() => !paused && to && setViewId(to)}
                >
                  <span aria-hidden="true" className={edge === 'aside' ? 'look-icon' : undefined}>
                    {ARROW[edge]}
                  </span>
                </button>
              )
            })}
        {holdingPhone && (
          <PhoneInHand
            onTap={(part) => {
              if (part && interactables.has(part)) input({ type: 'interact', target: part })
              else input({ type: 'interact', target: 'phone' })
            }}
            time={phoneTime(world.phone, formatClock(world.clock), lateNight && world.night === 1)}
          />
        )}
        {paper && (
          <button className="paper-in-hand" onClick={() => input({ type: 'closeReadable' })}>
            {paper.lines.map((key, i) => (
              <span
                key={key}
                className={
                  paper.otherInkFrom !== undefined && i >= paper.otherInkFrom ? 'other-ink' : ''
                }
              >
                {line(key, name)}
              </span>
            ))}
          </button>
        )}
      </div>
      <PlayOverlays controls={false} />
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

/** The shared wall: one tap answers, three taps knock, press and hold listens. */
function WallSpot({ target, at }: { target: string; at: { x: number; y: number } }) {
  const input = useGame((s) => s.input)
  const taps = useRef<number[]>([])
  const held = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listening = useRef(false)
  const single = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <button
      data-object={target}
      className="hotspot hold-hotspot"
      aria-label={ui('mobile.scene_label')}
      style={{ left: at.x, top: at.y }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        held.current = setTimeout(() => {
          listening.current = true
          input({ type: 'holdStart', target })
        }, 600)
      }}
      onPointerUp={() => {
        if (held.current) clearTimeout(held.current)
        if (listening.current) {
          listening.current = false
          input({ type: 'holdEnd' })
          return
        }
        const now = performance.now()
        taps.current = [...taps.current.filter((t) => now - t < 2000), now]
        if (single.current) clearTimeout(single.current)
        if (taps.current.length >= 3) {
          taps.current = []
          input({ type: 'knock3', target })
          return
        }
        single.current = setTimeout(() => {
          if (taps.current.length === 1) input({ type: 'interact', target })
          taps.current = []
        }, 650)
      }}
      onPointerCancel={() => {
        if (held.current) clearTimeout(held.current)
        if (listening.current) input({ type: 'holdEnd' })
        listening.current = false
      }}
    />
  )
}

/** The phone held in front of the eyes: the same screen as on the desktop. */
function PhoneInHand({ onTap, time }: { onTap: (part: string | null) => void; time: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const phone = useGame((s) => s.world!.phone)
  const night = useGame((s) => s.world!.night)
  const started = useRef(0)
  useEffect(() => {
    started.current = performance.now()
  }, [phone.screen])
  useEffect(() => {
    let raf = 0
    const draw = () => {
      const c = canvas.current
      if (c) {
        const timed =
          phone.screen === 'playing' ? phone.messageSeconds : phone.screen === 'call' ? 16 : 0
        const progress = timed
          ? Math.min(1, (performance.now() - started.current) / 1000 / timed)
          : 0
        drawScreen(c, phone, time, night, progress)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [phone, time, night])
  return (
    <canvas
      ref={canvas}
      className="phone-in-hand"
      width={SCREEN.w / 2}
      height={SCREEN.h / 2}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const y = (event.clientY - rect.top) / rect.height
        // The bottom of the screen holds Send / Call; the cards above hold the message.
        if (y > 0.78) onTap(phone.screen === 'incoming' ? 'phone_call' : 'phone_send')
        else if (y > 0.25) onTap('phone_message')
        else onTap(null)
      }}
    />
  )
}
