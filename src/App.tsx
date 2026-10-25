import { TextPresenter } from '@/presenters/text/TextPresenter'

/**
 * Root switch. Phase 3 replaces the placeholder with the full shell
 * (boot → warning → title → game); `?presenter=text` stays for story
 * proofreading and fast e2e runs.
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('presenter') === 'text') {
    return <TextPresenter />
  }
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
      <h1>3:17</h1>
    </main>
  )
}
