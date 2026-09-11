# Implementation Plan: Codex 风格内联聊天第二期

**Requirement**: `REQ-20260910-01` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

> 本计划描述如何满足 feature spec。`AGENTS.md`、Constitution、`product.md` 与 `PROJECT_BOARD.md` 仍是治理、产品真源与任务状态的权威。

## Summary

把首页聊天收敛为 Codex 风格内联工作面：速记与聊天共用 `HomeActionDock` 的单一 Composer，仅切换 header 常驻 `ChatModeRailToggle`、placeholder 与发送语义；聊天消息以 `HomeChatWorkspace` 的透明可收起小窗悬浮在 Composer 上方。范围保持可回滚，不新增页面、状态所有者或写入路径。

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: 复用既有 React 状态、`postRemoteAiJson`、`/api/assistant/chat` 与 Mastra/DeepSeek 边界；无新依赖
**Storage and Ownership**: 聊天为页面会话 React 状态，N/A（不写 `commitData`、localStorage、Supabase）
**Testing**: Node test runner, Playwright 移动 E2E, PWA production checks, design validation
**Target Platforms**: authenticated mobile-first browsers 与桌面响应式布局
**Performance Goals**: 聊天请求复用既有 20s 超时/Abort 与限流，不新增网络或渲染预算
**Constraints**: local-first, account isolated, revision safe, offline capable, backup compatible
**Scale/Scope**: 首页 header、`HomeActionDock`、`HomeChatWorkspace`、`HomePage`、i18n 与聚焦测试

## Source-of-Truth and Readiness Check

- [x] 看板项 `REQ-20260909-01`（第一阶段）与 `REQ-20260910-01`（本阶段）的目标、依赖与验证方式明确。
- [ ] `product.md` 尚未写入本阶段的 durable admission 决策（暂以 spec 的 `isolated experiment` 记录；本项交互未新增记录步骤，暂不改产品真源）。
- [x] 已读 `DESIGN.md` 与 `docs/设计规范/AGENTS.md` 的轴/44px/reduced-motion 约束。
- [x] 已检查当前 dirty working tree，写集避开无关用户改动。
- [x] 主工作区单写者，无第二个写者占用重叠文件。

## Constitution Check

*GATE: 必须通过。*

- [x] 核心记录步骤与首页首要任务（快速记录）保留；默认仍为速记。
- [x] 已认证离线使用、账号隔离与 stale-revision 安全保留；聊天零写入。
- [x] raw notes 不被静默改写；聊天只是页面会话展示。
- [x] 隐私、网络 payload、凭据、备份、恢复与移除边界已在 spec 说明。
- [x] 测试为强制，覆盖验收场景与失败路径。
- [x] 变更为最小可独立测试竖切，无投机广度。
- [x] 实现不要求未授权的 commit/push/deploy/删除/reset/history 改写。

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/_components/home/home-header.js`：`ChatModeRailToggle`（header 常驻聊天切换）。
- `src/app/_components/home/home-action-dock.js`：单一 `record-composer-bar`，`data-composer-leading` / `data-composer-trailing`，聊天态复用输入框与发送按钮。
- `src/app/_components/home/home-page.js`：聊天会话状态（`chatActive/chatMessages/chatInput/chatBusy/chatError/chatExpanded`）与 `sendChatMessage`。
- `src/app/_components/home/home-chat-workspace.js`：透明可收起聊天窗（summary/panel 两态、`aria-live`、`aria-expanded`）。
- `src/app/_components/home/home-header.css`：header 工具区与移动端固定定位的按钮轴。
- `src/app/_components/home/home-timeline.css`：底部 action-dock 与 Composer 样式（已删除 `bottom-mode-controls`）。
- `src/modules/assistant/chat/model.mjs` / `server.mjs` 与 `/api/assistant/chat`：契约、鉴权、限流、零写入。
- `tests/ai-general-chat.test.mjs`：契约/鉴权/零写入回归。
- `tests/home-floating-bars.test.mjs`：header/dock 结构断言。

### Reuse and Compatibility Decisions

复用既有 chat model/server、通用 Agent 与 `HomeChatWorkspace`，仅替换聊天展示层级与模式按钮语义；不改 API、数据模型、`commitData`、持久化、备份或旧数据行为。

## Proposed Design

### Data and Control Flow

1. `chatActive=false` 时，Composer 前导 slot 显示「完整记录 / 新增计划」，输入框绑定本地速记内容，Enter 保存速记。
2. 点击 header `ChatModeRailToggle` 设置 `chatActive=true`（同时关闭 plan），Composer 复用同一输入框，placeholder 切换为聊天，Enter 触发 `sendChatMessage`。
3. 发送经 `postRemoteAiJson → /api/assistant/chat`，返回经 `validateGeneralChatResponse` 校验后追加到 `chatMessages`；失败仅设置 `chatError`，零记录写入。
4. `HomeChatWorkspace` 摘要条展开/收起，`expanded` 态下新消息在 near-bottom 时自动贴底。

### Trust and Privacy Boundaries

请求仅含有界消息与当前账号鉴权 token；不发送账号身份之外的记录/计划/标签/附件/图片。响应经严格 schema 校验，`private/no-store`，聊天状态不持久化。

### UI and Interaction Contract

header 常驻聊天按钮与既有 `home-mode-toggle` 同轴同尺寸（移动端 54px，桌面 44px）；聊天窗悬浮于 Composer 上方，透明底、不遮挡记录正文轴与 Composer 外缘轴；`aria-pressed`/`aria-expanded`/`aria-live` 与 reduced-motion 状态可读；320/390/430/700/1280px 无横向溢出。

## Project Structure and Write Set

```text
可读：
  src/app/_components/home/home-page.js
  src/app/_components/home/home-chat-workspace.js
  src/modules/assistant/chat/{model,server}.mjs
  src/app/api/assistant/chat/route.js
  src/mastra/agents/general/index.mjs

允许改动：
  src/app/_components/home/home-header.js / home-header.css
  src/app/_components/home/home-action-dock.js
  src/app/_components/home/home-chat-workspace.js
  src/app/_components/home/home-page.js
  src/app/_components/home/home-timeline.css
  src/app/_components/ui.js（chat icon）
  src/lib/i18n.mjs
  tests/ai-general-chat.test.mjs
  tests/home-floating-bars.test.mjs

排除：
  API 路由、chat model/server、数据模型、commitData、Supabase、迁移、Service Worker、backup
```

### Branch split addendum

`feature/req-20260910-01-codex-inline-chat` 从 `origin/master` 的共同基线派生，并依赖 `REQ-20260909-01` 已存在的聊天 API 和通用 Agent。`home-page.js`、`home-header.js`、`home-header.css`、`i18n.mjs`、`tests/home-floating-bars.test.mjs` 与 Goals 共享时只接收聊天代码块；Goals 代码块归 `REQ-20260906-03`。origin 已撤回旧 Inline Chat 包，恢复工作按本 Spec 重新验证，不重放旧提交。

**Integration Order**: 单写者顺序——header 按钮 → dock Composer 语义 → chat workspace 收敛 → CSS/i18n → 测试。

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract: `node --test tests/ai-general-chat.test.mjs tests/home-floating-bars.test.mjs`
- Browser/mobile: header 聊天切换、Composer 复用、聊天窗展开/收起、贴底/不抢滚动、各宽度无溢出
- PWA/offline/account: 离线聊天稳定错误 + 速记仍可用
- Design validation: `npm run design:check`
- Full gate: `npm run check`

### Real-Environment or Manual Evidence

真实账号下 DeepSeek 中文回复质量、延迟与是否遮挡记录的 390px 视觉确认；14 天使用观察。

### Acceptance Evidence Handoff

`tests/ai-general-chat.test.mjs` 4/4、`tests/home-floating-bars.test.mjs` 通过、移动 E2E 截图，及完整门禁结果记入 `PROJECT_BOARD.md`。

## Rollback, Removal, and Migration

移除 header `ChatModeRailToggle`、`HomeChatWorkspace` 挂载、聊天态 Composer 分支、`chat` icon、i18n 条目与相关测试断言即可；无 schema、迁移、持久化提案、备份转换或数据清理。

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| header 常驻聊天切换按钮 | 常驻按钮需处于不受底部动作影响的稳定位置 | 放 Composer 前导 slot 会被「完整记录/新增计划」动作挤占，产品负责人已否定 |
| `HomeChatWorkspace` 两态（summary/panel） | 内联聊天需可收起以不遮挡记录 | 全屏聊天/新页面会破坏快速记录主链路 |
