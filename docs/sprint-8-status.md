# Sprint 8 Status

Date: 2026-06-27

## Goal

Sprint 8 turns the "too little practice content" problem into a content pipeline problem:
one material can now produce deterministic practice drills, AI-generated practice sets,
and reusable question-bank items with SRS scheduling.

It also finishes the engineering scaffolds for local speech models, native packaging,
and mobile interaction regression.

## Delivered

- Practice page now derives material drills from the selected learning material instead of only using one hard-coded scene.
- `/api/ai/generate-practice` generates leveled practice sets from material title, level, summary, key expressions, and sentence segments.
- The AI request queue supports `generate-practice`; failed generation requests can be retried and stored in the AI result inbox.
- The AI result inbox can load generated practice sets back into the practice page.
- Generated practice drills can be saved into a local question bank.
- The question bank has due/review scheduling using the existing SRS rating model.
- Practice question and attempt storage are included in local sync snapshots.
- Roleplay goal tracking and long-term output weakness profiling are available on the practice/progress surfaces.
- Local speech readiness now covers STT, TTS, and pronunciation scoring.
- Local speech bootstrap and doctor scripts are available:
  - `npm run speech:bootstrap`
  - `npm run speech:doctor`
- Native shell scaffold templates are available for Capacitor, Tauri, and Electron:
  - `npm run package:scaffold`
  - `npm run package:check`
- Mobile interaction QA now has both static checks and a real browser screenshot script:
  - `npm run qa:mobile:check`
  - `npm run qa:mobile:screenshots`
- Core interaction QA protects study, practice, review, and settings contracts:
  - `npm run qa:interactions:check`
- Local speech setup can now dry-run model downloads and generate startup scripts:
  - `npm run speech:download -- --dry-run --include-optional`
  - `npm run speech:start -- --write`
- Real mobile screenshots were captured with the system Chrome fallback and passed with no horizontal overflow:
  - `docs/qa/mobile-screenshot-regression-2026-06-27.md`
  - `docs/qa/screenshots/2026-06-27-mobile-auto`

## Scope Notes

The repository does not commit multi-GB offline speech model binaries. Instead, it now
defines stable local endpoint contracts, model manifests, bootstrap output, and readiness
checks. This is the correct delivery boundary for a Web/PWA repository.

Native mobile/desktop delivery is also scaffolded, not forked. The app continues to use
the same Next.js/PWA codebase, with native shells generated outside source control.

## Verification

Current Sprint 8 targeted verification:

```bash
npm run typecheck
npx vitest run tests/ai/fallback-explanation.test.ts tests/ai/openai-compatible.test.ts tests/ai/generate-practice-route.test.ts tests/ai/request-queue.test.ts tests/ai/result-inbox.test.ts tests/practice/question-bank.test.ts tests/sync/sync-snapshot.test.ts
```

Full gate should be run before merge:

```bash
npm run lint
npm run typecheck
npm run test
npm run package:check
npm run qa:interactions:check
npm run qa:mobile:check
npm run speech:doctor
npm run speech:download -- --dry-run --include-optional --json
npm run speech:start -- --write --json
npm run build
```

## Remaining External Work

- Choose concrete local STT/TTS/pronunciation runtimes behind the endpoint contracts.
- If native packaging becomes a release target, initialize the selected shell from the generated scaffold and wire platform signing/build pipelines.
