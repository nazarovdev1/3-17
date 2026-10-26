# QA

Manual checklist (spec 12). Executed in a real browser where possible; every item gets an
honest ✅ / ❌ / not-verified note with a date.

## Manual checklist (to be executed during Phases 3–8)

- [ ] Pointer Lock works in a normal browser; fallback to click-and-drag look inside a
      webview without Pointer Lock.
- [ ] Looping corridor (night 3, desktop) actually extends when the player looks away.
- [ ] Peephole fisheye view renders correctly (desktop shader and mobile vignette).
- [ ] All hotspots reachable and tappable on a 360 px wide screen.
- [ ] "Reduce flashing" removes the night 4 fake glitch and all strobes.
- [ ] Telegram BackButton opens the pause menu; the player can always leave.
- [ ] Pause menu reachable at any moment; closing the tab mid-game autosaves.
- [ ] Fonts contain ʻ (U+02BB) and ’ (U+2019); verified visually on a screenshot.
- [ ] No external network requests at runtime except telegram-web-app.js.

## E2E status

| #   | Test (spec 12)                                                                   | Status                           |
| --- | -------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Boots without / with mocked Telegram                                             | pending (Phase 3)                |
| 2   | Full playthrough to all 3 endings via `window.__game` + one ending by real input | pending (Phase 3+)               |
| 3   | Save → reload → resume                                                           | pending (Phase 3)                |
| 4   | Audio unlock flow                                                                | pending (Phase 5)                |
| 5   | Rotate / resize does not break layout or state                                   | pending (Phase 3+)               |
| 6   | WebGL disabled → mobile mode on desktop viewport                                 | pending (Phase 3)                |
| 7   | WebGL context loss → recovery or fallback                                        | pending (Phase 6)                |
| 8   | No console.error / pageerror                                                     | active since Phase 0 (boot spec) |

## Run log

- 2026-10-25 — Phase 0. `npm run check` green after scaffold. Playwright browsers not yet
  installed; boot e2e not yet executed (no browsers).

- 2026-10-25 — Phase 3. All 50 e2e tests across 5 Chromium projects green; fixed an unstable
  zustand selector (React #185), a Telegram-script CloudStorage console.error, and several
  test-flow bugs (warning checkbox, disabled form button).
