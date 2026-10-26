import { useEffect, useState } from 'react'
import { useGame } from '@/ui/gameStore'
import { getLog } from '@/ui/errorLog'
import { story } from '@/content/story'

const DEBUG_KEY = 'g317:debug'
const GAME_API_KEY = '__game' as const

function isDebug(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get('debug') === '1' ||
      window.localStorage.getItem(DEBUG_KEY) === '1'
    )
  } catch {
    return false
  }
}

/**
 * Debug overlay (spec 11): FPS, node, sanity, flags, inventory, last errors,
 * node jumper — plus the window.__game test API. The API is attached only when
 * debug is active, so production builds ship without it.
 */
export function DebugOverlay() {
  const [active] = useState(isDebug)
  const [fps, setFps] = useState(0)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!active) return
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const node = useGame((s) => s.currentStep?.node.id ?? '—')
  const sanity = useGame((s) => s.run?.sanity ?? 0)
  const flags = useGame((s) => s.run?.flags)
  const inventory = useGame((s) => s.run?.inventory)
  const mode = useGame((s) => s.screen)
  const goToNode = useGame((s) => s.goToNode)
  const errors = getLog().slice(-5)

  useEffect(() => {
    if (!active) return
    ;(window as unknown as Record<string, unknown>)[GAME_API_KEY] = {
      getState: () => useGame.getState().run,
      goTo: (nodeId: string) => useGame.getState().goToNode(nodeId),
      choose: (choiceId: string) => useGame.getState().choose(choiceId),
      setSanity: (n: number) => useGame.getState().setSanity(n),
      setFlag: (k: string, v: boolean | number | string) => useGame.getState().setFlag(k, v),
      setTime: (iso: string) => useGame.getState().debugSetTime(iso),
      getScreen: () => useGame.getState().screen,
      advance: () => useGame.getState().advance(),
    }
    return () => {
      delete (window as unknown as Record<string, unknown>)[GAME_API_KEY]
    }
  }, [active])

  if (!active || !open) {
    return active ? (
      <button
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', top: 4, left: 4, width: 'auto', zIndex: 9999 }}
      >
        dbg
      </button>
    ) : null
  }

  return (
    <div className="debug-overlay">
      <div>
        <button onClick={() => setOpen(false)}>—</button> FPS {fps} · ekran {mode}
      </div>
      <div>node: {node}</div>
      <div>es-hush: {sanity}</div>
      <div>inv: {inventory && inventory.length > 0 ? inventory.join(', ') : '—'}</div>
      <div>flags: {flags && Object.keys(flags).length > 0 ? JSON.stringify(flags) : '—'}</div>
      {errors.map((e, i) => (
        <div key={i} style={{ color: '#e8a0a0' }}>
          {e.kind}: {e.message.slice(0, 90)}
        </div>
      ))}
      <NodeJumper onJump={goToNode} />
    </div>
  )
}

function NodeJumper({ onJump }: { onJump: (id: string) => void }) {
  const [value, setValue] = useState('')
  const ids = Object.keys(story.nodes)
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
      <input
        list="g317-nodes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          flex: 1,
          fontSize: 11,
          padding: 2,
          background: '#111',
          color: '#9fe8a0',
          border: '1px solid #333',
        }}
        placeholder="node id"
      />
      <datalist id="g317-nodes">
        {ids.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
      <button
        onClick={() => {
          if (value.trim()) onJump(value.trim())
        }}
      >
        →
      </button>
    </div>
  )
}
