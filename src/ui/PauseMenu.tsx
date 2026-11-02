import { ui } from '@/content/text'

/** The only menu while a night is running, and only when the player pauses. */
export function PauseMenu({
  onResume,
  onSettings,
  onQuit,
}: {
  onResume: () => void
  onSettings: () => void
  onQuit: () => void
}) {
  return (
    <div className="screen pause-screen">
      <h2>{ui('pause.title')}</h2>
      <nav className="menu-list">
        <button onClick={onResume}>{ui('common.continue')}</button>
        <button onClick={onSettings}>{ui('common.settings')}</button>
        <button onClick={onQuit}>{ui('common.to_menu')}</button>
      </nav>
    </div>
  )
}
