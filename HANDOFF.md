# HANDOFF — start phase F5 (audio) of "3:17"

Written 2026-10-27, after F4 (commit `2bc1be4`). Read this first, then `FIX_PROMPT.md`
(untracked, the owner's file — never commit it; §8 is F5), `PROGRESS.md` (F4 section),
`DECISIONS.md` (33–41 are the newest), `docs/fear-design.md` (which sound belongs to which
beat), `QA.md`.

## Owner rules (still in force)

- The owner writes in Uzbek; answer in Uzbek. Code, comments and commit messages in English.
- Work in phases F0–F8 (FIX_PROMPT §10). **Stop at the end of every phase** with a short
  report; F1, F3, F4 and F6 need the owner's real review. Do not start F6 without approval.
- Keep `npm run check` and the Playwright suite green. Extend tests, never delete or relax
  them to pass.
- Sounds: **Freesound CC0 or CC-BY only** (Sonniss GDC bundles are allowed by FIX_PROMPT §3
  too). No CC-NC, CC-ND, unknown licenses, ripped game audio. Every sound gets a line in
  `CREDITS.md` and in Settings → Mualliflar (credits are generated from the asset manifest).
- The owner gives the Freesound API key. Store it only in `.env.local` as
  `FREESOUND_API_KEY=…` (git-ignored via `*.local`, next to `SKETCHFAB_TOKEN`). Never print
  it, log it, or commit it. Never commit `FIX_PROMPT.md`.
- No runtime requests to other domains: sounds are downloaded at build time, optimised, and
  shipped from `public/assets/` like the models.
- If context runs low mid-phase: update PROGRESS.md (done / half-done / open bugs / next
  step), commit, tell the owner.

## F5 scope (FIX_PROMPT §8)

Replace the synthesized one-shots with real recorded sounds; keep the procedural drone only
as a low layer. Needed:

- Footsteps on **parquet, painted boards (linoleum-like), tiles, concrete** — several
  variations each, picked at random, slight pitch/volume jitter. The desktop already asks for
  the right floor: `footstepAt()` in `src/presenters/desktop/layout.ts` returns `step_wood`,
  `step_board`, `step_tile`, `step_concrete`.
- Old door hinges (`door_open`), door shut (`door_close`), door chain (`chain`).
- Radiator knocks (`radiator`), fridge hum (ambience `fridge`) and the fridge **stopping**
  (`fridge_stop` — the scariest sound in the game: the hum must cut cleanly, then silence).
- Kettle (`kettle`, `tea`), page/paper (`page`), pen (`pen`), light switch (`switch`).
- Distant city winter ambience (`traffic`), wind against old window frames (`wind`),
  muffled neighbour TV, TV static (`static`).
- Knocks on a panel wall (`knock`, `knock_soft`, `knock_triple`), cloth rustle, breath
  (`whisper` is used for the voice/breathing layer), heartbeat, phone vibration
  (`phone_buzz`).
- Loudness-normalise everything (e.g. ~-23 LUFS for ambience, consistent peaks for one-shots).
- Spatial audio: HRTF panning on desktop already exists (`audio.setSpatial`, `play(id,
position)`); keep it, check positions (knocks come from the party wall `SHARED_WALL` in
  `src/audio/AudioController.tsx`; scripted spatial cues in `src/presenters/desktop/events.ts`;
  doors play at their hinge; the phone buzzes at the table / under the pillow).
- A short "headphones recommended" hint at the start already exists in the content warning
  (`warning.headphones` in `ui.yaml`); keep it visible.

## Where things are

| What                                    | Where                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sound ids (type)                        | `src/core/state/types.ts` (`SfxId`)                                                            |
| Synth recipes (current placeholders)    | `src/audio/synthesis.ts` (`SOUND_IDS`, `synthSound`, `synthAmbience`)                          |
| Playback engine (buffers, HRTF, scenes) | `src/audio/engine.ts` (`buffer()`, `play()`, `setScene()`, ambience `LAYERS`)                  |
| Which scene/ambience per beat           | `src/audio/presentation.ts` (`audioScene`)                                                     |
| Story → sound events                    | `src/audio/AudioController.tsx`; story `sfx(...)` effects in `src/content/story`               |
| Asset pipeline                          | `scripts/assets/{sources,fetch,build}.ts`, `npm run assets`                                    |
| Asset manifest / loader / credits       | `src/assets/manifest.gen.json`, `src/assets/loader.ts`, `CREDITS.md`, `src/ui/CreditsList.tsx` |
| Budgets                                 | `scripts/check-bundle.mjs` (desktop ≤ 60 MB, flat 47 playable ≤ 25 MB, mobile)                 |
| Audio tests                             | `tests/unit/audio/*.spec.ts`, E2E audio checks via `window.__game.getAudioState()`             |

Suggested shape: add `kind: 'sound'` to the pipeline (source `freesound`, pinned by sound id,
license read from the API and refused unless CC0/CC-BY), encode to Opus/WebM or AAC/M4A at a
sensible bitrate, store loudness-normalised files, and give the engine a decoded-buffer path
that falls back to the synth recipe if a file is missing (so tests and the mobile build stay
robust). Keep sound files out of the mobile initial JS; respect the size budgets.

## Known open items carried from F4

- The full Playwright suite was 169 passed / 3 failed under heavy machine load (software
  rendering long routes and the 55 FPS gate); the unchanged F3 commit failed the same tests
  under the same load. Rerun on a quiet machine; if they still fail, profile — do not relax.
- Mobile (F6) has not been touched in F4.

## When F5 is done

`npm run check` green, full Playwright green, CREDITS updated, DECISIONS/PROGRESS updated,
commit (without `FIX_PROMPT.md`, `.env.local` or any key), then STOP and report to the owner
in Uzbek: which sounds were added (source, license), what was verified, what could only be
judged by ear.
