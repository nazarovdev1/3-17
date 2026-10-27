import { useEffect, useRef, useState } from 'react'
import { ui } from '@/content/text'
import data from './stills.gen.json'
import { createStillRenderer, type StillMotion } from './still-renderer'

export const stillManifest = data as {
  credit?: { author: string; sourceUrl: string; license: string }
  frames: Record<
    string,
    {
      color: string
      depth: string
      bytes: number
      camera: string
      anchors: Record<string, { x: number; y: number }>
    }
  >
}
interface Props {
  id: string
  motion?: { current: StillMotion }
  paused?: boolean
  reduced?: boolean
  cold?: boolean
  label?: string
}
/** Each effect owns its decoded pair; switching nights releases both CPU and GPU resources. */
export function StillScene({
  id,
  motion,
  paused = false,
  reduced = true,
  cold = false,
  label = ui('mobile.scene_label'),
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [forceCanvas, setForceCanvas] = useState(false)
  const frame = stillManifest.frames[id]
  useEffect(() => {
    const target = canvas.current
    if (!target || !frame) return
    let live = true,
      raf = 0
    let renderer: ReturnType<typeof createStillRenderer> = null
    const bitmaps: ImageBitmap[] = []
    const abort = new AbortController()
    const lost = (event: Event) => {
      event.preventDefault()
      if (live) setForceCanvas(true)
    }
    target.addEventListener('webglcontextlost', lost)
    const loaded = [0, 0]
    const read = async (url: string, index: number) => {
      const response = await fetch(url, { signal: abort.signal })
      if (!response.ok) throw new Error('Still unavailable')
      const reader = response.body?.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      if (reader) {
        for (;;) {
          const part = await reader.read()
          if (part.done) break
          chunks.push(part.value)
          loaded[index]! += part.value.byteLength
          if (live) setProgress(Math.min(0.95, (loaded[0]! + loaded[1]!) / frame.bytes))
        }
      } else chunks.push(new Uint8Array(await response.arrayBuffer()))
      const bitmap = await createImageBitmap(new Blob(chunks, { type: 'image/webp' }))
      if (!live) {
        bitmap.close()
        throw new Error('Cancelled')
      }
      bitmaps.push(bitmap)
      return bitmap
    }
    const observer = new ResizeObserver(() => {
      const box = target.getBoundingClientRect(),
        dpr = Math.min(2, window.devicePixelRatio || 1)
      target.width = Math.round(box.width * dpr)
      target.height = Math.round(box.height * dpr)
    })
    observer.observe(target)
    void Promise.all([read(frame.color, 0), read(frame.depth, 1)])
      .then(([image, depth]) => {
        if (!live) return
        try {
          renderer = createStillRenderer(target, image, depth, forceCanvas)
        } catch (error) {
          if (!forceCanvas) {
            setForceCanvas(true)
            return
          }
          throw error
        }
        target.dataset.renderer = renderer?.kind ?? 'unavailable'
        target.dataset.ready = 'true'
        setProgress(1)
        const start = performance.now()
        const reflectionHistory: { time: number; x: number; y: number }[] = []
        const draw = () => {
          const now = performance.now() / 1000
          const currentMotion = motion?.current ?? { x: 0, y: 0 }
          if (frame.camera === 'bathroom') {
            reflectionHistory.push({ time: now, ...currentMotion })
            while (reflectionHistory.length > 2 && reflectionHistory[1]!.time < now - 0.5)
              reflectionHistory.shift()
          }
          renderer?.draw({
            motion: reduced ? { x: 0, y: 0 } : (motion?.current ?? { x: 0, y: 0 }),
            elapsed: (performance.now() - start) / 1000,
            reduced,
            tense: /off|figure|close/.test(id),
            snow: id.startsWith('window') || id.startsWith('ending_b'),
            breath: cold,
            reflection:
              frame.camera === 'bathroom' && frame.anchors.mirror
                ? { center: frame.anchors.mirror, motion: reflectionHistory[0] ?? currentMotion }
                : undefined,
          })
          if (!paused) raf = requestAnimationFrame(draw)
        }
        draw()
      })
      .catch(() => {
        if (live) setError(true)
      })
    return () => {
      live = false
      abort.abort()
      cancelAnimationFrame(raf)
      observer.disconnect()
      target.removeEventListener('webglcontextlost', lost)
      renderer?.dispose()
      bitmaps.forEach((bitmap) => bitmap.close())
    }
  }, [id, frame, motion, paused, reduced, cold, attempt, forceCanvas])
  return (
    <>
      <canvas
        key={`${id}:${paused}:${reduced}:${cold}:${attempt}:${forceCanvas}`}
        ref={canvas}
        width={720}
        height={720}
        aria-label={label}
        data-still={id}
      />
      {progress < 1 && (
        <div className="still-loading" role="status">
          <span>{ui('common.loading')}</span>
          <progress value={progress} max={1} />
        </div>
      )}
      {error && (
        <div className="still-loading" role="status">
          <span>{ui('loading.error')}</span>
          <button
            onClick={() => {
              setError(false)
              setProgress(0)
              setAttempt((value) => value + 1)
            }}
          >
            {ui('loading.retry')}
          </button>
        </div>
      )}
    </>
  )
}
