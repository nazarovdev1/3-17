import { useSyncExternalStore } from 'react'

/**
 * What the magic-window camera shows the screen layer: the tappable things, projected to the
 * viewport. The camera publishes ~15 times a second; the layer renders them as plain buttons.
 */
export type SpotKind = 'use' | 'hold' | 'switch' | 'peek' | 'door' | 'move'

export interface Spot {
  key: string
  id: string
  kind: SpotKind
  /** Pixels in the canvas box. */
  x: number
  y: number
  /** Off screen: the marker sits on this edge and points that way. */
  edge?: 'left' | 'right'
  locked?: boolean
}

let spots: Spot[] = []
let signature = ''
const listeners = new Set<() => void>()

export function publishSpots(next: Spot[]) {
  const key = next
    .map(
      (s) =>
        `${s.key}:${Math.round(s.x / 3)}:${Math.round(s.y / 3)}:${s.edge ?? ''}:${s.locked ? 1 : 0}`,
    )
    .join('|')
  if (key === signature) return
  signature = key
  spots = next
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const useSpots = () => useSyncExternalStore(subscribe, () => spots)

/** What a tap on the screen layer does; the camera installs the real handlers. */
export const magicActions = {
  goTo: (_node: string) => {},
  door: (_id: string) => {},
  use: (_id: string, _kind: SpotKind) => {},
  recenter: () => {},
  /** Called inside a user gesture: iOS asks for the motion sensors only then. */
  wake: () => {},
}
