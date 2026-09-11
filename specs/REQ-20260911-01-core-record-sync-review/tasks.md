---
description: "Log Note 第一阶段步骤一：核心记录数据层整理与基础分层迁移任务"
---

# Tasks: 核心记录同步链路梳理与治理

**Requirement**: `REQ-20260911-01`
**Legacy Board Item**: `LN-013`
**Input**: `spec.md`, `plan.md`, `research/`, `contracts/local-data-contract.md`, `data-layer-optimization-report.md`
**Package Mode**: `staged`
**Business Phase**: `P01`
**Planning Stage**: `S3 / I1`

> 本任务文件只执行第一阶段步骤一：目录、职责和 TypeScript 契约的行为保持迁移。步骤二数据流图和步骤三本地封套、历史、恢复语义、多标签页及 Store 决策不在本任务文件中。
>
> 核心链路门禁：普通业务写入仍只能从 `src/app/_providers/log-note-data-provider.js` 的 `commitData` 进入；`replaceData` 本切片保留现有语义并只迁移依赖。任何改变写入语义的任务必须回到 `spec.md` 和 `plan.md` 重新讨论。
>
> 所有任务保持未勾选，直到执行者返回证据；`PROJECT_BOARD.md` 仍是状态和验收真源。禁止在本任务中提交、推送、部署、改 SQL、安装依赖或清理用户脏改动。

## Phase and Iteration Map

| Business phase | Planning stage | Iteration | Phase detail | Research / checklist links | Exit evidence |
| --- | --- | --- | --- | --- | --- |
| `P01` | `S3` | `I1` | 第一步：数据层目录与职责整理 | [research/README.md](./research/README.md)、[data-layer-optimization-report.md](./data-layer-optimization-report.md)、[requirements checklist](./checklists/requirements.md) | 结构回归、聚焦单测、TypeScript 检查、最终 `npm run check` |

## Phase 1: Reconcile and Guard the Work

- [ ] T001 对照 `PROJECT_BOARD.md` 的 `LN-013`、`product.md`、`ARCHITECTURE.md`、`.specify/memory/constitution.md`、`spec.md`、`plan.md` 和 `git status --short`，记录当前分支、脏改动、Node 版本、验证基线和本任务排除项；不得修改上述治理文件。
- [ ] T002 在 `git status --short` 和 `git diff --name-only` 基础上逐文件确认步骤一写集、用户改动归属和单一写入者；当前 checkout 若仍为 `master`，或目标文件存在未归属改动，先暂停源码编辑并返回总控处理，不得覆盖、重置、stash 或清理。
- [ ] T003 [P] 固化迁移前基线：运行 `tests/project-structure.test.mjs`、`tests/data.test.mjs`、`tests/account-sync.test.mjs`、`tests/cloud-document.test.mjs`、`tests/cloud-load-recovery.test.mjs`、`tests/incremental-sync.test.mjs` 对应聚焦命令，记录 Node 22 环境下结果和现有失败归属。

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: 先锁定目录依赖方向和旧行为，再移动实现；失败只能来自本任务预期的缺失目标路径或新边界断言。

- [ ] T004 [P] 在 `tests/project-structure.test.mjs` 增加 `shared/contracts → domain → application → infrastructure → app` 的单向依赖断言、`src/shared/contracts` 不依赖运行端断言、`src/infrastructure/cloud-sync` 不反向依赖 `src/app` 断言，以及核心旧入口不得出现新调用方的结构断言。
- [ ] T005 [P] 在 `tests/data.test.mjs`、`tests/account-sync.test.mjs`、`tests/cloud-document.test.mjs`、`tests/cloud-load-recovery.test.mjs`、`tests/incremental-sync.test.mjs` 固化迁移前后的版本迁移、账号 key、云 payload、恢复失败保护和增量纯函数结果；测试不得引入网络、Store 或新的持久化写入者。
- [ ] T006 运行 T004–T005 的聚焦测试并记录预期失败；失败输出只允许证明目标目录/入口尚未存在或断言尚未满足，若出现业务行为变化、账号串线或空状态覆盖，立即停止迁移并回到核心链路门禁。

## Phase 3: User Story 1 - 本地数据同步与恢复（Priority: P1）

**Goal**: 在不改变本地数据格式、`commitData`/`replaceData` 语义、账号隔离或云端运行语义的前提下，把当前数据结构、领域逻辑、本地适配和云端适配放入明确的 TypeScript 分层；后续步骤可以独立验证本地恢复。

**Independent Test**: 不连接云端，现有记录/编辑/删除、刷新和备份导入回归保持通过；结构检查能证明 UI/Provider 不再新增对已迁移旧入口的依赖，`npm run typecheck` 能验证共享契约和分层依赖。

- [ ] T007 [US1] 新增 `src/shared/contracts/account-data.ts` 和 `src/shared/contracts/index.ts`，定义当前 `AccountDataPayload`、实体字段、数据版本和结构版本类型；只放纯 TypeScript 类型/窄运行时常量，不引入 React、浏览器 API、Supabase SDK、附件 Blob 或页面状态。
- [ ] T008 [US1] 新增 `src/domain/account-data/model.ts`、`src/domain/account-data/migrations.ts`、`src/domain/account-data/index.ts`，从 `src/lib/data.mjs` 迁移归一化、校验、旧版本迁移和纯领域函数；保持 `normalizeState`、`restoreState`、`createInitialState`、原始正文和备份兼容语义。
- [ ] T009 [US1] 新增 `src/application/account-data/ports.ts`、`src/application/account-data/local-recovery.ts`、`src/application/account-data/index.ts`，把保存/加载/受保护恢复用例与端口定义集中起来；用例不得直接访问 `window`、`localStorage`、IndexedDB、Supabase 或 React Context，且不得新增第二个业务写命令。
- [ ] T010 [US1] 新增 `src/infrastructure/local/browser-storage.ts` 和 `src/infrastructure/local/index.ts`，从 `src/lib/storage-state.mjs` 迁移浏览器存储适配；保留 `new / ready / recovery-needed`、写入失败不覆盖当前状态和账号 key 语义，本切片不加入封套、校验和、历史或多标签页策略。
- [ ] T011 [US1] 新增 `src/infrastructure/cloud-sync/protocol.ts`、`src/infrastructure/cloud-sync/document-adapter.ts`、`src/infrastructure/cloud-sync/stream-adapter.ts`、`src/infrastructure/cloud-sync/index.ts`，从 `src/lib/account-sync.mjs`、`src/lib/cloud-document.mjs`、`src/lib/incremental-sync.mjs` 和 `src/app/_providers/cloud-document-client.js` 做无语义变化的边界迁移；不得改 RPC、表、CAS、冲突或云端覆盖行为，第一阶段不得新增网络调用。
- [ ] T012 [US1] 将 `src/app/_providers/log-note-data-provider.js` 和 `src/app/settings/settings-page.js` 接到新的 `application/account-data`、`infrastructure/local` 和 `infrastructure/cloud-sync` 窄入口；`commitData` 继续是普通业务保存入口，`replaceData` 继续是当前备份恢复入口，保存先本地后云端的现有顺序保持不变。
- [ ] T013 [US1] 迁移现有调用方的导入路径并保持 UI/Agent 行为不变：`src/app/_components/calendar-view.js`、`src/app/_components/date-label.js`、`src/app/_components/goals-workspace.js`、`src/app/_components/home/home-action-dock.js`、`src/app/_components/home/home-page.js`、`src/app/_components/home/home-record-actions.js`、`src/app/_components/home/home-record-views.js`、`src/app/_components/home/use-draft-attachments.js`、`src/app/_components/home/use-home-agent.js`、`src/app/_components/home/use-home-date-swipe.js`、`src/app/_components/home/use-today-plan-clarification.js`、`src/app/_components/plan-editor.js`、`src/app/_components/record-composer.js`、`src/app/goals/goal-detail-page.js`、`src/app/organize/organize-workspace.js`、`src/app/settings/_components/record-setup/record-setup-manager.js`、`src/app/settings/_components/record-setup/record-setup-screen.js`、`src/modules/agent-bridge/mcp/browser-controller.mjs`、`src/modules/agent-bridge/mcp/change-validation.mjs`、`src/modules/agent-bridge/mcp/read-snapshot.mjs`、`src/modules/agent-bridge/read-only-query.mjs`、`src/modules/organize/classification/model.mjs`；若某个 helper 不属于本切片核心职责，保留其明确的迁移期入口并在 T015 记录删除条件，不得创建新的平行实现。
- [ ] T014 [US1] 更新测试导入和结构断言：`tests/account-sync.test.mjs`、`tests/attachments.test.mjs`、`tests/agent-appearance.test.mjs`、`tests/agent-bridge-browser.test.mjs`、`tests/agent-bridge-contract.test.mjs`、`tests/agent-bridge-controller.test.mjs`、`tests/agent-bridge-core.test.mjs`、`tests/agent-plan-record-plan.test.mjs`、`tests/agent-plan-record-record.test.mjs`、`tests/agent-plan-record-security.test.mjs`、`tests/cloud-document.test.mjs`、`tests/daily-markdown-import.test.mjs`、`tests/data.test.mjs`、`tests/incremental-sync.test.mjs`、`tests/mastra-read-only-tools.test.mjs`、`tests/plan-model.test.mjs`、`tests/record-inline-edit-model.test.mjs`、`tests/report-api.test.mjs`、`tests/report-export.test.mjs`、`tests/goal-model.test.mjs`；只调整模块归属和断言路径，不改测试数据来掩盖行为差异。
- [ ] T015 [US1] 在 `tests/project-structure.test.mjs` 通过新入口引用检查后，删除满足条件的旧核心入口 `src/lib/data.mjs`、`src/lib/storage-state.mjs`、`src/lib/account-sync.mjs`、`src/lib/cloud-document.mjs`、`src/lib/incremental-sync.mjs` 和 `src/app/_providers/cloud-document-client.js`；若仍有合法调用方或 Node/Next 兼容证据不足，保留迁移期转发并在返回证据中列出调用方、删除条件和移除期限，禁止永久兼容。
- [ ] T016 [US1] 运行 `npm run typecheck`、`node --test tests/project-structure.test.mjs tests/data.test.mjs tests/account-sync.test.mjs tests/cloud-document.test.mjs tests/cloud-load-recovery.test.mjs tests/incremental-sync.test.mjs`，并核对 `commitData` 唯一普通写入者、`replaceData` 受控恢复入口、账号隔离、旧备份可读、附件不入文字云同步和失败不空写证据。

## Deferred Stories (not executable in this slice)

- User Story 2（云端保存本地副本）：留待步骤三之后，另行讨论云端读取/覆盖策略和网络状态文案；不在本任务修改 Supabase。
- User Story 3（云端冲突合并）：留待独立的版本/CAS/冲突合并方案；不得借结构迁移改合并结果。
- User Story 4（本地与云端历史回溯）：留待本地封套、历史保留、撤销和云端版本恢复方案；本任务不创建历史表或 UI。

## Final Phase: Integration, Evidence, and Return

- [ ] T017 [P] 更新 `specs/REQ-20260911-01-core-record-sync-review/quickstart.md`、`contracts/local-data-contract.md`、`data-layer-optimization-report.md` 仅反映已验证的目录、导出和依赖方向；不把未来封套、历史、Store 或云端行为写成已完成。
- [ ] T018 运行所有聚焦回归并检查失败是否来自本写集；不改变无关快照，不把 Node 18 环境错误当作产品证据，合规环境应使用 Node `>=22.13.0`。
- [ ] T019 运行 `npm run check` 和 `git diff --check`；本切片没有交互变更时不新增 `npm run design:check` 之外的视觉工作，若误触 UI 则按 `DESIGN.md` 补回归。
- [ ] T020 对照 `spec.md`、`plan.md`、`.specify/memory/constitution.md`、`tests/project-structure.test.mjs` 和本任务文件复核最终 diff；确认只修改已确认写集，保留所有无关脏改动，并返回旧入口删除清单、写入者数量、公共导出差异、测试结果和未验证证据。
- [ ] T021 将 Returned 证据交给总控独立验收；只有总控对照 `PROJECT_BOARD.md` 的 LN-013 验收标准确认后，才允许后续步骤进入新的讨论和任务，不在本任务中标记 Accepted。

## Dependencies and Execution Order

- T001–T003 阻塞全部源码编辑；当前分支或目标文件归属不清时停在这里。
- T004–T006 必须先于 T007–T015；任何预期外行为差异回到核心链路门禁。
- T007–T011 先完成契约、领域、应用和基础设施，再执行 T012–T015 的 Provider、调用方和旧入口收敛。
- T016–T020 是返回前的完整证据链；T021 只交给总控，不改变看板状态。
- `[P]` 仅表示文件层面的依赖独立性，不授权在同一 checkout 并发写入。

## Removal and Rollback Conditions

- 任何迁移失败都保留原本地 payload 和旧备份读取路径；不清理用户缓存，不把默认空状态写回损坏 key。
- 旧入口只有在结构检查无新引用、聚焦测试和 `npm run check` 通过、公共导出差异已记录后才能删除。
- 若当前脏改动与任务写集重叠且无法确认归属，任务保持 Returned/Waiting，等待总控在正确分支或隔离 worktree 继续；不得强行覆盖。
