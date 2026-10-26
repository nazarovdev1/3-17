# PROMPT — "3:17": a psychological horror game (Telegram Mini App + Web)

## 0. Your role and the rules of work

You are a senior game developer, technical lead and narrative designer in one person. Your job is to build a complete, polished, playable psychological horror game from an empty folder to a deployable build. Not a prototype, not a demo with placeholders: a finished game.

Rules you must follow for the entire project:

1. Work strictly in the phases from section 13. Finish a phase completely, run every check, update `PROGRESS.md`, commit, and only then start the next phase. Never start a new phase while anything in the current one is red.
2. Never say something works unless you actually ran it and saw it work. If you could not verify something, write that explicitly in `PROGRESS.md`.
3. No AI / LLM APIs, no backend, no database server, no paid services. The game is a fully static site. (AI narration will be added later; see section 15. Prepare the interface, do not implement it.)
4. At runtime the game must not request anything from external domains, except Telegram's official `telegram-web-app.js` script. All fonts are self-hosted via npm packages, all textures and sounds are generated procedurally or bundled as small local files.
5. No copyrighted assets of any kind. Everything visual and audio is procedural or created by you.
6. When something is ambiguous, choose the option that keeps the game stable on weak Android phones, and record the decision in `DECISIONS.md`.
7. No `TODO`, no placeholder text, no lorem ipsum, no dead buttons in the shipped game.
8. Every in-game text is in Uzbek (Latin script). Use the correct apostrophe characters: `oʻ`, `gʻ` with U+02BB (ʻ), and U+2019 (’) for the tutuq belgisi, e.g. `ma’no`. Code, comments, file names and docs are in English.

## 1. Product summary

"3:17" is a 30–45 minute psychological horror game set in a Soviet-era nine-storey panel building in Chilonzor, Tashkent, in winter, during constant power outages. The player has rented a suspiciously cheap one-room flat, number 47. Every night at exactly 3:17 the power goes out and someone knocks on the wall shared with flat 48. Flat 48 has been sealed and empty for twenty years. The voice behind the wall knows things about the player that it should not know.

The horror is psychological, not gory. Fear comes from silence, from things that change when you are not looking, from the game seeming to know you, and from slowly understanding what flat 48 really is.

The same story, the same save file and the same endings are delivered through two different presentations:

- **Desktop mode:** a first-person 3D walk through the flat, in a low-poly, PS1-era horror style.
- **Mobile mode:** a vertical, touch-first experience made of layered 2D pixel-art scenes with gyroscope parallax, hotspots, typewriter text and a chat-like overlay for the voice, with haptics.

## 2. Platforms and mode routing

The game runs inside Telegram as a Mini App (iOS, Android, Telegram Desktop, Telegram Web) and also in any normal browser.

Mode selection rules, evaluated at boot:

1. If the user has manually chosen a mode in Settings, use it.
2. Desktop mode only if ALL are true: `matchMedia('(pointer: fine)')` matches, viewport width ≥ 900 px, WebGL2 (or WebGL1) context creation succeeds, and the quick GPU check (section 11) passes.
3. Otherwise mobile mode. On wide screens mobile mode uses a centred, phone-width layout with dark side areas.
4. If desktop mode crashes, loses its WebGL context and cannot restore it, or stays under the FPS floor on the lowest quality tier, switch to mobile mode automatically, keep the current story position, and show a short in-game message (not an error screen).

Settings always offer a manual switch between modes.

## 3. Tech stack (fixed, do not substitute)

- Vite + React + TypeScript in `strict` mode. Pin exact versions in `package.json`. Make sure the React version and the `@react-three/fiber` major version are compatible with each other.
- State: Zustand.
- Desktop 3D: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`. The entire desktop presenter must be a lazy-loaded chunk (`React.lazy` + dynamic import) so mobile users never download Three.js.
- Mobile scenes: plain Canvas 2D, no WebGL required.
- Audio: Web Audio API. `tone` is allowed if it clearly simplifies things.
- Fonts: self-hosted through `@fontsource/*` packages, OFL-licensed. One monospace/typewriter body font and one display font for titles and glitch text. Before choosing, verify both fonts contain the glyphs ʻ (U+02BB) and ’ (U+2019); confirm it with a screenshot. If a font lacks them, choose another.
- Telegram: official `https://telegram.org/js/telegram-web-app.js` script plus typings, wrapped in your own adapter (section 10).
- Testing: Vitest, React Testing Library, Playwright.
- Quality: ESLint, Prettier, `tsc --noEmit`.
- Deploy target: Vercel, static output.

## 4. Architecture

Core principle: **presenters never contain story logic.** The story engine is pure TypeScript with no React and no DOM, fully deterministic and unit-testable. Presenters only render engine state and dispatch actions.

```
src/
  core/                 # pure TS, no React, no DOM
    engine/             # story runner, state machine, conditions, effects
    state/              # game state types, reducers, sanity, flags, inventory
    save/               # versioned save schema, migrations, storage adapters
    narration/          # NarrationProvider interface + StaticNarrationProvider
    validate/           # story graph validator (used by tests and CLI)
  content/
    story/              # nights 1–5 + endings as typed TS data
    text/               # all Uzbek strings, with variants
  platform/
    telegram/           # adapter: feature detection, haptics, cloud storage, fullscreen
    device/             # mode routing, GPU check, orientation, safe areas
    storage/            # localStorage + Telegram CloudStorage adapter
  audio/                # procedural audio engine, sound library, mixer
  ui/                   # shared UI: boot, warnings, title, settings, pause,
                        # subtitles, choices, endings, error boundaries
  presenters/
    mobile/             # Canvas 2D vignettes, parallax, hotspots, chat overlay
    desktop/            # R3F scene, apartment, controls, triggers, post FX (lazy)
    text/               # plain debug presenter that plays the whole story as text
  debug/                # overlay, node jumper, window.__game test API
scripts/
  validate-story.ts
tests/
  e2e/                  # Playwright
```

### 4.1 Story data model

Implement at least these types (extend if needed, do not simplify):

```ts
type NodeId = string
type Night = 1 | 2 | 3 | 4 | 5

interface StoryNode {
  id: NodeId
  night: Night
  location: LocationId // room, kitchen, bathroom, corridor, balcony, stairwell, flat48
  lines: Line[]
  choices?: Choice[] // if absent, `next` is required
  next?: NodeId
  onEnter?: Effect[]
  ending?: EndingId
  checkpoint?: boolean // autosave point
  desktop?: DesktopHint // how it is triggered in 3D: interact object, enter zone, timed, scripted event
  mobile?: MobileHint // which vignette, which hotspots, chat overlay or narration panel
}

interface Line {
  speaker: 'narrator' | 'voice' | 'player' | 'landlord' | 'muhabbat' | 'diary'
  variants: { when?: Condition; text: string }[] // first matching variant wins; last one has no condition
}

interface Choice {
  id: string
  label: string
  to: NodeId
  when?: Condition
  effects?: Effect[]
}

type Effect =
  | { type: 'sanity'; delta: number }
  | { type: 'flag'; key: string; value: boolean | number | string }
  | { type: 'item'; id: ItemId }
  | { type: 'sfx'; id: SfxId }
  | { type: 'fx'; id: FxId; intensity?: number; durationMs?: number }
  | { type: 'haptic'; pattern: HapticPattern }

type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { flag: string; eq?: unknown }
  | { sanityGte: number }
  | { sanityLt: number }
  | { hasItem: ItemId }
  | { itemCountGte: { prefix: string; count: number } }
  | { profile: keyof PlayerProfile; eq: string }
```

Text supports placeholders: `{name}`, `{fear}`, `{door}`, `{time}`. Placeholders are resolved by the `NarrationProvider`.

### 4.2 Narration provider (future AI hook)

```ts
interface NarrationProvider {
  resolveLine(line: Line, state: GameState): Promise<string>
}
```

Implement only `StaticNarrationProvider` (variants + placeholders). All presenters must get text through this interface, so that an `AiNarrationProvider` can be added later without touching anything else.

### 4.3 Save system

- Versioned schema (`saveVersion`) with migrations.
- Autosave on every `checkpoint` node and on `visibilitychange` / Telegram `deactivated`.
- Storage: localStorage always; additionally Telegram `CloudStorage` when available (respect its per-value size limit; keep the save compact).
- A corrupted or unreadable save never crashes the game: reset to a clean state and show a calm in-game message.
- After finishing the game: chapter select (nights) and an endings gallery.

### 4.4 Errors and resilience

- Root error boundary plus a separate error boundary around the 3D canvas.
- Handle `webglcontextlost` / `webglcontextrestored`. On failure, fall back to mobile mode (section 2, rule 4).
- Global `error` and `unhandledrejection` handlers write into an in-memory log visible in the debug overlay.
- The player can always leave: pause menu, back button and closing the app must always work. Never trap the user.

## 5. The story (expand this into the complete Uzbek script)

You write the full script in Uzbek: every line, every variant, every choice. Target: 5 nights, 12–20 nodes each, plus 3 endings. Style: short sentences, a lot of silence, everyday Tashkent details, no melodrama. Dialogue sounds like real people from Chilonzor, not like a translation.

### 5.1 Setting and characters

- **The flat (47):** 4th floor, one room, kitchen, bathroom, short corridor, balcony. Soviet details: carpet on the wall, an old Rubin TV, cast-iron radiator that knocks, gas stove, door chain, peephole, wall clock stopped at 3:17, wallpaper with a repeating pattern, a wardrobe.
- **Outside the window:** snow, a dim orange streetlamp, the windows of the opposite building.
- **Rustam aka, the landlord:** hands over the keys too quickly. One rule: "48-xonadonga e’tibor bermang. U yerda hech kim yashamaydi." (Write it properly with the correct apostrophe.)
- **Muhabbat opa:** elderly neighbour from the 3rd floor, talkative, met in the stairwell. Says 48 was sealed in 2006 after the tenant, Sardor, disappeared.
- **The voice (behind the wall of 48):** polite at first, then too familiar. Gradually starts using the player's own words and choices.
- **Sardor:** the previous tenant of 47, never seen. Known only through 7 diary pages hidden around the flat.

### 5.2 The hidden truth

Flat 48 is not a neighbour's flat. It is where flat 47 keeps whoever stayed too long. The voice was once a tenant of 47, just like the player. Every tenant who opens the door at 3:17 becomes the next voice. The stopped clock is the loop: time in 47 never passes 3:17. Sardor's disappearance stays supernatural and ambiguous. It is never framed as suicide or violence.

### 5.3 Intro: the rental form ("Ijara anketasi")

Before night 1, a diegetic rental form from the landlord. Its answers form `PlayerProfile` and feed text variants for the whole game:

1. Name: prefilled from Telegram `first_name` if available, otherwise typed (sanitized, max 20 characters).
2. "Yolgʻiz yashaysizmi?" → ha / yoʻq / hozircha.
3. "Eng koʻp nimadan qoʻrqasiz?" → qorongʻulik / yolgʻizlik / kimdir kuzatayotgani / unutilish.
4. "Uxlaganda eshigingiz…" → ochiq / yopiq.

The player must believe this is just flavour. Later the voice quotes these answers back.

### 5.4 Night by night

**Night 1 — "Koʻchib kelish".** Free exploration of the flat. Objects to inspect: the stopped clock, the landlord's note, the radiator, the TV, the window. Make tea in the kitchen (small sanity restore, once per night). At 3:16 the windows of the opposite building go dark one by one; at 3:17 the power cuts, the fridge hum stops, silence, then three knocks from the wall of 48. The voice: "Qoʻshni… uxlamayapsizmi?" Choices: answer / stay silent / knock back. Each sets a flag that matters later.

**Night 2 — "Devor".** Short daytime scene in the stairwell with Muhabbat opa (the history of 48 and Sardor). Night: the voice uses the profile ("Yolgʻiz yashaysiz-a? Men ham."). Tally marks scratched inside the wardrobe. The bathroom mirror reflection lags half a second behind. First 2 diary pages are findable.

**Night 3 — "Takror".** Diary pages describe the same voice, the same 3:17. The voice repeats the player's own earlier choices back as if they were its memories. The flat starts to lie: desktop — the corridor between the room and the front door becomes longer each time the player turns away (a looping corridor); mobile — a familiar scene comes back with one detail changed, and tapping that detail is the only way forward. Flag `never_answered_n3` is true only if the player never answers the voice tonight.

**Night 4 — "48".** The door of 48 is ajar. Before entering, the player can look through their own peephole and see someone standing in the stairwell, then nobody. Inside 48: an exact copy of flat 47, decayed, containing the player's own belongings and a calendar where dates are crossed out up to tonight. The voice: "Men oldin ham sen edim." A short diegetic fake glitch is allowed here (section 7.4).

**Night 5 — "3:17".** The final night. Three endings:

- **Ending A — "Qoʻshni":** the player opens the door at 3:17. Final scene: a new tenant moves into 47, and the player is now the one knocking. The ending card names the player as the resident of flat 48.
- **Ending B — "Ketish":** the player leaves the building before 3:17. Snowy street, relief. The last line is quietly wrong (something proves 47 is still waiting).
- **Ending C — "3:18" (hidden):** requires all 7 diary pages, sanity ≥ 40 and `never_answered_n3`. The player winds the stopped clock. For the first time the clock shows 3:18. The knocking stops. The voice says Sardor's name as if remembering it. Loop broken.

### 5.5 Mechanics

- **Sanity (es-hush), 0–100, starts at 100.** Drops on scares, on answering the voice, on lingering in dark rooms; rises a little with tea and lights. It never causes game over. It changes visuals, audio, text and ending eligibility. Bands: 100–70 clean, 69–40 subtle distortion, 39–15 heavy distortion, below 15 text corruption (letters swap and return).
- **No fail states.** No deaths, no restarts. The worst outcome is a worse ending.
- **Diary pages:** 7 collectible items, distributed over nights 2–5, never in the same place twice across modes' logic (same story positions, different physical presentation).
- **Things change when unobserved:** desktop — use camera frustum checks so objects move only when out of view; mobile — change details only when the player returns to a scene.

### 5.6 Meta-horror (all must be implemented and safe)

- If the player's real local time is between 00:00 and 05:00 at launch, the narrator adds one extra line about it being genuinely late.
- If the real clock reaches 3:17 while the game is running, a special one-time event fires regardless of the story position (a short knock + one line), without breaking the current node.
- If the player quit mid-night and returns later, the voice comments on it once, using the saved timestamp.
- Use the player's name sparingly: at most once per night in narration, more often from the voice in night 4–5.

### 5.7 Content limits

Psychological horror only. No gore, no blood pools, no depicted violence against people, children or animals, no suicide or self-harm themes or imagery, no mockery of religion. Maximum one real jump scare per night; tension is built with silence, sound and change.

## 6. Visual design — global style

- **Look:** low-resolution, PS1-era horror. Desktop renders at a low internal resolution (around 320–480 px tall, configurable per quality tier) and upscales with nearest-neighbour filtering. Mobile scenes are pixel art drawn procedurally on Canvas 2D at low resolution and scaled up crisply (`image-rendering: pixelated`).
- **Palette (base):** near-black `#0B0B0C`, cold dark blue `#141A22`, sodium streetlamp orange `#D98A2B`, sick fluorescent green `#9FBF8F`, worn paper `#CFC6B0`, voice/danger accent `#8E1F1F` (used rarely, never as blood).
- **Always dark:** ignore Telegram's theme colours; force a black background and header.
- **Permanent post effects:** film grain, vignette, very subtle scanlines. Sanity-driven effects: chromatic aberration, wobble, colour drain, screen tear, text corruption.
- **UI:** minimal, diegetic where possible (paper notes, the rental form, a lighter for the menu). Typewriter text that can be skipped with a tap/click. Choices are plain text options, numbered on desktop.
- **Title screen:** the window of flat 47 from outside at night, snow falling, one window lit, the title "3:17" in the display font, a quiet hum.

### 6.1 Desktop 3D environment

- The full flat 47 (all rooms), the stairwell landing of the 4th floor, flat 48 (decayed copy). Built from primitives and simple custom geometry; textures generated on canvas (wallpaper pattern, carpet ornament, concrete, tiles, wood).
- Lighting: one weak ceiling lamp per room before 3:17, flashlight cone after the outage, orange streetlamp light through the window, fog.
- Required interactive objects: clock, note, radiator, TV, window, kettle, wardrobe, mirror, front door + chain + peephole (fisheye view shader), the shared wall (listen), diary pages, light switches.
- Scripted events: windows going dark across the street, power cut, knocks (spatial audio), mirror lag, looping corridor, door of 48 ajar, figure in the peephole.

### 6.2 Mobile scenes

- Each location is a vertical scene of 3–4 parallax layers (background, room, objects, foreground darkness). Parallax driven by gyroscope; falls back to touch-drag if gyroscope is unavailable or permission is denied.
- Upper ~55% of the screen: the scene with tappable hotspots (subtle shimmer, never big icons). Lower part: narration panel with typewriter text and choices.
- During 3:17 sequences the voice appears in a chat-like overlay ("yozmoqda…" typing indicator, messages appearing with delays), styled as part of the game, never imitating Telegram's real system UI.
- Hold-to-listen at the wall: press and hold, haptic heartbeat, whispers rise.
- Peephole: full-screen fisheye vignette.

### 6.3 Effects and safety

- A content warning at first launch: psychological horror, flashing effects, headphones recommended, with a "Reduce flashing" toggle right there.
- "Reduce flashing" disables strobes and fast flashes and shortens all glitch effects.
- **Fake glitch (night 4 only):** at most 3 seconds, clearly stylized as part of the game ("Signal yoʻqoldi" with in-game styling), never blocks input after it ends, disabled entirely when Reduce flashing is on. It must never look like a real crash.

## 7. Audio design

All sound is procedural or synthesized locally:

- Ambient layers: low drone, wind, fridge hum (its sudden stop at 3:17 is a key moment), distant traffic before 3:17, nothing after.
- One-shots: radiator knocks, wall knocks (spatialized with `PannerNode` on desktop), footsteps on different floors, door chain, kettle, page pickup, clock tick (only in Ending C), heartbeat.
- The voice is text, never synthesized speech; its presence is marked by a short low whisper texture made of filtered noise.
- Mixer with master / music / effects sliders in Settings, persisted.
- Audio unlocks on the first user gesture (required on iOS). Show "Davom etish uchun bosing" if the context is suspended.
- Pause all audio on `visibilitychange` hidden and Telegram `deactivated`.

## 8. Controls and UX

**Desktop:** WASD to move, mouse to look via Pointer Lock; if Pointer Lock is unavailable or rejected (e.g., inside Telegram Desktop's webview), fall back to click-and-drag look. E interact, F flashlight, hold Q listen at wall, 1–3 or click for choices, Space/click skip typewriter, Esc pause. Show a one-time controls hint. Head bob subtle and toggleable.

**Mobile:** portrait only. Tap hotspots, tap to skip typewriter, buttons for choices, hold to listen. Respect safe areas. No accidental swipes closing the app (section 9).

**Both:** pause menu (continue, settings, chapter select once unlocked, quit to title), settings (mode, volumes, text size S/M/L, reduce flashing, head bob, language fixed to Uzbek), subtitles/text always visible.

## 9. Telegram integration

Wrap everything in `platform/telegram` and feature-detect every call with `isVersionAtLeast` or by checking the method exists. Never call an unsupported method.

- `ready()` as soon as the first frame renders, `expand()`, `requestFullscreen()` where supported.
- `disableVerticalSwipes()` where supported, so swiping does not close the game.
- `lockOrientation()` on mobile where supported.
- Set header, background and bottom bar colours to black.
- `HapticFeedback` for knocks, heartbeat, scares; map to `HapticPattern`. Fallback: `navigator.vibrate` on Android browsers; silently nothing elsewhere.
- `CloudStorage` for saves where supported.
- `BackButton` opens the pause menu.
- Use safe area insets (`safeAreaInset`, `contentSafeAreaInset`) plus CSS `env(safe-area-inset-*)`.
- Gyroscope / device orientation via Telegram's API where supported; otherwise `DeviceOrientationEvent` (with `requestPermission` on iOS after a user gesture); otherwise touch-drag.
- The game must work 100% outside Telegram as well, with all Telegram features simply absent.

## 10. Performance budgets

- Mobile initial JS ≤ 250 KB gzipped. Desktop 3D chunk ≤ 700 KB gzipped, lazy. Print a bundle report in CI and fail if exceeded.
- Desktop: ≥ 55 FPS on a mid-range laptop at the default tier. Quality tiers high / low; auto-drop to low if FPS < 40 for 3 seconds; fall back to mobile mode if still < 25 on low.
- Mobile: ≥ 30 FPS with Playwright CPU throttling ×4.
- Quick GPU check at boot: create a WebGL context, read the renderer string, sample FPS for the first seconds of the title scene, choose the tier.
- Dispose Three.js geometries, materials and textures when leaving scenes. No memory growth across nights (check with repeated night transitions in a test).

## 11. Debug tools

- `?debug=1` shows an overlay: FPS, mode, tier, current node, sanity, flags, inventory, last errors; plus a node jumper.
- In debug mode expose `window.__game` with `getState()`, `goTo(nodeId)`, `choose(choiceId)`, `setSanity(n)`, `setFlag(k, v)`, `setTime(iso)` for the meta-time features. In production builds this API must not exist.
- `presenters/text`: a plain presenter (`?presenter=text`) that plays the whole story as text with buttons. Used to proofread the story and for fast tests.

## 12. Testing and QA (non-negotiable)

`npm run check` must run, in order: lint, typecheck, unit tests, story validation, build, bundle budget. It must be green at the end of every phase.

**Story validator (`npm run validate:story`)** fails if: any choice or `next` points to a missing node; any node is unreachable from the start; any node cannot reach an ending; a cycle has no exit; a node has neither choices nor `next` nor `ending`; any line has no unconditional fallback variant; any text is empty or contains an unresolved placeholder name; any of the 3 endings is unreachable under some valid state; a diary page id is duplicated or fewer than 7 exist.

**Unit tests (Vitest):** engine transitions, every condition type, every effect type, sanity bands, ending eligibility (including the exact Ending C requirements), save/load, migrations, corrupted save recovery, placeholder resolution, mode routing logic, Telegram adapter with a mocked `window.Telegram`.

**Component tests:** settings persistence, content warning, choices rendering, typewriter skip, pause menu.

**E2E (Playwright)**, projects: Desktop Chrome 1440×900, iPhone 13 emulation, Pixel 7 emulation, small Android 360×640. Launch Chromium with flags that make WebGL work in headless (SwiftShader). Required tests:

1. Boots without Telegram and with a mocked Telegram WebApp object.
2. Full playthrough to each of the 3 endings using `window.__game` (fast) AND at least one ending played through real clicks/taps (slow).
3. Save → reload → resume at the same node with the same state.
4. Audio unlock flow (suspended context → tap → running).
5. Rotating the device / resizing the window does not break layout or state.
6. WebGL disabled (separate project with WebGL turned off) → desktop viewport still gets a working game in mobile mode.
7. Simulated WebGL context loss in desktop mode → recovery or fallback without losing story position.
8. Any `console.error` or `pageerror` fails the test.
9. A screenshot of every location in both modes saved to `tests/screenshots/`. Open and look at them yourself; fix anything ugly, cut off, unreadable or overlapping. Check Uzbek apostrophes render correctly.

**Manual checklist** in `QA.md`, executed by you in a real browser where possible: pointer lock fallback, looping corridor behaviour, peephole shader, all hotspots reachable on a 360 px wide screen, Reduce flashing really removes flashes, back button and pause always work.

## 13. Phases and exit criteria

- **Phase 0 — Scaffold.** Vite + React + TS strict, lint, prettier, Vitest, Playwright, `npm run check`, `PROGRESS.md`, `DECISIONS.md`, `QA.md`. Exit: empty app builds and `check` is green.
- **Phase 1 — Core engine.** Types, engine, conditions, effects, sanity, save system, narration provider, validator, unit tests. Exit: 100% of engine branches covered by tests, `check` green.
- **Phase 2 — Full story content.** The complete Uzbek script for intro, 5 nights and 3 endings, plus the text presenter. Exit: validator green, all endings playable in the text presenter, you have read the whole script once start to finish and fixed weak or repetitive lines.
- **Phase 3 — Shell and platform.** Boot, content warning, title screen, settings, pause, endings screens, chapter select, Telegram adapter, mode routing, error boundaries, debug overlay. Exit: E2E tests 1, 3, 8 pass.
- **Phase 4 — Mobile presenter.** All vignettes, parallax, hotspots, narration panel, chat overlay, hold-to-listen, peephole, haptics, sanity effects. Exit: the whole game is playable on mobile emulation to every ending, screenshots reviewed.
- **Phase 5 — Audio.** Engine, all sounds, mixer, unlock flow, pause handling. Exit: E2E test 4 passes, no audio errors in console.
- **Phase 6 — Desktop 3D presenter.** Flat, stairwell, flat 48, controls with fallback, interactions, triggers mapped to story nodes, post effects, scripted events, quality tiers. Exit: whole game playable on desktop to every ending, FPS budget met, E2E 6 and 7 pass.
- **Phase 7 — Horror polish.** Meta-horror features, things changing when unobserved, looping corridor, mirror lag, fake glitch with its safety rules, pacing pass on every night. Exit: you played each night in both modes and documented pacing fixes in `PROGRESS.md`.
- **Phase 8 — Full QA.** Entire E2E suite, performance and memory checks, manual checklist, every bug fixed. Exit: everything green, `QA.md` fully checked.
- **Phase 9 — Release docs.** `README.md` with: local run, tests, Vercel deploy steps, creating the bot with BotFather and attaching the Mini App URL (the free `*.vercel.app` address is enough, no custom domain needed), and how to switch on debug mode. Exit: a fresh clone following the README produces a working build.

## 14. Definition of done

The game is done only when: all phases are complete; `npm run check` and the full Playwright suite are green; all 3 endings are reachable in both modes; there are no console errors; no placeholder text exists; the game works inside Telegram and in a normal browser; weak devices automatically get the lighter experience instead of a broken one; and `PROGRESS.md` honestly lists anything that could not be verified.

## 15. Future work (prepare, do not implement)

- `AiNarrationProvider`: personalised lines generated by an LLM, behind the existing `NarrationProvider` interface, with the static text as fallback.
- A Telegram bot backend that sends rare, opt-in night messages from "the neighbour" to players who stopped mid-game.
- Leave clean extension points for both, and describe them in `DECISIONS.md`.
