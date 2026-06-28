# Local Speech Setup

This folder contains lightweight helpers for preparing local speech services.

## Check Current Readiness

Run:

```bash
npm run speech:check
npm run speech:doctor
npm run speech:download -- --dry-run --include-optional
npm run speech:dev-runtime -- --self-test --json
npm run speech:windows-runtime -- --self-test --json
npm run speech:start -- --write
```

Useful options:

```bash
npm run speech:check -- --json
npm run speech:check -- --strict
npm run speech:check -- --strict-practice
```

- `--json` prints a machine-readable report.
- `--strict` exits with a non-zero code unless both STT and TTS are local-ready.
- `--strict-practice` exits with a non-zero code unless STT, TTS, and pronunciation scoring are all local-ready.
- `speech:doctor` validates the local model manifest, bootstrap script, and readiness JSON shape.
- `speech:download` downloads model files declared in `models-manifest.json`; use `--dry-run` first and `--include-optional` for optional models.
- `speech:dev-runtime` starts a lightweight local contract server for development. It returns deterministic STT text, a short WAV TTS response, and pronunciation-score JSON so the app can test endpoint wiring without a production model.
- `speech:windows-runtime` starts the Windows local runtime used on this machine: whisper.cpp for STT, Windows SAPI for TTS, and whisper-backed word alignment for pronunciation scoring.
- `speech:start -- --write` generates `.local-speech/start-local-speech.ps1` with service environment variables and startup commands.

## Development Runtime

Run the contract self-test:

```bash
npm run speech:dev-runtime -- --self-test --json
```

Run the development endpoints until stopped:

```bash
npm run speech:dev-runtime
```

The command prints `.env.local` values for:

- `SPEECH_BASE_URL=http://127.0.0.1:8080`
- `TTS_BASE_URL=http://127.0.0.1:8880/v1`
- `PRONUNCIATION_BASE_URL=http://127.0.0.1:8090`

This runtime is for development and CI contract checks only. Production should replace it
with real STT, TTS, and forced-alignment or pronunciation-scoring services.

## Windows Local Runtime

On Windows, after downloading the whisper.cpp binary package and the Whisper
model into the ignored local workspace, run:

```bash
npm run speech:windows-runtime -- --self-test --json
npm run speech:windows-runtime
```

Default endpoints:

- STT: `http://127.0.0.1:8080/inference`
- TTS: `http://127.0.0.1:8880/v1/audio/speech`
- pronunciation scoring: `http://127.0.0.1:8090/score-pronunciation`

The current machine has been configured with:

- `.local-speech/bin/whisper.cpp/Release/whisper-cli.exe`
- `local-models/whisper/ggml-base.en.bin`
- `.env.local` pointing the app at the three local endpoints

This runtime uses real local speech components. STT is backed by whisper.cpp and
TTS is backed by Windows SAPI. Pronunciation scoring is a whisper-backed
word-level alignment scorer, not a dedicated phoneme-level MFA/WhisperX stack.

## Bootstrap Local Model Workspace

Run:

```bash
npm run speech:bootstrap
npm run speech:bootstrap -- --json
```

This creates ignored local workspace files:

- `.local-speech/env.local.speech.example`
- `.local-speech/START_LOCAL_SPEECH.md`
- `local-models/`

The repository intentionally does not commit offline model binaries. `scripts/local-speech/models-manifest.json`
documents the expected local STT, TTS, and pronunciation services and the environment variables
used by the app.

For exact endpoint request and response contracts, see:

- `docs/local-speech-runtime-contract.md`

## Download And Start Flow

Recommended local flow:

```bash
npm run speech:bootstrap
npm run speech:download -- --dry-run --include-optional
npm run speech:download -- --include-optional
npm run speech:windows-runtime -- --self-test --json
npm run speech:start -- --write
powershell -ExecutionPolicy Bypass -File .local-speech/start-local-speech.ps1
npm run speech:check -- --strict-practice
```

The generated startup script is intentionally outside source control. Review it before running
because concrete runtimes differ by machine. For example, the STT command assumes a `whisper-server`
binary from whisper.cpp is available on `PATH`; TTS and pronunciation services may come from any
local runtime that exposes the documented endpoints.

## Local STT Target

The app already supports local multipart STT endpoints.

Recommended `.env.local` shape:

```env
SPEECH_PROVIDER=local-whisper
SPEECH_BASE_URL=http://127.0.0.1:8080
SPEECH_ENDPOINT_PATH=/inference
SPEECH_FILE_FIELD=file
SPEECH_RESPONSE_TEXT_PATH=text
```

For a whisper.cpp-style service, `SPEECH_PROVIDER=whisper-cpp` is also supported.

## Local TTS Target

The app supports local OpenAI-compatible TTS endpoints.

Recommended `.env.local` shape:

```env
TTS_PROVIDER=local
TTS_BASE_URL=http://127.0.0.1:8880/v1
TTS_MODEL=local-tts
TTS_ENDPOINT_PATH=/audio/speech
TTS_VOICE=alloy
TTS_FORMAT=mp3
```

## Local Pronunciation Scoring Target

The app supports a local multipart pronunciation or forced-alignment endpoint.

Recommended `.env.local` shape:

```env
PRONUNCIATION_PROVIDER=local
PRONUNCIATION_BASE_URL=http://127.0.0.1:8090
PRONUNCIATION_ENDPOINT_PATH=/score-pronunciation
PRONUNCIATION_FILE_FIELD=file
PRONUNCIATION_REFERENCE_TEXT_FIELD=reference_text
PRONUNCIATION_TRANSCRIPT_FIELD=transcript
```

## Next Packaging Step

The next packaging step is to choose concrete runtimes behind these endpoint contracts. The app should keep talking to stable local endpoints, while the implementation behind those endpoints can be swapped between whisper.cpp, faster-whisper, a local TTS runtime, or a forced-alignment pronunciation service.
