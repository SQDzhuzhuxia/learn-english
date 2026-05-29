# UI 技术方案补充 v0.1

日期：2026-05-29

## 1. 决策

项目 UI 体系确定采用：

- `shadcn/ui`
- `Radix UI`
- `Tailwind CSS`
- `lucide-react`

这套方案作为后续 UI Refresh 的主方案。HeroUI、MUI、Ant Design、Mantine 等组件库暂不作为主 UI 体系。

## 2. 当前状态

当前项目实际 UI 状态：

- 已使用 `Tailwind CSS 4`
- 已使用 `lucide-react` 图标
- 页面和组件大部分为手写 Tailwind class
- 尚未真正接入 `shadcn/ui`
- 尚未真正接入 Radix primitives
- 页面已经具备学习流程功能，但视觉仍偏功能原型

当前主要问题：

- 组件样式不够统一
- 页面卡片、按钮、表单、筛选器的视觉层级不够稳定
- 移动端和桌面端布局已经可用，但精致度不足
- 缺少统一的设计 token 和组件规范
- 部分页面信息密度高，但扫描效率还可以继续提升

## 3. 为什么选 shadcn/ui

shadcn/ui 适合本项目的原因：

- 它不是黑盒组件库，而是把组件源码放入项目，后续可完全自定义。
- 它基于 Tailwind CSS，和当前技术栈匹配。
- 它大量使用 Radix UI primitives，适合可访问性较好的 Dialog、Tabs、Select、Tooltip、Popover 等复杂交互。
- 它默认使用 lucide-react 图标，和项目当前图标体系一致。
- 它适合构建长期维护的个人学习系统，不会被某个组件库默认视觉完全绑定。

选择原则：

- 保留产品长期可控性。
- 避免组件库风格和学习产品气质冲突。
- 逐步迁移，不大面积一次性重写。
- 先统一基础组件，再逐页提升体验。

## 4. 视觉方向

这个 App 的定位不是营销网站，也不是游戏化背单词软件，而是：

> 面向中文母语成人的英语输入、输出、复习和迁移训练工作台。

第一版视觉方向：

- 安静、清爽、专业
- 更像每天可用的学习驾驶舱
- 避免花哨装饰和强烈游戏化
- 保持足够信息密度，适合长期扫描和反复操作
- 中文说明清楚，但关键学习内容逐步增加英文比例
- 移动端优先保证单手阅读、复习、录音、勾选操作

色彩方向：

- 保留当前青绿色作为主行动色，但减少整页单一色调感
- 以中性色背景、边框、文本层级为主
- 使用少量状态色区分成功、警告、错误、信息
- 避免大面积渐变、装饰光斑和过度卡片化

界面密度：

- 学习、复习、词句本、设置页可以偏工具型
- 今日页可以稍微更有引导感
- 卡片圆角保持克制，默认 8px 左右
- 不在页面大区块里继续堆嵌套卡片

## 5. 组件策略

后续新增 `components/ui/`，通过 shadcn/ui 管理基础组件。

第一批建议引入：

- `button`
- `card`
- `input`
- `textarea`
- `label`
- `select`
- `checkbox`
- `switch`
- `tabs`
- `dialog`
- `sheet`
- `dropdown-menu`
- `tooltip`
- `badge`
- `progress`
- `separator`
- `skeleton`
- `table`
- `toast` 或 `sonner`

本项目业务组件继续放在：

- `components/layout/`
- `components/library/`
- `components/study/`
- `components/notebook/`
- `components/review/`
- `components/practice/`
- `components/progress/`
- `components/settings/`
- `components/sync/`

原则：

- 业务组件只组合 `components/ui/` 基础组件，不直接重复实现 Button、Input、Card 等基础样式。
- 新页面优先使用 shadcn/ui 基础组件。
- 旧页面逐步迁移，不为了“好看”破坏已有学习流程。

## 6. 初始化方案

计划执行：

```bash
npx shadcn@latest init
```

推荐初始化选择：

- framework：Next.js
- style：new-york
- base color：neutral
- CSS variables：yes
- icon library：lucide
- components path：`components/ui`
- utils path：`lib/utils`

第一批组件按需添加：

```bash
npx shadcn@latest add button card input textarea label select checkbox switch tabs dialog sheet dropdown-menu tooltip badge progress separator skeleton table
```

后续如果需要 toast：

```bash
npx shadcn@latest add sonner
```

## 7. 迁移路线

### Phase 0：文档和设计方向

状态：本文件。

输出：

- README 明确技术栈
- 技术方案明确 shadcn/ui
- 项目进度明确 UI Refresh 计划
- 形成第一版视觉方向

### Phase 1：接入基础 UI 体系

目标：

- 初始化 shadcn/ui
- 建立 `components/ui/`
- 建立 `cn` 工具函数
- 调整全局 CSS 变量
- 保留现有功能不变

优先验收：

- 页面可正常启动
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

### Phase 2：应用框架 UI Refresh

目标：

- 重构 `AppShell`
- 重构导航、顶部栏、移动底部栏
- 统一 Button、Badge、Card、Tooltip
- 增加更明确的当前页面状态

优先页面：

- 全局布局
- 今日页
- 设置页

### Phase 3：核心学习页面 UI Refresh

目标：

- 学习页更适合长时间输入
- 复习页更像稳定的复习工作台
- 词句本更适合搜索、筛选、批量管理
- 练习页更适合录音、跟读、写作反馈

优先页面：

1. `/review`
2. `/study`
3. `/notebook`
4. `/practice`
5. `/library`
6. `/progress`
7. `/settings`

### Phase 4：细节打磨

目标：

- 统一空状态
- 统一加载状态
- 统一错误和成功提示
- 统一确认弹窗
- 统一移动端触控尺寸
- 统一数据表格和筛选器

## 8. 验收标准

每一轮 UI Refresh 必须满足：

- 不破坏已有学习数据
- 不破坏已有路由和核心流程
- 桌面和手机浏览器都可用
- 文本不溢出、不重叠
- 按钮、表单、筛选器有统一风格
- 页面信息层级更清楚
- 学习任务比原来更容易扫描和继续
- 通过 `typecheck`、`lint`、`test`、`build`
- 前端页面改动后进行浏览器或本地 HTTP 验证

## 9. 第一轮 UI Refresh 范围

第一轮不追求全站换皮，重点做基础设施和最明显的体验提升：

- 接入 shadcn/ui
- 新建基础 UI 组件
- 重构 AppShell 导航
- 重构设置页 Cloud Sync 区域
- 重构复习页顶部统计和队列筛选
- 统一按钮、卡片、输入框、标签、提示文案样式

暂不做：

- 大规模业务逻辑重写
- 暗色模式
- 动画系统
- 图表库引入
- 高级主题切换
