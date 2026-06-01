# Learn English

> 面向中文母语学习者的 AI 英语沉浸训练系统。
> English is not only a skill. It is a bridge to work, life, identity, and a wider world.

[![CI](https://github.com/SQDzhuzhuxia/learn-english/actions/workflows/ci.yml/badge.svg)](https://github.com/SQDzhuzhuxia/learn-english/actions/workflows/ci.yml)

[English README](README.en.md) · [项目进度](docs/project-progress.md) · [技术方案](docs/technical-plan-v0.1.md) · [部署指南](docs/deployment-guide.md) · [贡献指南](CONTRIBUTING.md)

## 为什么做

很多成人学习英语，不是为了刷题，而是为了真实地生活：听懂医生、租房、面试、会议、邻里交流、移民和入籍流程。
这个项目的目标，是把英语学习从零散的背单词和短期打卡，变成一个长期可持续的个人训练系统。

Learn English 采用“输入驱动 + 输出反馈 + 复习沉淀”的方法：

- 大量可理解听读输入，让英语先变得熟悉。
- 用 AI 降低理解门槛，用中文解释关键难点，再逐步提高英文比例。
- 跟读、复述、写作、角色扮演都围绕真实生活和工作场景。
- 每次输出后的错误、好句、表达都会进入词句本和复习系统。
- 数据优先本地可用，同时为云同步、多端使用和本地模型预留架构。

这不是“又一个背单词软件”。
它想做的是一个认真、长期、可共同维护的英语融入训练工具。

## 当前能力

### 输入学习

- 材料库和今日学习驾驶舱
- 今日页按课程路径推荐下一篇材料，并串联输入、复习和输出
- 18 篇内置 A1-A2 起步材料，覆盖美国生活、租房、银行交通、职场自动化和入籍
- 四条课程路径：生活生存、租房社区、自动化职场、移民入籍
- 文本材料导入、自动分句、本地保存
- 动态学习页和逐句学习进度
- 当前句 AI 解释、整篇批量解释和本地降级解释
- 重点表达保存到词句本和复习卡

### 输出训练

- 跟读录音、浏览器转写、云端/本地 STT 转写
- 跟读完整度、漏词、多词和重点词反馈
- 音频级发音评分接口，可接入本地强制对齐或发音评分服务
- 复述训练、复述录音、关键点反馈
- AI 复述自然度反馈
- 短写作 AI 批改
- 美国生活场景角色扮演
- AI 角色回答反馈和 AI 继续追问
- 写作、复述、角色回答的 AI 建议一键沉淀到复习

### 复习系统

- 词句本、搜索、筛选、编辑、归档、恢复、删除
- 多类型复习卡：识别、输出、拼写、口语、听力
- 简化间隔复习调度
- 到期队列、新卡、未来卡、回炉卡、暂停卡筛选
- 复习诊断、评分趋势、卡片详情、历史记录
- 单卡暂停/恢复/重置，批量暂停/恢复

### 数据、同步和 PWA

- 浏览器本地数据优先
- 本地数据导出/导入
- Supabase 登录、手动上传、手动拉取、差异检查
- 自动上传开关和同步确认 UI
- PWA 安装提示、离线状态提示、基础缓存
- OpenAI-compatible AI Provider 适配层
- OpenAI-compatible STT / TTS 适配
- 本地 Whisper/whisper.cpp endpoint 适配

## 技术栈

- App：Next.js 16, React 19, TypeScript
- UI：shadcn/ui, Radix UI, Tailwind CSS 4, lucide-react
- 数据：browser localStorage first, sync snapshot, Supabase Auth/Postgres
- AI：OpenAI-compatible provider layer
- Speech：browser recording, cloud STT, local Whisper/whisper.cpp, configurable TTS
- Quality：ESLint, TypeScript, Vitest, production build checks

## 快速开始

```bash
npm install
npm run dev
```

本地地址：

```text
http://localhost:3000
```

质量检查：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 在线部署

推荐使用 Vercel 部署当前 Next.js Web/PWA 项目。首次公开演示可以使用 fallback 环境变量，不需要暴露任何 AI、语音或数据库密钥。

部署完成后，把线上地址补到这里和 GitHub About：

```text
Live Demo: https://learn-english-mauve-nine.vercel.app
```

完整步骤见：[docs/deployment-guide.md](docs/deployment-guide.md)

## 环境变量

复制 `.env.example` 为 `.env.local`，按需配置。

### AI

```env
AI_PROVIDER=fallback
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
```

支持方向：

- `fallback`：不调用模型，使用本地降级反馈
- `openai`
- `openai-compatible`
- `local`

### 语音转文字

```env
SPEECH_PROVIDER=fallback
SPEECH_BASE_URL=
SPEECH_MODEL=
SPEECH_API_KEY=
```

支持方向：

- 浏览器转写兜底
- OpenAI-compatible `/audio/transcriptions`
- 本地 Whisper / whisper.cpp multipart endpoint

### 文字转语音

```env
TTS_PROVIDER=fallback
TTS_BASE_URL=
TTS_MODEL=
TTS_API_KEY=
TTS_VOICE=alloy
```

未配置 TTS 时，应用会自动回退到浏览器内置英文朗读。

### 本地语音检查

如果你要走本地 Whisper / whisper.cpp 和本地 TTS 路线，可以先运行：

```bash
npm run speech:check
```

这个命令会读取 `.env` 和 `.env.local`，检查 STT/TTS 当前是本地可用、云端可用还是未配置。设置页里的“离线语音准备”也会展示同样的诊断结果。

### 音频级发音评分

```env
PRONUNCIATION_PROVIDER=fallback
PRONUNCIATION_BASE_URL=
PRONUNCIATION_MODEL=
PRONUNCIATION_ENDPOINT_PATH=/score-pronunciation
```

未配置时，跟读仍会使用文本级完整度和发音重点诊断。配置本地 endpoint 后，跟读录音结束会请求 `/api/speech/pronunciation-score`，并展示发音、流利度、对齐和词级评分。

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

数据库草案见：[docs/supabase-sync-schema-v0.1.sql](docs/supabase-sync-schema-v0.1.sql)

## 文档

- [需求文档](docs/requirements-v0.1.md)
- [技术方案](docs/technical-plan-v0.1.md)
- [页面原型](docs/page-prototype-v0.1.md)
- [开发计划](docs/development-plan-v0.1.md)
- [UI 技术方案](docs/ui-technical-plan-v0.1.md)
- [公开发布和部署指南](docs/deployment-guide.md)
- [项目总进度](docs/project-progress.md)
- [Sprint 4 状态](docs/sprint-4-status.md)

## 路线图

- 更完整的开放式 AI 角色扮演会话记忆和目标跟踪
- 输出错误类型统计和长期弱项画像
- 云同步冲突细粒度合并
- 离线音频缓存和 AI 请求队列
- 内置离线 Whisper / TTS 模型打包预研
- 更细的发音、重音、连读和音素级反馈
- 移动端和桌面端封装

## 贡献

欢迎任何关心英语学习、成人学习、AI 教育、移民生活和开源工具的人参与。

你可以贡献：

- 学习材料和真实生活场景
- 中文母语学习者常见错误总结
- UI/UX 改进
- AI prompt 和反馈质量优化
- 复习算法、语音、同步、离线能力
- 测试、文档和国际化

开始前请阅读：[CONTRIBUTING.md](CONTRIBUTING.md)

## 安全和隐私

- 不要提交 `.env`、API key、录音、个人学习数据或数据库文件。
- 当前默认数据主要存储在浏览器本地。
- 云同步需要自行配置 Supabase。
- AI、STT、TTS 请求会发送到你配置的服务商或本地 endpoint。

安全说明见：[SECURITY.md](SECURITY.md)

## 许可证

本项目使用 [MIT License](LICENSE)。

愿这个项目帮助更多人把英语学成真正能生活、能工作、能表达自己的能力。
