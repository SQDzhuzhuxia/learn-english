# Local Speech Setup

This folder contains lightweight helpers for preparing local speech services.

## Check Current Readiness

Run:

```bash
npm run speech:check
```

Useful options:

```bash
npm run speech:check -- --json
npm run speech:check -- --strict
```

- `--json` prints a machine-readable report.
- `--strict` exits with a non-zero code unless both STT and TTS are local-ready.

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

## Next Packaging Step

The next packaging step is to add model download and service startup scripts around these endpoint contracts. The app should keep talking to stable local endpoints, while the implementation behind those endpoints can be swapped between whisper.cpp, faster-whisper, or another local runtime.
