/** In-memory error log (spec 4.4) shown in the debug overlay. */

export interface LogEntry {
  at: string
  message: string
  kind: 'error' | 'unhandledrejection' | 'warning'
}

const entries: LogEntry[] = []
const MAX_ENTRIES = 100

export function logError(message: string, kind: LogEntry['kind'] = 'error'): void {
  entries.push({ at: new Date().toISOString(), message: message.slice(0, 500), kind })
  if (entries.length > MAX_ENTRIES) entries.shift()
}

export function getLog(): readonly LogEntry[] {
  return entries
}

export function clearLog(): void {
  entries.length = 0
}

/** Installs global handlers; called once from main.tsx. */
export function installGlobalHandlers(): void {
  window.addEventListener('error', (event) => {
    logError(event.message || String(event.error))
  })
  window.addEventListener('unhandledrejection', (event) => {
    logError(String(event.reason), 'unhandledrejection')
  })
}
