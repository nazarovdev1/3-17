# DECISIONS

Every ambiguity resolved per spec section 0 ("prefer what keeps the game stable on weak
Android phones"), recorded here.

1. **TypeScript 5.9.3 instead of 7.x.** typescript-eslint 8.72 declares peer support for
   `typescript <6.1.0`; TS 7 (the native compiler) is outside that range. Pinning 5.9.3 keeps
   lint + typecheck fully compatible.
2. **No tone.js.** Spec allows it, but the custom Web Audio engine is small, tone would add
   significant weight against the 250 KB gz mobile JS budget, and the sound design is entirely
   procedural. Decided: hand-written audio engine (Phase 5).
3. **Single tsconfig** covering src, tests, scripts and config files, with both DOM and node
   types. One `tsc --noEmit` typechecks everything; less config drift on Windows.
4. **`noUncheckedIndexedAccess` on, `exactOptionalPropertyTypes` off.** The former catches real
   story-data bugs; the latter conflicts with the optional-heavy `StoryNode` shape without
   adding proportional safety here.
5. **vitest environment jsdom for all unit tests.** Engine tests are pure TS and run fine under
   jsdom; component tests need the DOM. Storage adapters are injected, so no fake-localStorage
   hacks in engine tests.
6. **Bundle budget via Vite manifest.** `build.manifest: true`; `scripts/check-bundle.mjs`
   computes gzipped sizes of the desktop dynamic-import subtree (everything Rollup assigns to
   the `desktop-3d` manual chunk) and of the entry subtree minus the desktop part. CSS/fonts
   are reported but not gated (the spec budget is on JS).
7. **git repository initialized locally, branch `main`.** No remote configured (deploy target
   is Vercel; pushing is a user decision).
8. **`tsx` runs `scripts/validate-story.ts`** so validation is plain TypeScript sharing the
   same types as the engine, without a build step.
