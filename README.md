# Learn English

Personal AI English immersion app for a Chinese-native adult learner preparing for U.S. work, life, and long-term immigration goals.

The first milestone is a Web/PWA product that turns daily English study into a guided loop:

- comprehensible listening and reading input
- AI explanation in Chinese-first, then gradually more English
- vocabulary and sentence collection from real materials
- spaced review
- guided speaking, shadowing, retelling, and writing
- U.S. life, work, and naturalization-oriented scenarios

## Docs

- [需求文档 v0.1](docs/requirements-v0.1.md)
- [技术方案 v0.1](docs/technical-plan-v0.1.md)
- [页面原型 v0.1](docs/page-prototype-v0.1.md)
- [开发方案与开发计划 v0.1](docs/development-plan-v0.1.md)
- [UI 技术方案补充 v0.1](docs/ui-technical-plan-v0.1.md)
- [项目总进度](docs/project-progress.md)
- [Supabase 同步表结构草案](docs/supabase-sync-schema-v0.1.sql)

## Current Direction

Start with a Next.js Web/PWA app, use cloud sync for cross-device study, and keep the architecture ready for future mobile, desktop, local speech recognition, and local model support.

## Tech Stack

- App: Next.js 16, React 19, TypeScript
- UI direction: shadcn/ui, Radix UI, Tailwind CSS 4, lucide-react
- Data sync: Supabase Auth, Supabase Postgres sync tables, local sync snapshots
- Local data: browser localStorage first, with a future path to IndexedDB/SQLite
- AI: OpenAI-compatible provider layer with room for Claude, Gemini, DeepSeek, Qwen, Doubao, and local models
- Speech: browser recording, cloud STT endpoint, local Whisper/whisper.cpp endpoint adapter
- Quality: ESLint, TypeScript, Vitest, production build checks

## Development

```bash
npm install
npm run dev
```

Local app: http://localhost:3000

Quality checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Local Speech

Server-side speech recognition is configured with `SPEECH_PROVIDER`.

- `fallback`: keep browser transcription only.
- `openai`: use OpenAI-compatible `/audio/transcriptions`.
- `local-whisper` or `whisper-cpp`: send multipart audio to a local endpoint such as `SPEECH_BASE_URL=http://127.0.0.1:8080` and `SPEECH_ENDPOINT_PATH=/inference`.

Server-side text-to-speech is configured with `TTS_PROVIDER`.

- `fallback`: use browser built-in English speech.
- `openai`: use `/audio/speech` with `TTS_MODEL`, `TTS_VOICE`, and `OPENAI_API_KEY`.
- `openai-compatible` or `local`: use a compatible local/cloud endpoint such as `TTS_BASE_URL=http://127.0.0.1:8880/v1`.
- If TTS is not configured or fails, the app automatically falls back to browser speech.
