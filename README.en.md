# Learn English

> An AI-powered English immersion training system for Chinese-native learners.  
> English is not only a skill. It is a bridge to work, life, identity, and a wider world.

[![CI](https://github.com/SQDzhuzhuxia/learn-english/actions/workflows/ci.yml/badge.svg)](https://github.com/SQDzhuzhuxia/learn-english/actions/workflows/ci.yml)

[中文 README](README.md) · [Project Progress](docs/project-progress.md) · [Technical Plan](docs/technical-plan-v0.1.md) · [Deployment Guide](docs/deployment-guide.md) · [Contributing](CONTRIBUTING.md)

## Why This Exists

Many adult learners do not learn English for exams. They learn it to live a fuller life: to talk to doctors, rent apartments, interview for jobs, join meetings, speak with neighbors, and handle immigration or naturalization processes with confidence.

Learn English is designed to turn scattered vocabulary memorization into a sustainable personal training system.

The learning philosophy is simple:

- Build a large base of comprehensible listening and reading input.
- Use AI to make real English understandable, Chinese-first at the beginning, then gradually more English.
- Practice speaking, shadowing, retelling, writing, and roleplay through real work and life scenarios.
- Turn every mistake, useful sentence, and better expression into reviewable learning assets.
- Keep the app local-first, while leaving room for cloud sync, multiple devices, and local models.

This is not another flashcard app.  
It aims to become a serious, long-term, community-maintained tool for English integration.

## Current Capabilities

### Input Learning

- Material library and daily study dashboard
- Text import, automatic sentence splitting, and local material storage
- Dynamic study pages with sentence-level progress
- AI explanation for the current sentence and whole-material batch explanation
- Local fallback explanation when no AI provider is configured
- Saving useful expressions into a personal notebook and review cards

### Output Training

- Shadowing recording, browser transcription, cloud/local STT
- Shadowing completeness, missing words, extra words, and focus-word feedback
- Retelling practice, recorded retelling, and key-point feedback
- AI retelling naturalness feedback
- Short writing correction with AI
- U.S. life roleplay scenarios
- AI roleplay answer feedback and AI follow-up turns
- Bulk saving of AI suggestions from writing, retelling, and roleplay into review

### Review System

- Notebook search, filtering, editing, archiving, restoring, and deletion
- Multiple review card types: recognition, production, spelling, speaking, listening
- Simplified spaced repetition scheduling
- Due, new, future, relearning, and suspended queues
- Review diagnostics, score trends, card details, and review history
- Single-card and batch suspend/restore/reset workflows

### Data, Sync, and PWA

- Local-first browser storage
- Local data export/import
- Supabase auth, manual upload, manual download, diff check
- Auto-upload toggle and sync confirmation UI
- PWA install prompt, offline indicator, and basic cache
- OpenAI-compatible AI provider layer
- OpenAI-compatible STT / TTS adapters
- Local Whisper / whisper.cpp endpoint adapter

## Tech Stack

- App: Next.js 16, React 19, TypeScript
- UI: shadcn/ui, Radix UI, Tailwind CSS 4, lucide-react
- Data: browser localStorage first, sync snapshots, Supabase Auth/Postgres
- AI: OpenAI-compatible provider layer
- Speech: browser recording, cloud STT, local Whisper/whisper.cpp, configurable TTS
- Quality: ESLint, TypeScript, Vitest, production build checks

## Quick Start

```bash
npm install
npm run dev
```

Local app:

```text
http://localhost:3000
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deployment

Vercel is the recommended first deployment target for this Next.js Web/PWA project. The public demo can start with fallback environment variables, so no AI, speech, or database secrets are required.

After deployment, add the live URL here and to the GitHub About section:

```text
Live Demo: TBD
```

See the full guide: [docs/deployment-guide.md](docs/deployment-guide.md)

## Environment Variables

Copy `.env.example` to `.env.local` and configure only what you need.

### AI

```env
AI_PROVIDER=fallback
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
```

Supported directions:

- `fallback`: local fallback explanations and feedback
- `openai`
- `openai-compatible`
- `local`

### Speech-to-Text

```env
SPEECH_PROVIDER=fallback
SPEECH_BASE_URL=
SPEECH_MODEL=
SPEECH_API_KEY=
```

Supported directions:

- Browser transcription fallback
- OpenAI-compatible `/audio/transcriptions`
- Local Whisper / whisper.cpp multipart endpoint

### Text-to-Speech

```env
TTS_PROVIDER=fallback
TTS_BASE_URL=
TTS_MODEL=
TTS_API_KEY=
TTS_VOICE=alloy
```

If TTS is not configured or fails, the app automatically falls back to browser speech.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Schema draft: [docs/supabase-sync-schema-v0.1.sql](docs/supabase-sync-schema-v0.1.sql)

## Documentation

- [Requirements](docs/requirements-v0.1.md)
- [Technical Plan](docs/technical-plan-v0.1.md)
- [Page Prototype](docs/page-prototype-v0.1.md)
- [Development Plan](docs/development-plan-v0.1.md)
- [UI Technical Plan](docs/ui-technical-plan-v0.1.md)
- [Public Release and Deployment Guide](docs/deployment-guide.md)
- [Project Progress](docs/project-progress.md)
- [Sprint 4 Status](docs/sprint-4-status.md)

## Roadmap

- More complete open-ended AI roleplay memory and goal tracking
- Output error taxonomy and long-term weakness profile
- Fine-grained cloud sync conflict merging
- Offline audio cache and AI request queue
- Research for bundled offline Whisper / TTS models
- Pronunciation, stress, linking, and phoneme-level feedback
- Mobile and desktop packaging

## Contributing

Contributions are welcome from people who care about English learning, adult learning, AI education, immigration life, and open-source tools.

You can help with:

- Learning materials and real-life scenarios
- Common mistakes from Chinese-native learners
- UI/UX improvements
- AI prompts and feedback quality
- Review algorithms, speech, sync, and offline capability
- Tests, documentation, and internationalization

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## Security and Privacy

- Do not commit `.env`, API keys, recordings, personal learning data, or local databases.
- By default, learning data is stored mainly in the browser.
- Cloud sync requires your own Supabase configuration.
- AI, STT, and TTS requests are sent to the provider or local endpoint you configure.

See [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE).

May this project help more people turn English into a real ability to live, work, and express themselves.
