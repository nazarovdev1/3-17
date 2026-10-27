# 3:17

A 30–45 minute psychological horror game in Uzbek (Latin script). Every night at exactly
3:17 the power goes out in flat 47, and someone knocks from behind the wall of flat 48 —
a flat that has been sealed for twenty years.

It runs as a Telegram Mini App and in any normal browser. The same story and save file are
presented two ways:

- **Desktop** (fine pointer, ≥ 900 px wide, working WebGL): a first-person, textured HD 3D walk
  through the flat. Loaded lazily, so phones never download Three.js.
- **Mobile** (everything else): HD stills of the same world, a small WebGL2 depth-parallax
  shader with Canvas fallback, object hotspots, readable narration and the voice overlay.

The game is a fully static site: no backend, no database, no AI APIs, no paid services.
Assets, recorded sounds and fonts are bundled locally and credited in Settings. The low
audio drone and missing-file fallbacks remain procedural. The only automatic external
request at runtime is Telegram's official `telegram-web-app.js`.

## Requirements

- Node.js 22 or newer (developed on 22.19) and npm 10.
- For browser tests only: Playwright's Chromium (`npx playwright install chromium`).

## Run locally

```sh
git clone https://github.com/nazarovdev1/3-17.git
cd 3-17
npm ci
npm run dev          # http://localhost:5173 with hot reload
```

To try the production build:

```sh
npm run build        # writes dist/
npm run preview      # serves dist/ at http://localhost:4173
```

Useful URLs while developing:

| URL                | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `/`                | The game (mode chosen automatically; switchable in Settings) |
| `/?presenter=text` | Plain text presenter: the whole story as text and buttons    |
| `/?debug=1`        | Debug overlay (see [Debug mode](#debug-mode))                |

## Tests and checks

```sh
npm run check
```

runs, in order: ESLint, Prettier check, `tsc --noEmit`, Vitest unit/component tests, the story
validator, the production build, and the bundle budget gate (mobile JS ≤ 250 KB gzipped,
lazy desktop 3D ≤ 700 KB gzipped, and no debug API in production JS). It must be green.

Individual steps: `npm run lint`, `npm run typecheck`, `npm test`, `npm run validate:story`,
`npm run budget` (after a build).

Browser tests (Playwright, five Chromium projects: desktop 1440×900, iPhone 13, Pixel 7, small
Android 360×640 and a WebGL-disabled desktop):

```sh
npx playwright install chromium   # once
npm run e2e                       # about 10 minutes; runs on a single worker
npx playwright test tests/e2e/qa.spec.ts --project=small-android   # a subset
```

The Playwright web server builds a separate test variant into `dist-e2e/` (with the
`window.__game` API compiled in via `.env.e2e`) and serves it on port 4174. The production
`dist/` is never used by the tests. WebGL runs on SwiftShader, so no GPU is required.
Screenshots of every location in both modes are written to `tests/screenshots/`.

## Recorded sound assets

Optimised sounds and the manifest are committed; normal builds/tests need no Freesound
credential or FFmpeg. To rebuild recordings, install FFmpeg (including ffprobe), put
`FREESOUND_API_KEY` in ignored `.env.local`, then run:

```sh
npm run assets:fetch -- --sounds-only
npm run assets:build -- --sounds-only
npm run assets:verify-sounds
```

Set `FFMPEG_PATH` to the executable's full path if it is not on PATH. Pinned ids and
excerpts live in `scripts/assets/sound-sources.ts`. The API must report CC0 or CC-BY with
the pinned version; NC, ND, SA and unknown licenses are refused. Sources/authors/licenses
are generated into `CREDITS.md` and Settings. API credentials never belong in git.

Effects and the sparse clock use mono/32 kHz FLAC; continuous ambience uses 96 kbps AAC.
The verification command measures the shipped decode: -6 ±0.5 dBFS effect peaks,
-23 ±0.75 LUFS loops, a short fridge stop and silent clock gaps. Raw downloads and reports
stay in ignored `.asset-cache/`. A targeted rebuild may add `--only=sound_loop_clock`.

## Mobile scene assets

The committed 1080×1920 WebP stills and 270×480 grayscale depth maps require no runtime
3D engine. Only the displayed camera/state pair is fetched; scene changes release decoded
images and GPU objects. Canvas handles unavailable/lost WebGL; Reduce flashing stops motion.

```sh
npm run assets:stills
npm run assets:stills -- --only=room-changed,peephole-close
npx tsx scripts/review-stills.ts
```

The export command starts its own local Vite test server on port 4175 and uses Playwright
at `?render=still&cam=<id>&state=<state>&quality=ultra`. Recipes and cameras are pinned in
`src/presenters/mobile/still-scenes.ts`; `stills.gen.json` records local paths, hashes and
camera-projected object anchors. The export bridge is absent from production. It uses the
credited desktop world and settles changed arrangements before capturing; no image API or
external runtime requests are involved. Model/audio rebuilds preserve the still directory.

Review sheets and five-size screenshots are written to ignored `audit/screenshots/f6/`.
The unit/budget gates enforce local files, hashes, the 10 MB total, valid scene coverage and
non-overlapping 48 px hit rectangles. Browser tests cover all five required screen sizes,
touch hold cancellation, native depth rendering, damaged-image retry and context-loss fallback.

## Debug mode

- Add `?debug=1` to the URL (or run `localStorage.setItem('g317:debug', '1')` in the console
  and reload; remove the key to turn it off). An overlay shows FPS, mode, quality tier, the
  current node, sanity, flags, inventory and recent errors, plus a node jumper. It works on
  the deployed site too.
- The scripting API `window.__game` (`getState`, `goTo`, `choose`, `setSanity`, `setFlag`,
  `setTime`, `getStep`, `advance`, …) exists only in test builds with debug on:

  ```sh
  npm run build:e2e && npm run preview:e2e   # then open http://localhost:4174/?debug=1
  ```

  Production builds (`npm run build`, Vercel) do not contain it; `npm run budget` fails if
  they ever do.

## Deploy to Vercel

The repository includes `vercel.json` (Vite, `npm ci`, `npm run build`, output `dist`).

Through the dashboard:

1. Push the repository to GitHub.
2. In Vercel, **Add New… → Project**, import the repository. The settings are read from
   `vercel.json`; leave environment variables empty.
3. **Deploy**. You get a free HTTPS address such as `https://3-17.vercel.app`. Every push to
   `main` redeploys it.

Or from the command line:

```sh
npm i -g vercel
vercel           # first run links the project and makes a preview deployment
vercel --prod    # production deployment
```

Open the address in a normal browser to confirm the game loads before attaching it to a bot.

## Run it as a Telegram Mini App

Telegram only needs an HTTPS URL; the free `*.vercel.app` address is enough, no custom domain.

1. In Telegram, open [@BotFather](https://t.me/BotFather) and send `/newbot`. Choose a display
   name and a username ending in `bot`. Keep the token private; this game does not need it,
   because it has no backend.
2. Attach the game as the bot's Mini App: send `/mybots`, pick the bot, then
   **Bot Settings → Configure Mini App → Enable Mini App**, and send your Vercel URL
   (for example `https://3-17.vercel.app`). The bot profile now shows an **Open** button.
3. Optional, a menu button in the chat: `/mybots` → bot → **Bot Settings → Menu Button**,
   send the same URL and a title such as `3:17`.
4. Optional, a direct link: send `/newapp`, choose the bot, give a title, description and
   photo, the same URL, and a short name. Players can then open
   `https://t.me/<bot_username>/<short_name>`.

Inside Telegram the game expands to full screen where supported, disables swipe-to-close,
forces a black header, uses haptics, keeps a copy of the save in Telegram CloudStorage, and
maps Telegram's back button to the pause menu. Every one of these is feature-detected; outside
Telegram they are simply absent.

## Project layout

```
src/core/         story engine, state, saves, narration provider, validator (pure TS)
src/content/      the Uzbek story (nights 1–5, endings) as typed data
src/platform/     Telegram adapter, mode routing / GPU check, storage
src/audio/        recorded Web Audio playback, mixer, spatial cues and synth fallbacks
src/ui/           shell screens: warning, title, form, settings, pause, endings
src/presenters/   mobile (HD stills, tiny WebGL2/Canvas renderer), desktop (R3F, lazy), text
src/debug/        overlay and the test-build window.__game API
scripts/          story validator, bundle budget, font glyph check
tests/            unit (Vitest) and e2e (Playwright)
```

`PROGRESS.md` records what was built and verified in each phase, `DECISIONS.md` the design
decisions, and `QA.md` the manual checklist, including what still needs real devices.

## License

GPL-3.0; see `LICENSE`.
