# 技术方案 v0.1

日期：2026-05-27

## 1. 技术目标

第一阶段先做 Web/PWA，保证电脑浏览器和手机浏览器都能使用。代码结构按未来可能开源和多端扩展来组织，后续可以继续扩展为移动端 App、桌面端 App、本地离线模型和本地语音识别。

核心要求：

- 学习数据云同步
- 支持 30 到 60 分钟每日学习流程
- 支持大量输入材料管理
- 支持 AI 查词、解释、纠错、生成复习卡
- 支持后续接入多家 AI API
- 支持后续离线缓存和本地模型

## 2. 推荐技术栈

### 前端和应用层

- 框架：Next.js + React + TypeScript
- UI：Tailwind CSS + Radix UI/shadcn 风格组件 + lucide-react 图标
- PWA：后续接入 Serwist 或 next-pwa
- 状态管理：优先 React Server Components + URL state；复杂学习状态再引入 Zustand
- 表单：React Hook Form + Zod
- 本地缓存：IndexedDB，推荐 Dexie

选择 Next.js 的原因：

- 既能做 Web/PWA，也能承载 API routes
- 便于做登录、云同步、AI 代理接口
- 未来可部署到 Vercel、服务器或 Docker
- 适合按模块拆分，后续开源维护成本较低

### 数据和同步

- 云数据库：Postgres
- 推荐服务：Supabase
- ORM：Drizzle ORM
- 本地开发：Docker Postgres 或 SQLite 过渡
- 文件存储：Supabase Storage 或 S3 兼容对象存储
- 账号系统：Supabase Auth 或后续自建 Auth
- 同步策略：本地数据先形成同步快照，后续按 key + hash 增量 upsert 到云端
- 表结构草案：`docs/supabase-sync-schema-v0.1.sql`

### AI 接入

建立统一的 `ai` 模块，不在业务代码里直接调用某一家 API。

第一阶段支持：

- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- 通义千问
- 豆包/火山方舟
- 本地模型，后续通过 OpenAI-compatible endpoint 接入

AI 能力分层：

- `explainText`：解释单词、句子、段落
- `gradeMaterial`：判断材料难度
- `extractLearningItems`：提取重点词句
- `correctWriting`：写作纠错
- `evaluateRetelling`：复述反馈
- `roleplayScenario`：场景口语对话
- `generateReviewCards`：生成复习卡

### 语音能力

第一阶段：

- 浏览器录音
- 云端语音转文字
- 本地 Whisper/whisper.cpp 服务端 endpoint 适配
- 原句和转写文本对比
- 句子级跟读反馈

后续：

- 内置离线 Whisper 模型打包
- 本地音频切片
- 发音、重音、连读、漏读分析
- 口语实时对话

### 复习系统

第一阶段先实现简化版间隔复习：

- 忘了：当天或次日再次复习
- 困难：1 到 2 天后复习
- 一般：3 到 5 天后复习
- 简单：7 天后复习

后续接入 FSRS：

- 记录每次复习评分
- 计算记忆稳定度和难度
- 动态安排下一次复习

## 3. 推荐目录结构

```text
learn-english/
  app/
    dashboard/
    library/
    study/
    review/
    speaking/
    writing/
    scenarios/
    progress/
    settings/
  components/
    layout/
    study/
    review/
    ai/
    ui/
  lib/
    ai/
    content/
    db/
    review/
    speech/
    sync/
    analytics/
  docs/
  public/
  scripts/
  tests/
```

## 4. 数据模型草案

### `user_profiles`

- `id`
- `native_language`
- `target_variant`，默认 `en-US`
- `current_level`
- `daily_goal_minutes`
- `target_country`
- `target_domains`
- `interface_language_mode`
- `created_at`
- `updated_at`

### `study_materials`

- `id`
- `title`
- `type`：story/dialogue/subtitle/article/audio/transcript/work/immigration
- `source`
- `language_variant`
- `difficulty_level`
- `estimated_minutes`
- `content_text`
- `audio_url`
- `status`
- `created_at`
- `updated_at`

### `material_segments`

- `id`
- `material_id`
- `order_index`
- `text`
- `start_ms`
- `end_ms`
- `translation`
- `difficulty_note`

### `learning_items`

- `id`
- `type`：word/phrase/sentence/pattern/error
- `text`
- `meaning_zh`
- `meaning_en`
- `source_material_id`
- `source_segment_id`
- `context_text`
- `audio_url`
- `familiarity`
- `created_at`

### `review_cards`

- `id`
- `learning_item_id`
- `card_type`：recognition/listening/spelling/speaking/production
- `front`
- `back`
- `due_at`
- `interval_days`
- `ease`
- `status`

### `review_logs`

- `id`
- `card_id`
- `rating`：again/hard/good/easy
- `reviewed_at`
- `duration_ms`

### `study_sessions`

- `id`
- `started_at`
- `ended_at`
- `planned_minutes`
- `actual_minutes`
- `mode`：30min/60min/custom
- `input_minutes`
- `output_minutes`
- `review_minutes`
- `notes`

### `practice_attempts`

- `id`
- `type`：shadowing/retelling/writing/roleplay/dictation
- `material_id`
- `prompt`
- `user_text`
- `audio_url`
- `transcript`
- `ai_feedback`
- `score_json`
- `created_at`

## 5. AI 提示词设计原则

- 默认中文解释，关键英语表达保留英文原文
- 对初级学习者使用简单中文，不堆术语
- 所有纠错都给出“为什么错”和“更自然说法”
- 输出内容要能保存成复习卡
- 场景对话要控制难度，避免一开始压垮用户
- 长期逐步提高英文解释比例

## 6. 开发阶段

### 阶段 1：项目骨架

- 初始化 Next.js + TypeScript
- 配置 Tailwind、lint、format
- 建立页面路由
- 建立基础布局
- 建立 mock 数据

### 阶段 2：输入学习闭环

- 材料库
- 文本导入
- 阅读学习器
- 查词和 AI 解释
- 保存词句
- 学习记录

### 阶段 3：复习闭环

- 学习项模型
- 复习卡片
- 简化调度
- 每日复习入口

### 阶段 4：输出练习

- 跟读录音
- 语音转文字
- 复述反馈
- 写作教练

### 阶段 5：云同步和 PWA

- 登录
- 云数据库
- PWA 安装
- 手机浏览器适配
- 离线缓存雏形

## 7. 近期决策

当前推荐先从 Next.js Web/PWA 开始，不直接上 Flutter 或 React Native。原因是第一阶段最重要的是验证学习闭环，而不是原生能力。等 Web/PWA 每天能稳定使用后，再决定是否用 Capacitor 包装移动端，或单独开发 React Native/Flutter 客户端。
