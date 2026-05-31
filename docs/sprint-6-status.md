# Sprint 6 状态

日期：2026-05-31

## Sprint 目标

Sprint 6 聚焦学习智能分析和离线模型预研。目标是在原有听说读写闭环之上，让系统更清楚地告诉学习者“问题在哪里、下一步练什么”，同时为后续本地离线语音能力打基础。

## 当前状态

```text
Sprint 6A 输出错误类型统计      已完成
Sprint 6B 离线语音可用性诊断    已完成
Sprint 6C 本地语音检查脚本      已完成
Sprint 6D 角色扮演长期记忆      已完成
Sprint 6E 音素级发音评分        未开始
Sprint 6F 跨场景角色任务迁移    未开始
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

## Sprint 6C：本地语音检查脚本

已完成内容：

- 新增 `scripts/local-speech/check-local-speech.mjs`。
- 新增 npm script：`npm run speech:check`。
- 脚本会读取 `.env` 和 `.env.local`，检查本地 STT/TTS 配置状态。
- 支持 `--json` 输出机器可读结果。
- 支持 `--strict` 在本地 STT/TTS 未同时就绪时返回非 0 exit code，方便后续接入 CI 或本机检查。
- 新增 `scripts/local-speech/README.md`，说明本地 Whisper/whisper.cpp 和本地 OpenAI-compatible TTS endpoint 约定。
- README 中文版和英文版已补充本地语音检查命令。

## Sprint 6D：角色扮演长期记忆

已完成内容：

- 新增角色扮演长期记忆模块 `summarizeRoleplayMemory`。
- 直接从已有练习记录中聚合，不新增复杂存储。
- 支持统计：
  - 历史练习次数
  - 历史均分
  - 最好成绩
  - 最近成绩
  - 上次练习时间
  - 趋势标签
  - 已沉淀能力信号
  - 继续补强点
  - 下一次练习目标
- 练习页场景口语模块新增“长期记忆”卡片。
- 角色扮演完成并保存练习记录后，长期记忆会随着本地记录更新。

验收记录：

- 新增 `tests/speech/roleplay-memory.test.ts`。
- 测试覆盖：
  - 没有历史记录时生成首次练习目标
  - 多次练习后识别进步趋势和礼貌表达沉淀
  - 短回答历史会提示扩展成完整句

## 下一步

- Sprint 5K：补充移动端关键页面截图回归记录。
- Sprint 6E：继续预研真正音素级/发音级跟读评分。
- Sprint 6F：补充跨场景 AI 角色扮演任务迁移。
