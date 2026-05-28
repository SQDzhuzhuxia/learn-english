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
- [项目总进度](docs/project-progress.md)
- [Supabase 同步表结构草案](docs/supabase-sync-schema-v0.1.sql)

## Current Direction

Start with a Next.js Web/PWA app, use cloud sync for cross-device study, and keep the architecture ready for future mobile, desktop, local speech recognition, and local model support.

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
