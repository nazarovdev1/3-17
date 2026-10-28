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
    <div
      className="screen"
      style={{ position: 'absolute', background: 'rgba(11,11,12,0.94)', zIndex: 100 }}
    >
      <div className="panel">
        <h2>{ui('pause.title')}</h2>
        <div className="menu" style={{ width: '100%' }}>
          <button onClick={onResume}>{ui('common.continue')}</button>
          <button onClick={onSettings}>{ui('common.settings')}</button>
          <button onClick={onQuit}>{ui('common.to_menu')}</button>
        </div>
      </div>
    </div>
  )
}
