# 功能排查记录 v0.1

日期：2026-06-28

## 本轮结论

此前记录的“UI 已完成但部分按钮无响应”“真实材料没有音频播放器”
“TTS 没有配置界面”“学习/练习/复习缺少最小交互检查”等问题，已经在后续
Sprint 5 到 Sprint 9 中完成收口。

当前项目的主要风险不再是页面按钮不可用，而是发布环境选择：
本地 STT、TTS、发音评分/强制对齐模型需要在目标机器部署具体 runtime；
移动/桌面原生发布需要平台签名和构建流水线。

## 已修复

- 学习页播放、慢速、循环、跟读入口已有真实动作。
- 练习页模式入口、AI 结果载入、生成练习保存到题库、题库复习已有真实动作。
- 复习页评分、暂停、恢复、重置和朗读已有真实动作。
- 设置页数据导入/导出、清理缓存、AI 队列、AI 结果、云同步和 TTS 试听已有真实动作。
- 材料库和词句本中只用于展示状态的区域不再伪装成可点击按钮。
- 英文朗读统一优先走服务端高质量 TTS，失败时回退到浏览器朗读。
- 导入材料支持真实音频 URL 和句子时间轴。
- 学习页支持自带材料音频的当前句片段播放。
- 练习页已经绑定当前材料，并自动派生跟读、复述、填空、写作和角色准备练习。
- AI 可按材料生成分级练习集，失败可进入 AI 请求队列并在恢复后进入结果收件箱。
- 生成练习可沉淀到本地练习题库，并按 SRS 复习。
- 角色扮演已有目标跟踪、会话总结、长期记忆和跨场景迁移建议。
- 进度页已有长期输出弱项画像。
- 本地语音能力已具备 STT/TTS/发音评分三项 readiness、doctor、download dry-run 和 startup script。
- 本地语音能力已具备 `speech:dev-runtime`，可在没有生产模型时自测三项 endpoint 合同。
- 移动/桌面封装已具备 PWA 检查、Capacitor/Tauri/Electron 脚手架和原生发布环境检查。
- 移动交互回归已有静态检查和真实浏览器截图脚本。
- 全局 Toast 提示系统已接入，核心页面的局部消息会同步进入统一反馈层。
- 核心交互回归已有 `npm run qa:interactions:check`。
- 发布前总门禁已有 `npm run release:check`。
- 当前 Windows 目标机器已部署 `speech:windows-runtime`，Next API 已验证本地 TTS、STT 和发音评分链路。

## 当前外部发布边界

以下事项不是 Web/PWA 仓库内部应该直接提交的应用代码，但已经有合同、脚本和检查：

- 离线 Whisper/TTS/强制对齐模型二进制不提交到仓库；当前机器已把 Whisper base English 模型下载到被忽略的 `local-models/`。
- 当前机器已按 `docs/local-speech-runtime-contract.md` 启动 Windows runtime；如果需要生产级音素 timing，可把发音评分 endpoint 替换为 MFA/WhisperX/wav2vec2 等专门强制对齐服务。
- 运行 `npm run speech:download -- --include-optional` 会下载可选模型文件到被忽略的 `local-models/`。
- 运行 `npm run speech:start -- --write` 会生成被忽略的 `.local-speech/start-local-speech.ps1`。
- 原生移动/桌面发布需要在具体平台接入签名、安装包构建、商店或分发渠道；仓库已提供 `npm run package:native:check`、严格发布 profile 检查和手动 GitHub Native Release workflow。

## 当前验收命令

```bash
npm run release:check
npm run package:native:check
npm run qa:mobile:screenshots -- --base-url=http://127.0.0.1:3000
```

`release:check` 覆盖 lint、typecheck、test、package readiness、native release contract、核心交互、
移动交互、本地语音 doctor、语音下载 dry-run、启动脚本 dry-run、依赖审计和生产构建。

本地运行真实浏览器截图回归需要先启动服务；CI 已安装 Playwright Chromium 并上传截图报告。
