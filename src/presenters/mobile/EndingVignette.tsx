import { useEffect, useRef } from 'react'
import { drawVignette, VIGNETTE_H, VIGNETTE_W } from './vignettes'
import type { EndingId } from '@/core/state/types'

export function EndingVignette({ ending }: { ending: EndingId }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    drawVignette(`ending_${ending.toLowerCase()}`, {
      c: ctx,
      px: 0,
      py: 0,
      t: 0,
      sanity: 100,
      reduceFlashing: true,
    })
  }, [ending])
  return (
    <canvas
      className="ending-vignette"
      ref={canvas}
      width={VIGNETTE_W}
      height={VIGNETTE_H}
      aria-label="Yakun manzarasi"
    />
  )
}
