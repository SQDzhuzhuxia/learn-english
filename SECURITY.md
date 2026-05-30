# Security Policy

[中文](#中文) · [English](#english)

## 中文

## 支持范围

当前项目仍处于早期迭代阶段。安全问题会优先处理，尤其是：

- API key 泄露风险
- 云同步数据覆盖或错误恢复
- 个人学习数据、录音、转写文本暴露
- 服务端 AI / STT / TTS 代理接口滥用
- PWA 缓存导致旧代码或敏感响应被错误缓存

## 报告安全问题

请不要在公开 issue 中贴出密钥、录音、个人数据或可复现的攻击细节。

推荐方式：

1. 在 GitHub 上创建一个简短 issue，说明你有安全问题需要私下沟通。
2. 或者通过仓库维护者在 GitHub 公开资料中提供的联系方式联系。

报告时请尽量包含：

- 影响范围
- 复现步骤
- 你认为可能的修复方向

## 使用者注意事项

- 不要提交 `.env`、`.env.local` 或任何 API key。
- 不要上传自己的真实录音、转写、学习数据到公开仓库。
- 使用云 AI、STT、TTS 时，请确认服务商的数据政策。
- 使用 Supabase 同步前，请确认 RLS、表权限和 service role key 的保存方式。

## English

## Supported Scope

This project is still in early development. Security issues are prioritized, especially:

- API key exposure
- Cloud sync overwrite or unsafe restore behavior
- Exposure of personal learning data, recordings, or transcripts
- Abuse of server-side AI / STT / TTS proxy endpoints
- PWA cache serving stale code or sensitive responses

## Reporting a Vulnerability

Please do not post secrets, recordings, personal data, or exploit details in a public issue.

Recommended flow:

1. Create a short GitHub issue saying you need to privately report a security issue.
2. Or contact a maintainer through the public contact information on GitHub.

Please include:

- Impact
- Reproduction steps
- Suggested mitigation, if you have one

## User Notes

- Do not commit `.env`, `.env.local`, or any API key.
- Do not upload your real recordings, transcripts, or learning data to a public repository.
- Check provider data policies before using cloud AI, STT, or TTS.
- Before using Supabase sync, verify RLS, table permissions, and service role key handling.
