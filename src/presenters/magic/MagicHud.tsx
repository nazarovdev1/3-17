import { line, ui } from '@/content/text'
import { READABLES } from '@/content/nights'
import { formatClock } from '@/core/director/clock'
import { useGame } from '@/ui/gameStore'
import { phoneTime } from '../desktop/phone'
import { PhoneInHand, WallSpot } from '../mobile/MobilePresenter'
import { magicActions, useSpots } from './hud'
import './magic.css'

/**
 * The screen layer of the magic window: floor markers to glide by, doors to open, objects to
 * tap, the shared wall to hold. Pictures and shapes only, no sentences (REDESIGN §3).
 */
export function MagicHud({
  peeking,
  paused,
  onUnpeek,
}: {
  peeking: boolean
  paused: boolean
  onUnpeek: () => void
}) {
  const spots = useSpots()
  const world = useGame((s) => s.world)!
  const name = useGame((s) => s.run?.profile?.name ?? '')
  const input = useGame((s) => s.input)
  const lateNight = useGame((s) => !!s.run?.flags['late_night'])
  const interactableList = useGame((s) => s.interactables)
  const holdingPhone = world.phone.place === 'hand'
  const paper = world.readable ? READABLES[world.readable] : undefined
  return (
    <div className="magic-hud" data-peeking={peeking ? 'true' : 'false'}>
      {!holdingPhone &&
        !paper &&
        spots.map((spot) => {
          const at = { left: spot.x, top: spot.y }
          if (spot.kind === 'move')
            return (
              <button
                key={spot.key}
                data-node={spot.id}
                className={`magic-mark ${spot.edge ? `edge-${spot.edge}` : ''}`}
                aria-label={ui('mobile.go')}
                style={at}
                onClick={() => !paused && magicActions.goTo(spot.id)}
              >
                <span aria-hidden="true" />
              </button>
            )
          if (spot.kind === 'door')
            return (
              <button
                key={spot.key}
                data-door={spot.id}
                className={`magic-door ${spot.locked ? 'locked' : ''} ${spot.edge ? `edge-${spot.edge}` : ''}`}
                aria-label={ui('mobile.door')}
                style={at}
                onClick={() => !paused && magicActions.door(spot.id)}
              >
                <span className="door-icon" aria-hidden="true" />
              </button>
            )
          if (spot.kind === 'hold') return <WallSpot key={spot.key} target={spot.id} at={spot} />
          return (
            <button
              key={spot.key}
              data-object={spot.id}
              className="hotspot"
              aria-label={ui('mobile.scene_label')}
              style={at}
              onClick={() => !paused && magicActions.use(spot.id, spot.kind)}
            />
          )
        })}
      {peeking && (
        <button
          className="view-exit view-exit-back magic-unpeek"
          aria-label={ui('mobile.unpeek')}
          onClick={onUnpeek}
        >
          <span aria-hidden="true">⌄</span>
        </button>
      )}
      <button
        className="magic-recenter"
        aria-label={ui('mobile.recenter')}
        onPointerDown={() => magicActions.wake()}
        onClick={() => magicActions.recenter()}
      >
        <span aria-hidden="true" />
      </button>
      {holdingPhone && (
        <PhoneInHand
          onTap={(part) => {
            const set = new Set(interactableList ? interactableList.split(',') : [])
            if (part && set.has(part)) input({ type: 'interact', target: part })
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
  )
}
