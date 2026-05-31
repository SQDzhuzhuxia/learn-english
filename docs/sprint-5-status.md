# Sprint 5 状态

日期：2026-05-31

## Sprint 目标

Sprint 5 聚焦跨端同步、离线韧性和长期使用体验打磨。目标是让 Learn English 更适合真实多端使用：办公室、家里、手机浏览器都可以继续学习，并尽量避免同步、离线、网络波动造成学习数据丢失。

## 当前状态

```text
Sprint 5A 云同步细粒度合并    已完成
Sprint 5B 离线音频缓存        已完成
Sprint 5C AI 请求队列         未开始
Sprint 5D 跨端体验打磨        未开始
```

## Sprint 5A：云同步细粒度合并

已完成内容：

- 新增细粒度云同步恢复计划。
- 拉取云端数据时不再只按整组 localStorage 直接覆盖。
- 对以下 JSON 数组数据按记录 `id` 合并：
  - 材料库
  - 词句本
  - 复习卡
  - 复习日志
  - 学习活动日志
  - 练习记录
- 对 AI 解释缓存按缓存 key 合并。
- 本地新增记录会保留。
- 云端新增记录会补入本地。
- 同一条记录双方都有变化时，按 `updatedAt`、`createdAt`、`reviewedAt` 等时间字段选择更新版本。
- 设置页拉取确认区展示：
  - 整组恢复数量
  - 细粒度合并数量
  - 保留本地冲突数量
  - 合并新增条数
  - 合并更新条数
  - 前 6 个需要处理的同步 key 摘要

## 验收记录

- 同步模块单元测试已补充细粒度合并覆盖。
- `tests/sync/cloud-sync.test.ts` 覆盖：
  - 本地较新记录保留
  - 云端新增记录补入
  - 云端较新记录更新本地
  - AI 解释缓存对象合并
- 已通过：
  - `npm run typecheck`
  - `npx vitest run tests/sync/cloud-sync.test.ts tests/sync/local-backup.test.ts`

## Sprint 5B：离线朗读音频缓存

已完成内容：

- 新增浏览器端 TTS 音频缓存层。
- 服务端高质量 TTS 成功返回音频后，会写入浏览器 Cache API。
- 同一短句再次朗读时，会优先读取本机缓存，减少重复 TTS 请求。
- 缓存 key 会区分文本、voice、format 和朗读 instructions。
- 只缓存非空且长度不超过 1200 字符的学习音频，避免缓存超大整篇音频。
- 本机最多保留 80 条 TTS 音频缓存记录。
- 设置页新增“清理音频”操作，可以清理本机离线朗读音频缓存。

验收记录：

- 已新增 `tests/speech/tts-audio-cache.test.ts`。
- 语音相关测试覆盖：
  - 等价空格文本生成同一缓存 id
  - 不同 voice 生成不同缓存 id
  - 只缓存非空短文本
- 已通过：
  - `npm run typecheck`
  - `npx vitest run tests/speech/speech-synthesis.test.ts tests/speech/tts-audio-cache.test.ts tests/speech/synthesize-speech.test.ts`

## 下一步

- Sprint 5C：AI 请求队列，让网络失败或离线时的解释、写作批改、复述反馈可以稍后重试。
