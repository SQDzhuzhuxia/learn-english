# Sprint 2 状态

日期：2026-05-28

## 目标

Sprint 2 的目标是把静态原型推进为可保存数据的最小学习闭环。当前先使用浏览器本地存储，后续再替换或同步到云数据库。

## 本轮范围

- 文本材料导入
- 自动分句
- 材料保存到浏览器本地
- 材料库读取真实本地数据
- 用户导入材料编辑和删除
- 动态学习页按材料展示逐句内容
- 学习页上一句/下一句更新本地进度
- 学习页保存当前句到词句本
- 独立词句本页面
- 词句搜索和复习状态筛选
- 词句编辑、删除、归档和恢复
- 词句操作同步关联复习卡
- 学习页当前句 AI 解释入口
- 学习页整篇材料 AI 批量解释入口
- 练习页短写作 AI 批改入口
- 写作批改结果保存到词句本和复习卡
- OpenAI-compatible provider 适配和本地降级解释
- 自动生成本地复习卡
- 复习页读取真实本地复习卡
- 复习评分更新下一次到期时间
- 浏览器录音和跟读记录
- 云端 STT 转写接口
- 本地 Whisper/whisper.cpp 转写服务适配
- 跟读反馈增强
- PWA 基础离线缓存
- PWA 安装提示和离线状态提示
- 本地数据导出和导入
- 本地同步快照
- 云同步数据库表结构草案
- Supabase 登录入口
- 云同步手动上传
- 云同步手动拉取
- 云同步差异提示

## 已完成

### 1. 内容数据模型

- 新增 `StudyMaterialRecord`
- 新增 `MaterialSegment`
- 新增 `NewTextMaterialInput`
- 明确材料来源：内置材料和用户导入材料

### 2. 文本处理

- 新增 `splitTextIntoSegments`
- 新增 `estimateReadingMinutes`
- 增加分句单元测试

### 3. 本地材料仓库

- 新增 localStorage 材料仓库
- 首次打开自动初始化内置材料
- 支持保存用户导入材料
- 支持读取当前材料
- 支持更新学习进度

### 4. 材料导入页

- 新增 `/library/import`
- 支持填写标题、类型、难度
- 支持粘贴英文文本
- 实时预览句子数量和词数
- 展示前 5 个自动分句
- 保存后进入对应学习页

### 5. 材料库页

- 改为读取本地材料仓库
- 支持搜索
- 支持筛选
- 每个材料卡进入 `/study/[id]`
- 用户导入材料会出现在材料库
- 用户导入材料支持编辑标题、类型、难度和正文
- 编辑材料后自动重新分句、更新阅读时间和关键词
- 用户导入材料支持删除
- 删除材料后关联词句会自动归档，关联复习卡会暂停
- 内置材料保留为系统样例，不允许误删
- 移除远程 Google Font 构建依赖，生产构建不再因为字体网络请求失败而中断

### 6. 学习页

- `/study` 打开当前材料
- `/study/[id]` 打开指定材料
- 根据真实材料展示逐句列表
- 支持点击句子
- 支持上一句/下一句
- 更新当前句和学习进度到本地存储

### 7. 词句本和复习卡

- 新增本地词句本仓库
- 新增本地复习卡仓库
- 支持从学习页保存当前句
- 保存后生成 recognition 复习卡
- 防止重复保存同一材料同一句

### 8. 复习页

- 改为读取本地复习卡
- 显示今日到期卡、新卡、总卡片
- 支持切换复习队列中的卡片
- 支持四档评分：忘了、困难、一般、简单
- 评分后写入复习日志并更新下一次复习时间

### 9. 独立词句本页面

- 新增 `/notebook`
- 在主导航加入词句本入口
- 手机底部导航支持直接进入词句本
- 支持搜索词句、来源材料和上下文
- 支持按全部、到期、新卡、句子、短语、归档筛选
- 显示总词句、到期卡、新卡概览
- 展示词句类型、中文解释、英文解释、上下文、来源材料和复习状态

### 10. 词句管理

- 支持编辑词句类型、正文、中文解释、英文解释、上下文
- 编辑词句后同步更新关联复习卡的正面、答案和例句
- 支持归档词句
- 归档后关联复习卡状态改为 `suspended`，复习页不再展示
- 支持恢复归档词句
- 支持删除词句
- 删除后同步移除关联复习卡和复习日志
- 增加词句管理单元测试

### 11. AI 当前句解释

- 新增 `/api/ai/explain-segment`
- 新增 `/api/ai/explain-material`
- 新增统一 AI 解释数据结构
- 新增整篇材料 AI 解释数据结构
- 新增 OpenAI-compatible provider 调用层
- 支持 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`、`AI_TIMEOUT_MS`
- 支持 OpenAI 默认 base URL，但模型名必须由环境变量明确配置
- 未配置模型或 API Key 时自动返回本地降级解释
- 模型调用失败时自动返回本地降级解释，避免学习流程中断
- 用户导入材料学习页支持点击生成当前句解释
- 用户导入材料学习页支持批量解释整篇材料
- 当前句解释会缓存到浏览器 localStorage
- 整篇批量解释会逐句写入浏览器 localStorage 缓存
- 批量解释返回整篇中文总结、难度提示和跨句重点表达
- 可保存表达区域会优先展示 AI 生成的重点表达
- AI 解释中的重点表达可一键保存到词句本
- 整篇批量解释中的重点表达可一键批量保存到词句本
- 保存表达后自动生成多类型复习卡
- 重复保存同一材料同一句同一表达不会生成重复卡
- 增加 AI 配置、降级解释和 OpenAI-compatible 解析单元测试

### 11.1 AI 写作纠错

- 新增 `/api/ai/correct-writing`
- 新增写作纠错数据结构
- 复用统一 AI provider 适配层
- 支持未配置 AI 时返回本地降级写作反馈
- 练习页短写作任务支持选择题目、输入英文、请求 AI 批改
- 批改结果展示更自然写法、中文反馈、重点问题和可保存表达
- 写作练习会写入输出练习分钟
- 增加写作纠错解析和降级单元测试

### 11.2 写作内容沉淀

- 批改后的更自然写法可保存到词句本
- 写作推荐表达可保存到词句本
- 写作来源记录为 `短写作：题目名`
- 保存自然写法会生成识别、输出、口语和听力复习卡
- 保存写作表达会按单词/短语生成识别、输出、拼写、口语、听力复习卡
- 重复保存同一题目下的同一句或同一表达不会生成重复卡
- 保存写作内容会写入本地学习行为日志
- 增加写作内容保存和防重复单元测试

### 12. 多类型复习卡

- 保存句子时生成 recognition、production、speaking、listening 卡
- 保存单词和短语时生成 recognition、production、spelling 卡
- 保存短语时额外生成 speaking、listening 卡
- 重复保存同一词句时不会生成重复卡
- 复习页用中文展示卡片类型：识别、输出、拼写、口语、听力
- 复习页默认先隐藏答案，显示答案后才能评分
- 复习页支持浏览器本地英文朗读，为听力和跟读卡做基础准备
- 增加多类型复习卡单元测试

### 13. 学习进度真实记录

- 新增本地学习行为日志 `learn-english.activity-log.v1`
- 记录逐句学习输入分钟
- 记录保存句子和表达的资产沉淀事件
- 记录复习评分完成事件
- 记录 AI 当前句和整篇批量解释事件
- 进度页改为客户端读取真实本地日志
- 进度页统计本周输入分钟、保存词句、掌握词句、完成复习
- 每日分布图从真实日志汇总输入、输出、复习分钟
- 增加学习行为日志汇总单元测试

### 14. 跟读录音入口

- 练习页从静态页面改为客户端交互页面
- 支持浏览器播放今日跟读原句
- 支持浏览器麦克风录音
- 支持停止录音后本地回放
- 支持浏览器内置英文语音转写
- 支持录音完成后请求服务端云端语音转写
- 支持原句和转写文本的简单匹配评分
- 支持词级完整度、漏词、多词/误识别和重点慢读词反馈
- 新增本地练习记录 `learn-english.practice-attempts.v1`
- 跟读完成后保存练习尝试元数据
- 跟读完成后写入输出练习分钟
- 增加练习记录和跟读匹配反馈单元测试

### 14.1 云端 STT 适配

- 新增 `/api/speech/transcribe`
- 新增 `lib/speech/server/transcribe-audio.ts`
- 支持 `SPEECH_PROVIDER`、`SPEECH_BASE_URL`、`SPEECH_MODEL`、`SPEECH_API_KEY`、`SPEECH_TIMEOUT_MS`
- `SPEECH_PROVIDER=openai` 默认使用 OpenAI `/audio/transcriptions`
- 音频文件限制为 25MB
- 未配置云端 STT 时返回 fallback，不中断跟读流程
- 云端 STT 成功时优先使用云端 transcript
- 云端 STT 失败时保留浏览器 transcript 兜底
- 增加 STT 配置和调用单元测试

### 14.2 本地 Whisper 服务适配

- 新增 `SPEECH_PROVIDER=local-whisper`
- 新增 `SPEECH_PROVIDER=whisper-cpp`
- 支持配置 `SPEECH_ENDPOINT_PATH`
- 支持配置 `SPEECH_FILE_FIELD`
- 支持配置 `SPEECH_RESPONSE_TEXT_PATH`
- 本地 Whisper 类服务不要求 API Key
- 本地转写成功时返回 `source: local`
- 练习页会显示“本地转写”
- 练习记录支持保存 `transcriptSource: local`
- 增加本地 Whisper multipart endpoint 单元测试

### 14.3 跟读反馈增强

- 跟读反馈增加 `completeness`
- 跟读反馈增加 `extraWords`
- 跟读反馈增加 `focusWords`
- 跟读反馈增加 `suggestions`
- 匹配算法从简单顺序查找升级为词级 LCS 对齐
- 分数会根据完整度和多余/误识别词做轻量惩罚
- 练习页展示完整度、疑似多出、重点词和下一步建议
- 增加跟读额外词惩罚单元测试

### 15. PWA 基础离线能力

- 新增 `public/sw.js`
- 新增客户端 Service Worker 注册组件
- 缓存今日页、材料库、学习页、词句本、复习页、练习页、进度页、设置页
- 缓存 manifest 和 PWA 图标
- 页面导航采用 network-first，弱网时回退缓存
- 静态资源采用 cache-first
- `/api/*` 请求不缓存，避免 AI 响应和未来同步数据被错误缓存
- manifest 补充 scope、orientation 和 categories
- 顶部栏支持 PWA 安装入口
- 支持捕获 `beforeinstallprompt`
- 支持识别 `appinstalled`
- 支持识别 standalone display mode
- 支持在线/离线状态提示
- 增加 PWA 状态逻辑单元测试

### 16. 本地数据迁移

- 设置页从静态页面改为客户端交互页面
- 支持导出本地学习数据 JSON
- 导出范围为 `learn-english.` 前缀的 localStorage 数据
- 支持导入同格式 JSON 备份
- 导入时只恢复 `learn-english.` 前缀数据
- 支持生成本地同步快照 JSON
- 同步快照只包含明确列入同步白名单的数据 key
- 同步快照记录 value hash、sizeBytes、deviceId 和 schemaVersion
- 新增 `docs/supabase-sync-schema-v0.1.sql`
- 表结构草案包含 `learning_sync_records` 和 `learning_sync_snapshots`
- 表结构草案包含基于 Supabase Auth 的 RLS policy
- 增加本地备份导入导出单元测试
- 增加同步快照单元测试

### 17. Supabase 登录入口

- 安装 `@supabase/supabase-js`
- 新增 Supabase public config 读取模块
- 新增浏览器 Supabase client 工厂
- `.env.example` 增加 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 设置页新增云同步账号面板
- Supabase 配置缺失时显示未配置状态，不影响本地使用
- 支持 Supabase magic link 邮件登录入口
- 支持读取当前 session email
- 支持退出登录
- 增加 Supabase public config 单元测试

### 18. 云同步手动上传

- 新增 `lib/sync/cloud-sync.ts`
- 支持把本地同步快照 upsert 到 `learning_sync_records`
- 支持把完整同步快照 insert 到 `learning_sync_snapshots`
- 上传时使用 `user_id + storage_key` 冲突键
- 设置页登录后显示“上传快照”
- 上传成功后显示记录数量和总字节数
- 增加云同步上传单元测试

### 19. 云同步手动拉取

- 支持从 `learning_sync_records` 按当前 `user_id` 拉取云端记录
- 拉取时只恢复同步白名单内的数据 key
- 设置页登录后显示“拉取云端”
- 拉取成功后把云端记录写回本地 localStorage
- 当前策略为手动 remote-wins，后续再做冲突合并
- 增加云同步拉取和本地恢复单元测试

### 20. 云同步差异提示

- 拉取云端前会生成本地同步快照
- 支持比较本地 hash 和云端 hash
- 区分 same、localOnly、remoteOnly、changed
- 拉取完成后提示本次会更新本地的记录数量
- 增加同步 hash 对比单元测试

## 验证

已验证：

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit`
- `git diff --check`
- 生产构建验证不依赖远程字体下载
- 本地 HTTP 页面返回：
  - `/library`
  - `/library/import`
  - `/study`
  - `/study/doctor-visit`
  - `/review`
  - `/notebook`
  - `/progress`
  - `/practice`
  - `/settings`
  - `/sw.js`
  - `/library` 返回“导入材料”
  - `/library` 返回“用户导入材料现在可以编辑和删除”
  - `/library/import` 返回“自动分句”
  - `/study` 返回“先听懂，再保存”
  - `/study/doctor-visit` 返回“先听懂，再保存”
  - `/api/ai/explain-segment` 无 API Key 时返回本地降级解释
  - `/api/ai/explain-material` 无 API Key 时返回整篇本地降级解释
  - `/api/ai/correct-writing` 无 API Key 时返回本地降级写作反馈
  - `/practice` 返回“短写作教练”
  - `/api/speech/transcribe` 无 API Key 时返回 fallback 转写状态
  - `/review` 返回“今日到期词句”
  - `/review` 返回“显示答案”
  - `/notebook` 返回“个人英语资产库”
  - `/notebook` 返回“编辑词句”
- `/notebook` 返回“归档”
- 主导航和手机底部导航包含“词句”
- `/settings` 返回“同步快照”
- `/settings` 返回“云同步账号”

说明：本轮尝试使用浏览器插件做可视化检查，但当前会话没有可用浏览器实例；已使用生产构建和本地 HTTP 响应完成替代验证。

## 说明

当前数据保存在浏览器 localStorage，适合 Sprint 2 验证学习闭环。云同步、账号、数据库迁移会放到后续 Sprint。

## 下一步

Sprint 2 后续可继续推进：

- 内置离线 Whisper 模型打包
- 真正音素级/发音级跟读评分
- 离线音频缓存和 AI 请求队列
- 云端同步冲突合并和自动同步
