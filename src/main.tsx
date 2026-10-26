import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installGlobalHandlers } from './ui/errorLog'
// Literata for narration, Inter for interface (FIX_PROMPT 2). Both carry ʻ U+02BB and ’ U+2019
// in the latin subset; scripts/verify-fonts.mjs checks the actual cmap.
import '@fontsource/literata/latin-400.css'
import '@fontsource/literata/latin-400-italic.css'
import '@fontsource/literata/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'

installGlobalHandlers()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
