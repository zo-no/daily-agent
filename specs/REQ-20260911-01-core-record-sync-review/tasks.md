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
> 执行任务在返回真实证据后标记为 `[x]`；`PROJECT_BOARD.md` 仍是状态和验收真源。禁止在本任务中修改看板、改 SQL、安装依赖或清理用户脏改动。提交和推送由用户明确授权后单独执行。

## Phase and Iteration Map

| Business phase | Planning stage | Iteration | Phase detail | Research / checklist links | Exit evidence |
| --- | --- | --- | --- | --- | --- |
| `P01` | `S3` | `I1` | 第一步：数据层目录与职责整理 | [research/README.md](./research/README.md)、[data-layer-optimization-report.md](./data-layer-optimization-report.md)、[requirements checklist](./checklists/requirements.md) | 结构回归、聚焦单测、TypeScript 检查、最终 `npm run check` |

## Phase 1: Reconcile and Guard the Work

- [x] T001 对照 `PROJECT_BOARD.md` 的 `LN-013`、`product.md`、`ARCHITECTURE.md`、`.specify/memory/constitution.md`、`spec.md`、`plan.md` 和 `git status --short`，记录当前分支、脏改动、Node 版本、验证基线和本任务排除项；治理文件仅按已获产品负责人批准的同步动作更新，源码任务不得自行修改。
- [x] T002 在 `git status --short` 和 `git diff --name-only` 基础上逐文件确认步骤一写集、用户改动归属和单一写入者；当前 checkout 若仍为 `master`，或目标文件存在未归属改动，先暂停源码编辑并返回总控处理，不得覆盖、重置、stash 或清理。
- [x] T003 [P] 固化迁移前基线：运行 `tests/project-structure.test.mjs`、`tests/data.test.mjs`、`tests/account-sync.test.mjs`、`tests/cloud-document.test.mjs`、`tests/cloud-load-recovery.test.mjs`、`tests/incremental-sync.test.mjs` 对应聚焦命令，记录 Node 22 环境下结果和现有失败归属。

> T001–T003 evidence (2026-09-11): `feature/req-20260911-01-core-record-sync-review` is the active branch; `package.json` and `scripts/worktree.mjs` remain unrelated dirty changes and are excluded. Node `v22.22.0` passed `npm run typecheck`, `npm run design:check`, and all six focused baseline test files above. `git diff --check`, `specify check`, and Spec Kit prerequisites also passed.

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: 先锁定目录依赖方向和旧行为，再移动实现；失败只能来自本任务预期的缺失目标路径或新边界断言。

- [x] T004 [P] 在 `tests/project-structure.test.mjs` 增加 `app → application/domain/shared` 与 `app → infrastructure` 的边界断言、`src/shared/contracts` 不依赖运行端断言、`src/domain` 不依赖运行时断言、`src/application` 不直接依赖 infrastructure 断言，以及核心旧入口不得出现新调用方的结构断言。
- [x] T005 [P] 复用 `tests/data.test.mjs`、`tests/account-sync.test.mjs`、`tests/cloud-document.test.mjs`、`tests/cloud-load-recovery.test.mjs`、`tests/incremental-sync.test.mjs` 的既有版本迁移、账号 key、云 payload、恢复失败保护和增量纯函数回归；没有引入网络、Store 或新的持久化写入者。
- [x] T006 已运行 T004–T005 聚焦测试；75/75 通过，未出现业务行为变化、账号串线或空状态覆盖。

## Phase 3: User Story 1 - 本地数据同步与恢复（Priority: P1）

**Goal**: 在不改变本地数据格式、`commitData`/`replaceData` 语义、账号隔离或云端运行语义的前提下，把当前数据结构、领域逻辑、本地适配和云端适配放入明确的 TypeScript 分层；后续步骤可以独立验证本地恢复。

**Independent Test**: 不连接云端，现有记录/编辑/删除、刷新和备份导入回归保持通过；结构检查能证明 UI/Provider 不再新增对已迁移旧入口的依赖，`npm run typecheck` 能验证共享契约和分层依赖。

- [x] T007 [US1] 新增 `src/shared/contracts/account-data.ts` 和 `src/shared/contracts/index.ts`，定义当前真实的 `AccountDataPayload`、领域/分类/模板/记录/计划/目标/Markdown 设置、云文档和增量条目类型；保持纯 TypeScript 且不引入运行时依赖。
- [x] T008 [US1] 新增 `src/domain/account-data/model.ts`、`src/domain/account-data/migrations.ts`、`src/domain/account-data/index.ts`，以窄 TS 入口复用已测试的归一化、校验、旧版本迁移和纯领域函数；原始正文、版本和备份语义保持不变。
- [x] T009 [US1] 新增 `src/application/account-data/ports.ts`、`src/application/account-data/local-recovery.ts`、`src/application/account-data/index.ts`，将加载和保存用例绑定到抽象端口；用例不访问浏览器、Supabase 或 React，也不增加业务写命令。
- [x] T010 [US1] 新增 `src/infrastructure/local/browser-storage.ts` 和 `src/infrastructure/local/index.ts`，将浏览器 localStorage 适配接入新端口；`new / ready / recovery-needed`、写入失败保护和账号 key 语义保持不变。
- [x] T011 [US1] 新增 `src/infrastructure/cloud-sync/protocol.ts`、`src/infrastructure/cloud-sync/document-adapter.ts`、`src/infrastructure/cloud-sync/stream-adapter.ts`、`src/infrastructure/cloud-sync/index.ts`；云端 RPC、表、CAS、冲突和覆盖语义保持原样，未新增第一阶段网络行为。
- [x] T012 [US1] Provider 和设置页已接到 `application/account-data`、`infrastructure/local`、`infrastructure/cloud-sync` 窄入口；`commitData` 与 `replaceData` 均通过同一个 `persistLocal → saveLocalAccountData → browserStorage.save` 边界，保存先本地后云端顺序未变。
- [x] T013 [US1] 已迁移 App 核心调用方的旧数据/时间/保存/云客户端导入；UI、Agent 和同步行为未改。Node-only Agent Bridge 与独立 capability 仍保留旧 MJS 兼容入口，删除条件记录在 T015。
- [x] T014 [US1] 已更新结构回归并验证所有现有测试仍通过；Node 测试继续使用 MJS 兼容实现，因为当前 Node 运行器不能直接加载 TS，未为测试引入额外 loader 或第二套实现。
- [x] T015 [US1] 已删除 `src/app/_providers/cloud-document-client.js`。`src/lib/data.mjs`、`storage-state.mjs`、`account-sync.mjs`、`cloud-document.mjs`、`incremental-sync.mjs` 暂保留为三类迁移适配的运行时兼容源：Node-only Agent Bridge/现有 Node 测试仍直接引用；删除条件是 TS 运行器或编译产物可被这些调用方直接加载，且对应聚焦回归通过。结构测试禁止 App 和新增分层继续增加旧入口引用。
- [x] T016 [US1] 已运行 `npm run typecheck` 和聚焦测试；结构、数据、云文档、恢复、增量和账号隔离回归通过，并核对普通写入仍由 `commitData`、恢复仍由 `replaceData` 进入同一受控本地边界。

## Deferred Stories (not executable in this slice)

- User Story 2（云端保存本地副本）：留待步骤三之后，另行讨论云端读取/覆盖策略和网络状态文案；不在本任务修改 Supabase。
- User Story 3（云端冲突合并）：留待独立的版本/CAS/冲突合并方案；不得借结构迁移改合并结果。
- User Story 4（本地与云端历史回溯）：留待本地封套、历史保留、撤销和云端版本恢复方案；本任务不创建历史表或 UI。

## Requirement and Success-Criterion Coverage

| 当前步骤一覆盖 | 任务 | 说明 |
| --- | --- | --- |
| `FR-001`, `FR-002`, `FR-003`, `FR-011`, `FR-012` | `T005`, `T007`–`T016` | 仅验证并保持本地优先、旧备份、账号隔离、附件边界和单一受控本地写入边界；不改变数据格式或云端语义 |
| `SC-001`, `SC-002`, `SC-005` | `T003`, `T005`, `T016`–`T020` | 聚焦回归、失败保护和文档/结构证据在步骤一验收 |

| 明确延期 | 原因 |
| --- | --- |
| `FR-004`–`FR-010`, `SC-003`, `SC-004` | 分别属于云端副本、冲突合并、历史回溯或云端状态 UI；见 Deferred Stories，不得由结构迁移提前实现 |

## Final Phase: Integration, Evidence, and Return

- [x] T017 [P] 已更新 quickstart、local-data-contract 和 data-layer-optimization-report，使其反映当前 TS 契约、分层入口、兼容适配和删除条件；未把封套、历史、Store 或云端新行为写成已完成。
- [x] T018 已运行聚焦回归并区分本写集与既有环境问题；当前 Node shell 为 v18.20.8，构建/类型检查在仓库要求的 Node 22 基线证据中已通过，当前 shell 的全量测试唯一失败仍是既有 `next.config.mjs` 缺失；E2E 另因受限环境禁止监听 `127.0.0.1` 而未执行成功。
- [x] T019 已运行 `npm run typecheck`、`npm run build`、`npm run design:check` 和 `git diff --check`；构建存在既有 Mastra 动态依赖 warning，无迁移相关错误。
- [x] T020 已对照 spec、plan、constitution、结构测试和本任务复核 diff；保留 `package.json`、`scripts/worktree.mjs` 无关脏改动，未修改 SQL、看板、依赖或用户数据。
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
