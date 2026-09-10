# Implementation Plan: Codex 风格内联聊天第二期

## Canonical path

复用 `HomePage` 的聊天会话状态、`HomeActionDock` 的单一 Composer、`HomeChatWorkspace` 的消息渲染，以及现有 `/api/assistant/chat` 契约。只替换聊天展示层级与模式按钮语义，不新增状态所有者或写入路径。

## 设计步骤（待授权后执行）

1. 先补第一阶段 T007 的完整门禁与移动端证据，记录失败归因，不修改无关脏文件。
2. 将模式切换按钮放入 Composer 前导 slot；速记显示“+”，聊天显示对话/返回 glyph，保持同一输入框 DOM 语义。
3. 将 `HomeChatWorkspace` 收敛为 `summary` 与 `panel` 两态；默认收起策略由产品确认，建议有消息后保持上次状态、首次消息展开一次。
4. 增加“用户主动上滑不抢滚动”的 near-bottom 判定；仅在 near-bottom 时贴底。
5. 调整透明背景、层级、底部安全区和键盘视口 CSS；不改变页面正文轴与 Composer 外缘轴。
6. 增加聚焦浏览器回归与设计断言，再运行完整门禁。

## 写集（未来实现）

`src/app/_components/home/home-action-dock.js`、`home-chat-workspace.js`、`home-page.js`、`home-timeline.css`、对应 i18n 与聚焦 E2E/Node 测试；不改 API、数据模型、`commitData` 或持久化。

## 验证

`node --test tests/ai-general-chat.test.mjs`；聊天首页聚焦移动 E2E；`npm run design:check`；`npm run typecheck`；`npm run build`；`npm test`；`git diff --check`。
