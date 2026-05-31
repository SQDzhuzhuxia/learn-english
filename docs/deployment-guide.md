# 公开发布和部署指南

> Public release and deployment guide for Learn English.

本文档用于把 Learn English 从个人仓库发布成一个可被社区看到、可运行、可贡献的公开项目。

## 推荐路线

```text
GitHub 仓库改为 Public
  -> GitHub Actions CI 自动检查
  -> Vercel 绑定 GitHub 仓库自动部署
  -> README 和 GitHub About 填入线上地址
  -> 创建第一个公开 Release
```

对当前项目来说，Vercel 是最省心的第一部署平台，因为项目是 Next.js Web/PWA，包含 API Route、服务端 AI/STT/TTS adapter 和前端页面。

## 1. 公开 GitHub 仓库

在 GitHub 页面执行：

1. 打开仓库首页：`SQDzhuzhuxia/learn-english`
2. 点击顶部 `Settings`
3. 进入 `General`
4. 拉到页面底部 `Danger Zone`
5. 找到 `Change repository visibility`
6. 选择 `Change to public`
7. 按 GitHub 提示输入仓库名并确认

注意事项：

- 公开后，任何人都能看到代码、Issue、Pull Request、Actions 记录和提交历史。
- 公开前确认没有提交 `.env`、API key、录音、个人学习数据、数据库文件。
- 当前项目已经有 MIT License、README、贡献指南、安全策略和 Issue/PR 模板，适合公开。

## 2. 首次部署到 Vercel

在 Vercel 控制台执行：

1. 使用 GitHub 登录 Vercel
2. 点击 `Add New...` -> `Project`
3. 选择并导入 `SQDzhuzhuxia/learn-english`
4. Framework Preset 选择或保持自动识别：`Next.js`
5. Install Command：`npm install`
6. Build Command：`npm run build`
7. Output Directory：保持默认
8. Environment Variables 初次可以只配置 fallback：

```env
AI_PROVIDER=fallback
SPEECH_PROVIDER=fallback
TTS_PROVIDER=fallback
```

这会让公开演示站点不依赖任何付费 API key，也不会把密钥暴露出去。AI、语音识别和高质量 TTS 会走本地降级能力或浏览器能力。

如果你想让部署站点接入真实模型，再在 Vercel 的项目设置里添加对应服务端环境变量：

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=

SPEECH_PROVIDER=openai-compatible
SPEECH_BASE_URL=
SPEECH_MODEL=
SPEECH_API_KEY=

TTS_PROVIDER=openai-compatible
TTS_BASE_URL=
TTS_MODEL=
TTS_API_KEY=
TTS_VOICE=alloy
```

Supabase 云同步可以后续再配置：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

安全原则：

- 不要把任何 API key 写进代码或 README。
- 只在 Vercel Environment Variables 里配置密钥。
- `NEXT_PUBLIC_*` 会进入浏览器端，只能放公开可用的 anon key，不能放 service role key。

## 3. 部署后更新项目主页

Vercel 部署成功后，你会得到类似这样的地址：

```text
https://learn-english-xxx.vercel.app
```

然后更新两个地方：

1. GitHub 仓库右侧 `About` -> `Website`
2. `README.md` 和 `README.en.md` 的在线演示地址

这样别人进入 GitHub 仓库时，可以立刻看到源码和在线产品。

## 4. 创建第一个公开 Release

推荐第一个版本名：

```text
v0.1.0-public-preview
```

本地创建并推送 tag：

```bash
git tag -a v0.1.0-public-preview -m "v0.1.0 public preview"
git push origin v0.1.0-public-preview
```

然后在 GitHub：

1. 打开仓库首页
2. 点击右侧 `Releases`
3. 点击 `Draft a new release`
4. 选择 `v0.1.0-public-preview`
5. 标题填写 `Learn English v0.1.0 Public Preview`
6. 描述里写清楚：这是面向中文母语学习者的 AI 英语沉浸训练系统公开预览版
7. 发布 Release

## 5. 公开发布检查清单

- [ ] GitHub 仓库可见性已改为 Public
- [ ] GitHub About 已填写项目简介、topics、license、website
- [ ] GitHub Actions CI 运行通过
- [ ] Vercel 生产部署成功
- [ ] README 已补充线上演示地址
- [ ] 未提交任何 API key、`.env`、录音或个人学习数据
- [ ] 已创建 `v0.1.0-public-preview` Release

## English Summary

Recommended public launch path:

1. Change the GitHub repository visibility from Private to Public.
2. Let GitHub Actions run lint, typecheck, tests, and production build.
3. Import the GitHub repository into Vercel as a Next.js project.
4. Start with fallback environment variables so the public demo does not require private API keys.
5. Add the Vercel URL to GitHub About and both README files.
6. Publish the first release: `v0.1.0-public-preview`.

Official references:

- GitHub Docs: [Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- Vercel Docs: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- Vercel Docs: [Deployments](https://vercel.com/docs/deployments)
