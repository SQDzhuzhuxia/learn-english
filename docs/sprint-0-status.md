# Sprint 0 状态

日期：2026-05-27

## 已完成

- Next.js + React + TypeScript 工程骨架
- Tailwind CSS 4 配置
- ESLint flat config
- Vitest 基础测试配置
- PWA manifest 雏形
- 桌面侧边导航和手机底部导航
- 今日页、材料页、学习页、复习页、练习页、进度页、设置页静态入口
- mock 学习数据
- 简化复习调度函数和单元测试
- ADR 0001：使用 Next.js 作为 Web/PWA 基础框架
- npm overrides 将 PostCSS 统一到安全版本

## 验证结果

- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run test` 通过
- `npm run build` 通过
- `npm audit` 通过，0 vulnerabilities
- 本地开发服务器 `http://localhost:3000` 返回 200
- `/library` 页面返回材料库内容

## 注意

本次尝试使用 Codex in-app browser 验证页面，但当前会话没有可用浏览器实例。已用 Next.js 构建检查和本地 HTTP 检查完成替代验证。后续浏览器插件可用后，需要补一次桌面和手机视口截图级 QA。

## 下一步

进入 Sprint 1：静态产品原型完善。

重点：

- 精细打磨今日页、材料库、学习页、复习页
- 补齐手机端布局 QA
- 增加可点击的 mock 流程
- 为 Sprint 2 的文本导入做页面和状态预留
