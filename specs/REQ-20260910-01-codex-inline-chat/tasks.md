# Tasks: Codex 风格内联聊天第二期

**Requirement**: `REQ-20260910-01`
**Input**: `specs/REQ-20260910-01-codex-inline-chat/` 的 `spec.md`、`plan.md`
**Prerequisites**: spec、plan、Constitution check、明确的看板就绪与权限

> 测试为强制。复选框只追踪 feature 包执行证据；`PROJECT_BOARD.md` 仍是任务状态与验收的唯一来源。

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile board item（`REQ-20260909-01` 第一阶段 + 本阶段）、active feature、working tree、依赖、权限与验证证据
- [x] T002 确认 plan 的精确写集、排除项、单写者所有权与验收证据（header 聊天切换按钮方案，而非 Composer 前导 slot）
- [x] T003 [P] 产品准入措辞：本阶段以 spec 的 `isolated experiment` 记录，未新增记录步骤，`product.md` 暂不改

## Phase 2: Failing Regression and Contract Coverage

- [x] T004 [P] 契约/鉴权/零写入回归 `tests/ai-general-chat.test.mjs`
- [x] T005 [P] header/dock 结构回归 `tests/home-floating-bars.test.mjs`
- [x] T006 记录预实现失败与共享脏树失败归因

## Phase 3: User Story 1 - 同一 Composer 切换模式 (Priority: P1)

- [x] T007 [US1] header 常驻 `ChatModeRailToggle` 于 `src/app/_components/home/home-header.js`
- [x] T008 [US1] `HomeActionDock` 单一 Composer 复用聊天态（`src/app/_components/home/home-action-dock.js`）
- [x] T009 [US1] `HomePage` 聊天会话状态与 `sendChatMessage` 接线（`src/app/_components/home/home-page.js`）

## Phase 4: User Story 2 - 透明可收起聊天窗 (Priority: P1)

- [x] T010 [US2] `HomeChatWorkspace` 收敛为 summary/panel 两态（`src/app/_components/home/home-chat-workspace.js`）
- [x] T011 [US2] 聊天窗样式/i18n 与贴底/不抢滚动（`home-timeline.css`、`src/lib/i18n.mjs`）

## Phase 5: User Story 3 - 小屏与无障碍 (Priority: P1)

- [ ] T012 [US3] 320/390/430/700/1280px 无溢出 + 44px 触控 + `aria-*`/reduced-motion 断言（移动 E2E）

## Final Phase: Integration, Evidence, and Return

- [ ] T013 [P] 运行 `npm run design:check` 与响应式移动视觉复核
- [ ] T014 运行完整 `npm run check` 与 `git diff --check`
- [ ] T015 复核最终 diff 对写集/spec/plan/Constitution/看板验收；保留无关脏改动
- [ ] T016 在 `PROJECT_BOARD.md` 记录 returned 证据与剩余真实环境/人工检查；未独立验收前不标 Accepted

## Dependencies and Execution Order

- 对账与写所有权阻塞一切编辑。
- 回归/契约任务先于对应实现。
- User stories 按优先级顺序执行。
- 文档只描述已验证契约。

## Implementation Strategy

1. 先交付最小 P1 竖切（header 切换 + Composer 复用 + 聊天窗）。
2. 独立验证，含安全失败与离线行为。
3. 后续 story 仅在独立有用且范围内时追加。

## Prohibited Without Explicit Authorization

- Commit、push、PR 创建、发布、部署、破坏性删除、reset、history 改写、OKR 修改或 worktree merge。
- 新增依赖、迁移、网络数据边界、首页控件、必填记录字段或 spec/plan 未准入的宽泛重构。
