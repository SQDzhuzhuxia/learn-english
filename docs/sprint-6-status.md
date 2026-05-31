# Sprint 6 状态

日期：2026-05-31

## Sprint 目标

Sprint 6 聚焦学习智能分析和离线模型预研。目标是在原有听说读写闭环之上，让系统更清楚地告诉学习者“问题在哪里、下一步练什么”，同时为后续本地离线语音能力打基础。

## 当前状态

```text
Sprint 6A 输出错误类型统计      已完成
Sprint 6B 离线语音可用性诊断    已完成
Sprint 6C 模型启动脚本和下载说明 未开始
Sprint 6D 跨场景角色长期记忆    未开始
```

## Sprint 6A：输出错误类型统计

已完成内容：

- 新增输出错误统计模块 `summarizeOutputErrors`。
- 从本地练习记录 `PracticeAttemptRecord` 中读取练习类型、分数、反馈文本和转写内容。
- 支持识别以下输出薄弱项：
  - 发音和听辨
  - 流利度
  - 关键信息
  - 完整句
  - 语法和自然度
  - 词汇和表达
  - 礼貌表达
- 进度页“输出薄弱项”模块会优先展示真实练习统计。
- 没有练习记录时，进度页保留初始学习建议作为兜底。
- 每个薄弱项展示出现次数、严重度、来源练习和下一步行动建议。

验收记录：

- 新增 `tests/analytics/output-error-stats.test.ts`。
- 测试覆盖：
  - 跟读漏词和误识别会归入发音和听辨问题
  - 角色扮演短回答会归入关键信息、完整句和词汇表达问题
  - 写作自然度问题会归入语法和自然度问题

## Sprint 6B：离线语音可用性诊断

已完成内容：

- 新增本地语音准备状态模块 `summarizeLocalSpeechReadiness`。
- 新增 `/api/speech/readiness`，服务端读取当前 STT/TTS 环境变量并返回脱敏诊断结果。
- 支持识别：
  - 本地 Whisper / whisper.cpp STT endpoint 是否配置
  - 云端 STT 是否配置
  - 本地 OpenAI-compatible TTS endpoint 是否配置
  - 云端 TTS 是否配置
  - 未配置时需要补齐哪些环境变量
- 设置页新增“离线语音准备”卡片，展示本地 STT/TTS 状态和下一步。
- 该功能不暴露 API Key，只返回 provider、mode、状态和需要配置的环境变量名称。

验收记录：

- 新增 `tests/speech/local-speech-readiness.test.ts`。
- 测试覆盖：
  - 未配置语音服务时返回 fallback
  - 同时配置本地 STT 和 TTS 时标记为 offline ready
  - 云端 STT/TTS 可用时不误判为离线可用

## 下一步

- Sprint 5K：补充移动端关键页面截图回归记录。
- Sprint 6C：补充本地 Whisper/TTS 模型启动脚本和模型文件下载说明。
- Sprint 6D：设计跨天/跨场景角色扮演长期记忆。
