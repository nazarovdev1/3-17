/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' only in test builds (`.env.e2e`): compiles in the window.__game debug API. */
  readonly VITE_GAME_API?: string
}
