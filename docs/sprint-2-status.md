# Sprint 2 状态

日期：2026-05-28

## 目标

Sprint 2 的目标是把静态原型推进为可保存数据的最小学习闭环。当前先使用浏览器本地存储，后续再替换或同步到云数据库。

## 本轮范围

- 文本材料导入
- 自动分句
- 材料保存到浏览器本地
- 材料库读取真实本地数据
- 动态学习页按材料展示逐句内容
- 学习页上一句/下一句更新本地进度

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

### 6. 学习页

- `/study` 打开当前材料
- `/study/[id]` 打开指定材料
- 根据真实材料展示逐句列表
- 支持点击句子
- 支持上一句/下一句
- 更新当前句和学习进度到本地存储

## 验证

已验证：

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- 本地 HTTP 页面返回：
  - `/library`
  - `/library/import`
  - `/study`
  - `/study/doctor-visit`
  - `/library` 返回“导入材料”
  - `/library/import` 返回“自动分句”
  - `/study` 返回“先听懂，再保存”
  - `/study/doctor-visit` 返回“先听懂，再保存”

## 说明

当前数据保存在浏览器 localStorage，适合 Sprint 2 验证学习闭环。云同步、账号、数据库迁移会放到后续 Sprint。

## 下一步

Sprint 2 后续可继续推进：

- 保存词句到个人词句本
- 从学习页生成复习卡
- 材料删除和编辑
- 学习进度更细粒度记录
- 接入 AI 解释真实导入材料
