import { useEffect, useState } from 'react'

/**
 * Chat-like overlay for the voice (spec 6.2): a "yozmoqda…" typing indicator
 * and messages appearing with delays. Stylized as part of the game — it never
 * imitates Telegram's real system UI.
 */
export function ChatOverlay({
  messages,
  paused = false,
  immediate = false,
}: {
  messages: string[]
  paused?: boolean
  immediate?: boolean
}) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (paused || immediate || shown >= messages.length) return
    const next = messages[shown] ?? ''
    const timer = window.setTimeout(
      () => setShown((s) => s + 1),
      Math.min(2600, 700 + next.length * 28),
    )
    return () => window.clearTimeout(timer)
  }, [shown, messages, paused, immediate])

  const count = immediate ? messages.length : shown
  const typing = count < messages.length

  return (
    <div className="chat-overlay" style={{ pointerEvents: 'auto' }}>
      {messages.slice(0, count).map((text, i) => (
        <div key={i} className="chat-bubble">
          {text}
        </div>
      ))}
      {typing && <div className="chat-typing">yozmoqda…</div>}
      {typing && (
        <button className="chat-reveal" onClick={() => setShown(messages.length)}>
          Matnni ochish
        </button>
      )}
    </div>
  )
}
