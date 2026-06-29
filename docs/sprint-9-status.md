# Sprint 9 Status

Date: 2026-06-28

## Goal

Sprint 9 closes the remaining product and engineering gaps after Sprint 8:
expand the built-in practice corpus, support real material audio playback, make
local speech model setup operable, expose TTS configuration with a preview path,
and add a stronger regression gate for core user interactions.

## Delivered

- Built-in seed content is expanded to 100+ practice-ready materials through
  `lib/content/seed-expansion.ts`.
- Existing course stages now include supplemental U.S. life, work, automation,
  immigration, civics, housing, service, safety, interview, and community
  scenarios.
- Imported materials can store an optional material audio URL and sentence cue
  timeline.
- The study page can play the current sentence from a material-owned audio file
  and still falls back to TTS when no material audio exists.
- Material import and edit forms expose audio URL and timeline fields.
- Local speech setup now has manifest-driven download and startup helpers:
  - `npm run speech:download`
  - `npm run speech:dev-runtime`
  - `npm run speech:start`
  - `npm run speech:doctor`
- `speech:dev-runtime` provides deterministic local STT, TTS, and pronunciation
  endpoint contracts for development and CI self-tests.
- `speech:windows-runtime` is available for the current Windows target machine:
  whisper.cpp backs STT, Windows SAPI backs TTS, and a whisper-backed word
  alignment scorer with token timestamps backs the pronunciation endpoint.
- The generated local speech startup script lives outside source control under
  `.local-speech/`.
- Settings now shows TTS configuration guidance and a server-side TTS preview
  action.
- Global toast feedback is implemented through `components/ui/toast.tsx` and
  mounted in the app shell; core page messages are mirrored into the global
  feedback layer.
- Core interaction regression is available as an npm script:
  - `npm run qa:interactions:check`
- The full release gate is available as one command:
  - `npm run release:check`
  - `npm run release:check -- --with-screenshots --base-url=http://127.0.0.1:3000`
- Machine-level external release evidence can be audited with:
  - `npm run release:external:audit -- --with-runtime`
  - `npm run release:external:audit -- --strict-store`
  - strict store mode requires real store credentials plus authenticated GitHub
    CLI access for CI secret syncing.
- Native mobile/desktop release readiness is executable:
  - `npm run package:native:check`
  - `npm run package:native:check -- --strict --target capacitor --profile android`
  - `npm run package:native:check -- --strict --target capacitor --profile android-store`
  - `npm run package:native:check -- --strict --target tauri --profile windows-store`
- A manual native release workflow is available at
  `.github/workflows/native-release.yml`; it injects signing secrets, enforces
  strict profile checks, materializes temporary signing files, builds the
  Web/PWA bundle, prepares deployed Web/PWA native wrapper inputs, and uploads
  the generated release-input artifacts.
- Native release checks now distinguish signing from store publishing:
  Google Play service-account credentials and Microsoft Store Partner Center
  credentials have their own strict profiles.
- GitHub Actions native release secrets can be synced from the release
  environment with:
  - `npm run release:secrets:sync -- --dry-run --profile android-store`
  - `npm run release:secrets:sync -- --profile windows-store`
- Native store release submission can be preflighted, and optionally executed
  in release CI, with:
  - `npm run release:native:store -- --dry-run --target capacitor --profile android-store`
- `package:native:prepare` generates Capacitor, Tauri, and Electron wrapper
  inputs under `.native-release/wrapper/` for a deployed Web/PWA URL. This keeps
  native shells compatible with the app's server-backed Next.js API routes.
- `package:native:dev-secrets -- --target windows` can generate a self-signed
  development-only Windows PFX for local packaging smoke tests.
- `package:native:dev-secrets -- --target android` can generate a
  development-only Android PKCS12 keystore when JDK `keytool` is available; the
  generated env passes the strict Android signing contract.
- `package:native:dev-secrets -- --target tauri-update` can generate a
  development-only Tauri updater keypair through the Tauri signer; the generated
  env passes the strict updater signing contract and can be materialized for
  native build tooling.
- Existing mobile QA still covers mobile anchors, destructive confirmations,
  import constraints, screenshot automation availability, and narrow viewport
  safety:
  - `npm run qa:mobile:check`
  - `npm run qa:mobile:screenshots`
- GitHub Actions CI now runs the expanded quality gate: package readiness,
  core interaction QA, mobile interaction QA, local speech doctor, local speech
  dry-runs, production build, Playwright Chromium install, and mobile screenshot
  regression artifact upload.

## Scope Notes

The repository intentionally does not commit multi-GB offline Whisper, TTS, or
forced-alignment model binaries. The product-side delivery is the stable endpoint
contract, manifest, model download helper, generated startup script, readiness
API, doctor command, and settings visibility.

The same boundary applies to mobile and desktop packaging. The repo now provides
PWA readiness checks, native shell scaffolds for Capacitor, Tauri, and Electron,
deployed Web/PWA wrapper generation, strict signing-environment checks, GitHub
Actions secret syncing, native store submission preflight, and the manual native
release workflow with an opt-in store submission stage. The final store
publishing run remains release-environment work because it requires platform
accounts, certificates, signed package artifacts, and distribution choices.

## Verification

Current Sprint 9 verification:

```bash
npm run release:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run package:check
npm run package:native:check -- --json
npm run package:native:prepare -- --clean --target all --profile android --web-url=http://127.0.0.1:3000 --json
npm run release:native:store -- --dry-run --target capacitor --profile android-store
npm run release:secrets:sync -- --dry-run --profile android-store
npm run release:external:audit -- --with-runtime
npm run qa:interactions:check
npm run qa:mobile:check
npm run qa:mobile:screenshots -- --base-url=http://127.0.0.1:3000
npm run speech:doctor
npm run speech:download -- --dry-run --include-optional --json
npm run speech:dev-runtime -- --self-test --json
npm run speech:start -- --write --json
```

Last local result on 2026-06-28:

```text
release:check: passed
release:check --with-screenshots: passed
lint: passed
typecheck: passed
test: 46 files / 191 tests passed
build: passed, 21 app routes generated
package:check: passed
package:native:check: passed in contract mode; signed release secrets not present
package:native:prepare: passed, generated Capacitor/Tauri/Electron wrapper inputs
release:native:store dry-run: passed as a store submission preflight runner; real store credentials and signed artifacts not present
release:secrets:sync dry-run: passed with fake local store secret values
release:external:audit --with-runtime: local evidence passed; store credentials not present
qa:interactions:check: passed
qa:mobile:check: passed
qa:mobile:screenshots: passed with system Chrome, 5 routes, no horizontal overflow
speech:doctor: passed
speech:download dry-run: passed
speech:dev-runtime self-test: passed
speech:windows-runtime self-test: passed, transcript "Hello World!", score 99, alignment source whisper.cpp-token-timestamps
speech:start --write: passed
```

## Remaining Release Work

- Replace the Windows pronunciation endpoint with a specialist phoneme-level
  forced aligner such as MFA, WhisperX, or wav2vec2 alignment if production
  phoneme timing is required.
- Add real Android/iOS/macOS/Windows certificates, store keys, and notarization
  credentials plus signed store artifacts to the target release environment,
  then enforce the matching strict native release profile, sync those values
  with `release:secrets:sync`, and run the workflow with `submit_to_store=true`.
