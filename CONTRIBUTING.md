# Contributing

[中文](#中文) · [English](#english)

## 中文

感谢你愿意参与 Learn English。

这个项目相信：英语学习是一件严肃、长期、值得被认真对待的事。我们希望用开源的方式，把真实生活、工作、移民场景里的英语学习工具做得更好。

### 可以贡献什么

- 真实英语学习材料和场景
- 中文母语学习者常见错误
- AI prompt、纠错逻辑和反馈质量
- UI/UX、可访问性和移动端体验
- 复习算法、语音识别、TTS、离线能力
- Supabase 同步、多端数据一致性
- 测试、文档、国际化

### 本地开发

```bash
npm install
npm run dev
```

提交前建议运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### 代码原则

- 优先保证学习闭环真实可用。
- 不提交 API key、`.env`、录音、个人学习数据、数据库文件。
- 重要逻辑需要测试覆盖。
- UI 需要兼顾桌面和手机浏览器。
- AI 输出进入核心数据前，应尽量结构化、可解释、可回退。
- 新功能要更新相关文档或进度记录。

### 提交建议

推荐使用简洁的提交信息：

```text
feat: add roleplay follow up
fix: improve speech fallback
docs: update bilingual readme
test: cover review scheduler
```

### Pull Request 建议

请在 PR 中说明：

- 这次解决什么问题
- 主要改了哪些模块
- 如何验证
- 是否影响本地数据、同步、AI、语音或复习逻辑

## English

Thank you for contributing to Learn English.

This project treats English learning as a serious, long-term practice. We want to build an open-source tool that helps learners work through real life, work, immigration, and integration scenarios.

### What You Can Contribute

- Real learning materials and scenarios
- Common mistakes from Chinese-native learners
- AI prompts, correction logic, and feedback quality
- UI/UX, accessibility, and mobile browser experience
- Review algorithms, STT, TTS, and offline capability
- Supabase sync and multi-device consistency
- Tests, documentation, and internationalization

### Local Development

```bash
npm install
npm run dev
```

Recommended checks before submitting:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Principles

- Keep the learning loop genuinely usable.
- Do not commit API keys, `.env`, recordings, personal learning data, or database files.
- Cover important logic with tests.
- Support both desktop and mobile browsers.
- AI output should be structured, explainable, and safe to fall back from before entering core data.
- Update documentation or progress notes when adding meaningful features.

### Commit Style

Use concise commit messages:

```text
feat: add roleplay follow up
fix: improve speech fallback
docs: update bilingual readme
test: cover review scheduler
```

### Pull Requests

Please describe:

- What problem the PR solves
- Which modules changed
- How you verified it
- Whether it affects local data, sync, AI, speech, or review logic
