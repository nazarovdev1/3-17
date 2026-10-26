# QA

Manual checklist (spec 12). Executed in a real browser where possible; every item gets an
honest ✅ / ❌ / not-verified note with a date.

## Manual checklist (to be executed during Phases 3–8)

- [ ] Pointer Lock works in a normal browser; fallback to click-and-drag look inside a
      webview without Pointer Lock.
- [ ] Looping corridor (night 3, desktop) actually extends when the player looks away.
- [ ] Peephole fisheye view renders correctly (desktop shader and mobile vignette).
- [x] All current mobile hotspots stay within the 360×640 scene; real-input ending runs
      and cancelled/successful wall holds pass (2026-10-25, Chromium emulation).
- [ ] "Reduce flashing" removes the night 4 fake glitch and all strobes.
- [ ] Telegram BackButton opens the pause menu; the player can always leave.
- [ ] Pause menu reachable at any moment; closing the tab mid-game autosaves.
- [x] IBM Plex Mono and Oswald contain ʻ (U+02BB) and ’ (U+2019); WOFF cmap check and
      visual review of `tests/screenshots/mobile-font-glyphs.png` (2026-10-25).
- [ ] No external network requests at runtime except telegram-web-app.js.

## E2E status

| #   | Test (spec 12)                                                                   | Status                                                   |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Boots without / with mocked Telegram                                             | passed (Phases 3–4)                                      |
| 2   | Full playthrough to all 3 endings via `window.__game` + one ending by real input | mobile A/B/C real input passed; full debug paths pending |
| 3   | Save → reload → resume                                                           | passed (Phases 3–4)                                      |
| 4   | Audio unlock flow                                                                | pending (Phase 5)                                        |
| 5   | Rotate / resize does not break layout or state                                   | passed (Phases 3–4)                                      |
| 6   | WebGL disabled → mobile mode on desktop viewport                                 | passed (Phases 3–4)                                      |
| 7   | WebGL context loss → recovery or fallback                                        | pending (Phase 6)                                        |
| 8   | No console.error / pageerror                                                     | active since Phase 0 (boot spec)                         |

## Run log

- 2026-10-25 — Phase 0. `npm run check` green after scaffold. Playwright browsers not yet
  installed; boot e2e not yet executed (no browsers).

- 2026-10-25 — Phase 3. All 50 e2e tests across 5 Chromium projects green; fixed an unstable
  zustand selector (React #185), a Telegram-script CloudStorage console.error, and several
  test-flow bugs (warning checkbox, disabled form button).

- 2026-10-25 — Phase 4. `npm run check` green (117 tests, validator, build, 93.1 KB gz
  mobile JS). Full Playwright suite: 71 passed, 4 expected project-specific skips;
  A/B/C mobile real-input routes pass in every project with zero console/page errors.
  Scene sweep checks every non-ending story node, current hotspot bounds, peephole text,
  cancelled/successful holds, missing orientation API, and pause/resume. Four small-Android
  checks rerun after final target alignment / hold cleanup. Browser runs needed network
  access for the permitted official Telegram script; restricted runs correctly failed
  the console gate on `ERR_NETWORK_ACCESS_DENIED`.
- 2026-10-25 — Opened all 11 used mobile scene screenshots, three ending cards and the
  font glyph sheet in `tests/screenshots/`. All seven story locations are represented
  (the balcony uses the window vignette). Long narration and choices scroll within the
  lower panel; peephole text remains visible. Review fixes: room furniture, kitchen/tile
  detail, hotspot glints, calendar alignment. Desktop scene evidence remains Phase 6.
- Hardware limitations: physical haptics, iOS permission prompts and real Telegram sensor
  behavior remain unverified. Audio is Phase 5. Desktop shader/Pointer Lock and horror
  polish are later phases. Reduce flashing currently disables mobile decorative motion,
  lamp flicker, tears and corruption; the Phase 7 fake-glitch check remains pending.
