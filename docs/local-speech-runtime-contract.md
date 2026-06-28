# Local Speech Runtime Contract

Date: 2026-06-28

This document defines the runtime boundary between the Learn English Web/PWA
application and local speech services. The app owns the client adapters,
readiness checks, settings visibility, download/start helpers, and fallback
behavior. The target machine owns concrete model binaries and runtime processes.

## Commands

```bash
npm run speech:bootstrap
npm run speech:download -- --dry-run --include-optional
npm run speech:download -- --include-optional
npm run speech:dev-runtime -- --self-test --json
npm run speech:dev-runtime
npm run speech:windows-runtime -- --self-test --json
npm run speech:windows-runtime
npm run speech:start -- --write
powershell -ExecutionPolicy Bypass -File .local-speech/start-local-speech.ps1
npm run speech:check -- --strict-practice
npm run speech:doctor
```

## Development Runtime

`npm run speech:dev-runtime` starts a lightweight local server that implements all
three contracts:

- STT on `http://127.0.0.1:8080/inference`
- TTS on `http://127.0.0.1:8880/v1/audio/speech`
- pronunciation scoring on `http://127.0.0.1:8090/score-pronunciation`

It is useful for local UI wiring, CI contract checks, and endpoint smoke tests.
It returns deterministic demo data and a generated WAV tone. It is not a
production speech model and should be replaced by real runtime services before
serious pronunciation or transcription evaluation.

## Windows Runtime

`npm run speech:windows-runtime` starts real local speech endpoints on Windows:

- STT uses whisper.cpp `whisper-cli.exe` and `local-models/whisper/ggml-base.en.bin`.
- TTS uses Windows SAPI and returns WAV audio through the OpenAI-compatible TTS path.
- pronunciation scoring uses whisper.cpp transcription plus word-level alignment
  against the reference sentence.

Run the self-test before keeping it open:

```bash
npm run speech:windows-runtime -- --self-test --json
```

The current target machine has been configured with the whisper.cpp Windows x64
binary package under `.local-speech/bin/whisper.cpp/` and the Whisper base
English model under `local-models/whisper/`. These paths are intentionally
ignored by Git.

This runtime is a real local speech runtime for daily practice and local smoke
tests. It is not a dedicated phoneme-level forced aligner; for production-grade
phoneme timing, replace the pronunciation endpoint with MFA, WhisperX, wav2vec2
alignment, or another specialist service while preserving the contract below.

## STT Endpoint

Use a local multipart STT server such as whisper.cpp, faster-whisper, or another
compatible service.

Environment:

```env
SPEECH_PROVIDER=local-whisper
SPEECH_BASE_URL=http://127.0.0.1:8080
SPEECH_ENDPOINT_PATH=/inference
SPEECH_FILE_FIELD=file
SPEECH_RESPONSE_TEXT_PATH=text
SPEECH_TIMEOUT_MS=30000
```

Request:

```http
POST /inference
Content-Type: multipart/form-data
```

Form fields:

```text
file=<audio file>
response_format=json
language=en
prompt=<optional prompt>
model=<optional model name>
```

Accepted response shapes:

```json
{ "text": "I need to reschedule my appointment." }
```

```json
{ "result": { "text": "I need to reschedule my appointment." } }
```

## TTS Endpoint

Use a local OpenAI-compatible TTS server.

Environment:

```env
TTS_PROVIDER=local
TTS_BASE_URL=http://127.0.0.1:8880/v1
TTS_MODEL=local-tts
TTS_ENDPOINT_PATH=/audio/speech
TTS_VOICE=alloy
TTS_FORMAT=mp3
TTS_TIMEOUT_MS=30000
```

Request:

```http
POST /v1/audio/speech
Content-Type: application/json
```

Body:

```json
{
  "model": "local-tts",
  "input": "Could you please speak more slowly?",
  "voice": "alloy",
  "response_format": "mp3",
  "instructions": "Clear American English at a slow pace."
}
```

Response:

```text
Binary audio payload with a Content-Type such as audio/mpeg or audio/wav.
```

## Pronunciation / Forced Alignment Endpoint

Use a local pronunciation scorer or forced-alignment service. The app accepts
word-level scores and phoneme focus hints; a runtime can derive these with MFA,
WhisperX, wav2vec2 alignment, or another local model stack.

Environment:

```env
PRONUNCIATION_PROVIDER=local
PRONUNCIATION_BASE_URL=http://127.0.0.1:8090
PRONUNCIATION_ENDPOINT_PATH=/score-pronunciation
PRONUNCIATION_FILE_FIELD=file
PRONUNCIATION_REFERENCE_TEXT_FIELD=reference_text
PRONUNCIATION_TRANSCRIPT_FIELD=transcript
PRONUNCIATION_TIMEOUT_MS=30000
```

Request:

```http
POST /score-pronunciation
Content-Type: multipart/form-data
```

Form fields:

```text
file=<audio file>
reference_text=Could you please speak more slowly?
transcript=<optional STT transcript>
model=<optional model name>
```

Preferred response:

```json
{
  "score": 82,
  "pronunciationScore": 78,
  "fluencyScore": 84,
  "alignmentScore": 86,
  "feedbackZh": "整体清楚，注意 please 的 /z/ 结尾和 slowly 的重音。",
  "words": [
    { "word": "please", "score": 72, "issue": "final consonant" },
    { "word": "slowly", "score": 76, "issue": "word stress" }
  ],
  "phonemeFocus": [
    {
      "label": "Final consonants",
      "detail": "Keep the last sound audible.",
      "words": ["please"]
    }
  ]
}
```

Snake_case aliases are also accepted for score fields:

```json
{
  "pronunciation_score": 78,
  "fluency_score": 84,
  "alignment_score": 86,
  "feedback_zh": "..."
}
```

## Repository Boundary

Do commit:

- Endpoint adapters under `lib/speech/server/`.
- Readiness and doctor checks.
- Model manifests and bootstrap/download/start scripts.
- Documentation and ignored local workspace scaffolds.

Do not commit:

- Multi-GB model binaries.
- Machine-specific generated startup scripts under `.local-speech/`.
- Downloaded files under `local-models/`.
- Platform signing keys or native store credentials.
