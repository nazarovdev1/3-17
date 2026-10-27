# HANDOFF — "3:17" F3 owner review

## Latest corrective pass (2026-10-27)

The original handoff below is historical. The F3 corrective pass and final verification
are recorded in PROGRESS.md and QA.md. F3 stays unchecked until the owner's review;
do not start F4 without explicit owner approval.

- ONE 12-shot sheet: `audit/screenshots/f3-contact-sheet.jpg` (local, git-ignored).
- All 16 HD views plus the numbered plan: `audit/screenshots/f3/`.
- Near-black measurements: `audit/screenshots/f3/darkness.json`.
- Rebuild the sheet: `node audit/f3-contact-sheet.mjs`.
- Test-build audit poses use `render=still&auditView=...`; gameplay uses normal spawns.
  `F3_SHOTS` optionally selects capture names.

CPU-renderer FPS does not establish native HD laptop performance. Physical GPU, Telegram
and audio validation remain F8. After approval, F4 owns the figure, TV picture/glow,
physical phone, interaction reach, in-hand inspection and lagging mirror reflection.
No F4 implementation has been started during this pass.

## Original handoff

Written 2026-10-27 because the previous agent's session limit ran out. Read this first, then
`FIX_PROMPT.md` (untracked, owner's file — never commit it), `PROGRESS.md`, `DECISIONS.md`
(items 21–31 are the newest), `AUDIT.md`.

## Owner rules (still in force)

- The owner writes in Uzbek; answer in Uzbek. Code, comments and commit messages in English.
- Work in phases F0–F8 (FIX_PROMPT §10). **Stop at the end of every phase.** F1, F3, F4
  and F6 need the owner's real review — do not start the next phase until the owner says so.
- At each stop: ONE contact sheet image (≤ 12 labelled key shots) + a short table of rubric
  scores (FIX_PROMPT §9). Do not dump all screenshots on the owner.
- Look at your own screenshots before claiming anything looks good.
- Keep `npm run check` and the Playwright suite green. Extend tests, never delete them to pass.
- Figure (F4): build it yourself, smooth anatomical humanoid, long coat, slightly too tall,
  only ever seen dark/backlit; no boxes/capsules/cones. At end of F4 show 3 shots: under the
  door, frosted glass, peephole. Mixamo only if the owner later sends one.
- Sounds (F5): Freesound CC0/CC-BY only, the owner gives the API key before F5.
- Fonts: Literata (narration), Inter (UI) — owner approved, keep.
- Sketchfab token: `.env.local` (`SKETCHFAB_TOKEN=…`, git-ignored). Never commit or print it.
- If context runs low mid-phase: update PROGRESS.md (done / half-done / open bugs / next
  step), commit, tell the owner.

## Where things are

| What                                                | Where                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| World plan (only source of positions)               | `src/content/world/layout.ts`                                                                                       |
| Walk/collision                                      | `src/content/world/walk.ts`                                                                                         |
| Model scale/orientation maths                       | `src/content/world/scale.ts`                                                                                        |
| Validator + tests                                   | `src/core/validate/world.ts`, `tests/unit/validate/world.spec.ts`, `npm run validate:world`                         |
| Floor plan SVG                                      | `scripts/world/floorplan.ts` → `docs/floorplan.svg`                                                                 |
| Desktop renderer                                    | `src/presenters/desktop/World.tsx`, `world/{Architecture,Furniture,Doors,Lighting,Outside,materials,stretch}.ts(x)` |
| Story anchors, spawn views, switches                | `src/presenters/desktop/layout.ts`                                                                                  |
| Render quality (DPR, software GL, `?quality=ultra`) | `src/presenters/desktop/quality.ts`                                                                                 |
| Asset pipeline                                      | `scripts/assets/{sources,fetch,build}.ts`, `npm run assets`                                                         |
| Asset manifest (generated)                          | `src/assets/manifest.gen.json`, `CREDITS.md`                                                                        |
| QA captures (git-ignored output)                    | `audit/*.spec.ts` → `audit/screenshots/`                                                                            |

Run HD captures: `npx playwright test -c audit/playwright.audit.config.ts f3` (~12 min on
SwiftShader; writes `audit/screenshots/f3/01…10*.png`). Floor plan PNG: `… floorplan`.

## State of F3 at handoff

Done (see PROGRESS.md "F3"): plan in metres, floorplan.svg, validate:world in `check`,
15 Sketchfab models, full PBR renderer, lighting, post effects, doors, mirror, outside.

**Not yet verified after the last edits** (they were made while a capture was running):

- `npm run check` was NOT run after the last batch of changes. Last known: typecheck, lint,
  desktop unit tests and validate:world green.
- The full Playwright suite was NOT run since F3 started. Expect desktop E2E failures that
  depend on the old coordinates, e.g. `tests/e2e/desktop.spec.ts` "E interacts with the
  clock" (spawn is now `[0.6, 1.6, -0.6]`, clock on the façade wall at x −1.3) and
  `desktop-horror.spec.ts` clock-shift / mirror tests. Fix the tests or the views; keep
  them meaningful.
- The last capture (`audit/screenshots/f3/`) may be mid-run or stale; re-run it.

Latest visual review (by eye, before the last fixes):

- Good: room with wall carpet over the sofa, window, radiator, chandelier; corridor view;
  flat 48 in the dark with the torch (closest to the target mood); outage shot.
- Fixed after that review, not yet re-checked: too bright/warm (bulbs 38→9 cd, darker wall
  tints), stucco ceiling (whitewash normalScale 0.18), doors looked like plywood (now
  `plain` gloss paint), balcony glass opaque (now clear), torch on in lit rooms (now follows
  the outage), chair blocking the spawn view (moved west of the table), stairwell dado
  (paint ≤1.5 m, whitewash above), calendar texture, long walls split per room (bathroom
  side of the shared wall was plaster instead of tiles), live Reflector mirror in the
  bathroom (hardware only), bathroom spawn moved.

## Next steps to finish F3

1. Re-run the f3 capture, review every image, fix what scores < 4 on the rubric
   (readability, spatial logic, lighting/mood ≤60 % near-black, fear, polish). Things to
   check: model orientations (Sketchfab fronts may face the wrong way — fix with `orient`
   / `rotation` in layout.ts, then `npx tsx scripts/validate-world.ts`), coat hooks and shoe
   rack facing, window glass, kitchen sink run, bathroom tiles, landing doors 46/49/lift,
   stairs, nothing floating or clipping.
2. `npm run check` green; full `npx playwright test` green (fix tests for new coordinates).
3. Record rubric scores in `QA.md` (FIX_PROMPT §9) for the F3 shots.
4. Build ONE contact sheet (≤12): floorplan + room ×2 + kitchen + bathroom + corridor +
   landing + flat 48 + window + outage. A helper exists in the old scratchpad
   (`f2sheet.py` pattern: PIL, 2 columns, labels) — recreate it in a temp dir if missing.
5. Update PROGRESS.md, commit (exclude `FIX_PROMPT.md`), then STOP and show the owner the
   contact sheet + rubric table in Uzbek, and wait for their review before F4.

Commit trailer used so far: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` —
use your own tool's attribution instead.
