import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installGlobalHandlers } from './ui/errorLog'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/oswald/latin-400.css'

installGlobalHandlers()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
