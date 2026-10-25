import { GAME_TITLE } from '@/core/constants'

export default function App() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0B0C',
        color: '#CFC6B0',
        fontFamily: 'monospace',
      }}
    >
      <h1>{GAME_TITLE}</h1>
    </main>
  )
}
