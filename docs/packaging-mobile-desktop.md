# Mobile And Desktop Packaging

Date: 2026-06-27

## Current Decision

The main product remains a Next.js Web/PWA app. Mobile and desktop packages should wrap
the same app instead of creating separate business-code forks.

This keeps AI, STT, TTS, pronunciation scoring, sync, review scheduling, and practice
generation in one codebase.

## Readiness Checks

Run:

```bash
npm run package:check
npm run package:check -- --json
npm run package:native:check
npm run package:native:check -- --json
npm run package:native:dev-secrets -- --target windows
npm run package:native:materialize -- --dry-run --target capacitor --profile android
```

The check verifies:

- PWA manifest and standalone start URL.
- Service worker presence.
- PWA icon reference.
- production `build` and `start` scripts.
- server environment template coverage for AI/STT/TTS/pronunciation.
- Supabase sync environment template coverage.
- deployment guide presence.
- Capacitor, Tauri, and Electron starter templates.
- `package:scaffold` availability.
- native signing and release environment contract coverage.

`package:native:check` runs in non-strict contract mode by default. This is the
mode used by normal CI because signing secrets are not expected on every pull
request.

`package:native:materialize` is for release CI after strict checks pass. It
writes signing material from environment variables into ignored `.native-release/`
files that native build tools can consume. It prints only file paths and byte
counts, not secret values.

`package:native:dev-secrets` can generate local development signing material
where the current platform allows it. On this Windows machine it creates Android
PKCS12 keystore material when JDK `keytool` is available, plus a self-signed
Windows code-signing PFX. These are useful for local smoke tests only; they are
not valid for store releases.

## Scaffold Native Shells

Run:

```bash
npm run package:scaffold
```

This writes starter files to `.package-scaffold/`, which is intentionally ignored by Git.
The scaffold contains:

- `capacitor.config.example.json`
- `tauri.conf.example.json`
- `electron-main.example.cjs`
- `electron-preload.example.cjs`

## Signed Release Checks

When a real native release target is selected, run strict checks in that target's
release CI environment after adding the required secrets:

```bash
npm run package:native:check -- --strict --target capacitor --profile android
npm run package:native:check -- --strict --target capacitor --profile ios
npm run package:native:check -- --strict --target tauri --profile macos
npm run package:native:check -- --strict --target tauri --profile windows
npm run package:native:check -- --strict --target electron --profile macos
npm run package:native:check -- --strict --target electron --profile windows
```

The script checks the scaffold files, build plan, and required signing variables
for the selected target/profile. Missing secrets are listed explicitly. In
non-strict mode the command verifies the contract and reports whether the current
environment is ready for a signed release without failing normal development CI.

## Development Signing Material

For local Android and Windows packaging smoke tests:

```bash
npm run package:native:dev-secrets -- --target android
npm run package:native:dev-secrets -- --target windows
```

This writes:

- `.native-release/dev-secrets/android-dev-release.p12`
- `.native-release/dev-secrets/android-dev-signing.env`
- `.native-release/dev-secrets/windows-dev-code-signing.pfx`
- `.native-release/dev-secrets/windows-dev-signing.env`

The generated credentials are development-only. Do not use them for Google Play,
Microsoft Store, notarized desktop releases, or public distribution.

Android store release keystores should be created intentionally and protected as
long-lived release credentials. Apple certificates and App Store Connect keys
must come from an Apple Developer account.

## GitHub Native Release Workflow

`.github/workflows/native-release.yml` provides a manual `workflow_dispatch`
release contract for native targets. It accepts `target` and `profile`, injects
signing secrets from GitHub Actions Secrets, runs the matching strict
`package:native:check` profile, builds the Web/PWA bundle, generates the native
scaffold, and uploads it as an artifact.

The workflow intentionally fails before build artifacts are created when required
certificates or store keys are missing. Add only the secrets for the release
profile you are actually shipping.

After strict validation, the workflow runs `package:native:materialize` to create
temporary signing files such as:

- `.native-release/android/release.keystore`
- `.native-release/android/signing.properties`
- `.native-release/apple/signing-certificate.p12`
- `.native-release/apple/AuthKey_<key-id>.p8`
- `.native-release/windows/code-signing.pfx`
- `.native-release/electron/electron-builder.env`

The final cleanup step removes `.native-release/` even when a later build step
fails.

## Recommended Path

1. Keep Web/PWA as the primary release channel.
2. Use Capacitor if mobile app-store distribution becomes necessary.
3. Use Tauri first for desktop packaging unless Electron-specific APIs are required.
4. Keep local model binaries outside the repository and expose them through stable local endpoints.
5. Add signing, notarization, and store-specific pipelines only after a native release target is chosen, then enforce the matching `package:native:check -- --strict` profile in release CI.
