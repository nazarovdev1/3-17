import { useEffect, useState } from 'react'

/**
 * Chat-like overlay for the voice (spec 6.2): a "yozmoqda…" typing indicator
 * and messages appearing with delays. Stylized as part of the game — it never
 * imitates Telegram's real system UI.
 */
export function ChatOverlay({ messages }: { messages: string[] }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (shown >= messages.length) return
    const next = messages[shown] ?? ''
    const timer = window.setTimeout(
      () => setShown((s) => s + 1),
      Math.min(2600, 700 + next.length * 28),
    )
    return () => window.clearTimeout(timer)
  }, [shown, messages])

  const typing = shown < messages.length

  return (
    <div className="chat-overlay" style={{ pointerEvents: 'none' }}>
      {messages.slice(0, shown).map((text, i) => (
        <div key={i} className="chat-bubble">
          {text}
        </div>
      ))}
      {typing && <div className="chat-typing">yozmoqda…</div>}
    </div>
  )
}
