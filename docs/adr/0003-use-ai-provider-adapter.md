# ADR 0003：使用统一 AI Provider 适配层

日期：2026-05-28
状态：Accepted

## 背景

项目未来需要支持 OpenAI、Claude、Gemini、DeepSeek、通义、豆包和本地模型。学习页、写作页、口语页都需要 AI 能力，如果业务代码直接调用某一家 API，后续会难以替换、测试和保护密钥。

## 决策

建立 `lib/ai` 模块作为统一适配层。

当前 Sprint 2F 先实现：

- 统一解释结果类型 `AiSegmentExplanation`
- `/api/ai/explain-segment` 服务端接口
- OpenAI-compatible `chat/completions` 适配器
- 本地降级解释，保证未配置 API Key 时学习流程不中断
- 环境变量配置 provider、base URL、模型名、API Key 和超时时间

前端页面只调用项目自己的 API route，不直接接触任何供应商密钥。

## 备选方案

1. 前端直接调用模型 API。
   - 放弃。会暴露 API Key，也会让页面逻辑和供应商强绑定。

2. 先只接 OpenAI SDK。
   - 暂不采用。项目目标是多 provider 和本地模型，先用 HTTP adapter 更容易兼容 OpenAI-compatible 服务。

3. 所有 provider 一次性接完。
   - 暂不采用。当前更需要先跑通学习闭环，Claude、Gemini 等非 OpenAI-compatible provider 后续按同一接口补适配器。

## 影响

- AI 能力有稳定边界，便于测试和后续替换供应商。
- 当前无 API Key 也能使用本地降级解释，适合开发和离线演示。
- 真正的云模型解释需要配置环境变量。
- 不同 provider 的 JSON 输出质量可能不同，所以服务层必须做结构化解析和降级兜底。

## 后续动作

- 把 AI 解释里的重点表达保存为独立词句卡。
- 增加 Claude、Gemini 等非 OpenAI-compatible provider 适配器。
- 增加 AI 输出 schema 校验。
- 增加 per-user API 设置或服务端密钥管理。
