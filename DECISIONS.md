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
   counts the full static entry subtree for mobile and additional desktop-only downloads
   for the lazy renderer. CSS/fonts are informational. Phase 6 correction: the original
   subtraction reported mobile as 0 KB when the lazy module imported shared entry code;
   the manual chunk grouping also hoisted Three.js into the entry. Native dynamic-import
   splitting now preserves the mobile boundary, and the gate rejects a statically loaded
   desktop presenter. This replaces the broken accounting, not the size limits.
7. **git repository initialized locally, branch `main`.** No remote configured (deploy target
   is Vercel; pushing is a user decision).
8. **`tsx` runs `scripts/validate-story.ts`** so validation is plain TypeScript sharing the
   same types as the engine, without a build step.
9. **`never_answered_n3` is expressed as `{not:{flag:'answered_n3'}}`.** Effects cannot
   compute negations, so instead of a derived flag the Ending C gate condition reads
   `answered_n3` (set only by night-3 answer choices) and inverts it. Equivalent semantics,
   one less flag, no conditional effect machinery needed.
10. **Meta-horror flags `late_night` and `return_comment` are shell-injected.** They appear in
    story line conditions but are set by the platform shell at boot (local time 00:00–05:00)
    and on resume-after-abandon. The validator's "never set" warnings for them are expected
    and accepted.
11. **StaticNarrationProvider has a sync fast path (`resolveLineSync`).** The
    NarrationProvider interface stays async (the future AI provider needs it), but the static
    implementation is pure computation; the text presenter uses the sync method so rendering
    needs no waterfalls.
12. **Sanity economy tuned for the Ending C gate.** Night 4's forced drops were reduced after
    a full-path trace showed the C gate (sanity ≥ 40) unreachable; verified end-to-end that a
    careful run arrives at ~50.
13. **Separate test build for the debug API.** Spec 11 forbids `window.__game` in production,
    while e2e needs it. `VITE_GAME_API=1` (in `.env.e2e`) compiles it in; Playwright builds
    `dist-e2e/` and serves it on port 4174, never the production `dist/`. The `?debug=1`
    overlay itself stays available in production builds.
14. **Future-work extension points (spec 15).** An `AiNarrationProvider` can implement the
    existing async `NarrationProvider` interface (every presenter already resolves text
    through it) and fall back to `StaticNarrationProvider` per line. A bot backend for opt-in
    night messages cannot read the client save (localStorage/CloudStorage stay on the device),
    so it would need an opt-in setting that sends the Telegram user id and the saved
    `GameState.lastPlayedAt` to that backend; the save already records that timestamp.
