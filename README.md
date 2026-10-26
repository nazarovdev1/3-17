# 3:17

A 30–45 minute psychological horror game in Uzbek (Latin script). Every night at exactly
3:17 the power goes out in flat 47, and someone knocks from behind the wall of flat 48 —
a flat that has been sealed for twenty years.

It runs as a Telegram Mini App and in any normal browser. The same story and save file are
presented two ways:

- **Desktop** (fine pointer, ≥ 900 px wide, working WebGL): a first-person, PS1-style 3D walk
  through the flat. Loaded lazily, so phones never download Three.js.
- **Mobile** (everything else): vertical Canvas 2D pixel-art scenes with gyroscope parallax,
  hotspots, typewriter narration and a chat-style overlay for the voice.

The game is a fully static site: no backend, no database, no AI APIs, no paid services. All
sound and textures are generated procedurally; fonts are bundled. The only external request
at runtime is Telegram's official `telegram-web-app.js`.

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
src/audio/        procedural Web Audio engine and mixer
src/ui/           shell screens: warning, title, form, settings, pause, endings
src/presenters/   mobile (Canvas 2D), desktop (React Three Fiber, lazy), text
src/debug/        overlay and the test-build window.__game API
scripts/          story validator, bundle budget, font glyph check
tests/            unit (Vitest) and e2e (Playwright)
```

`PROGRESS.md` records what was built and verified in each phase, `DECISIONS.md` the design
decisions, and `QA.md` the manual checklist, including what still needs real devices.

## License

GPL-3.0; see `LICENSE`.
