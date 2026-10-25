# PROGRESS

Honest, phase-by-phase record. A phase is only marked done when every check ran green.

- [x] Phase 0 — Scaffold (see below)
- [ ] Phase 1 — Core engine
- [ ] Phase 2 — Full story content
- [ ] Phase 3 — Shell and platform
- [ ] Phase 4 — Mobile presenter
- [ ] Phase 5 — Audio
- [ ] Phase 6 — Desktop 3D presenter
- [ ] Phase 7 — Horror polish
- [ ] Phase 8 — Full QA
- [ ] Phase 9 — Release docs

## Phase 0 — Scaffold

Done:

- Vite 8 + React 19 + TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`) with `@/*` path alias.
- ESLint 10 flat config (typescript-eslint recommendedTypeChecked, react-hooks), Prettier,
  Vitest 5 (jsdom) with a first unit test, Playwright 1.64 config with all 5 projects
  (desktop-chrome, iphone-13, pixel-7, small-android, no-webgl) and a boot smoke spec.
- `npm run check`: lint → format:check → typecheck → test → validate:story → build → budget.
- Bundle budget gate reading `dist/.vite/manifest.json` (mobile ≤ 250 KB gz JS,
  desktop-3d subtree ≤ 700 KB gz).
- `scripts/validate-story.ts` intentionally exits 0 with a note: story content is authored in
  Phase 2, the real validator lands in Phase 1.
- Committed: see git log.

Not yet verified (planned):

- Playwright browsers not yet downloaded (`npx playwright install chromium`) — planned before
  the first real e2e run in Phase 3.
- e2e suite not part of `check`; it runs via `npm run e2e`.
