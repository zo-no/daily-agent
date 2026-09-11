# Implementation Plan: 核心记录同步链路梳理与治理

**Requirement**: `REQ-20260911-01`
**Legacy Board Item**: `LN-013`（第一阶段本地数据保护结构治理）
**Date**: 2026-09-11
**Spec**: [spec.md](./spec.md)

## Summary

本计划只覆盖第一阶段：把本地记录保存、读取、损坏保护和备份恢复整理成一条可独立验证的链路，并为后续云端同步锁定纯 TypeScript 业务契约。现有 `commitData`、账号隔离、备份兼容和附件边界继续复用；`src/lib` 核心文件按调用方迁移逐步删除，不新增永久兼容层。

客户端 Store 不作为本阶段的默认交付。先记录 Provider 的订阅和异步状态证据；达到门槛后，通过 ADR 选择 Redux Toolkit + React-Redux 等社区库。无论是否接入 Store，持久化都只能由本地恢复用例调用；普通业务写入继续以 `commitData` 为唯一公开入口，当前 `replaceData` 必须按本计划收敛。

## Technical Context

**Runtime**: Node.js `>=22.13.0`、Next.js 15、React 19、TypeScript 5.9；当前仓库仍允许 JS/MJS，迁移需按调用链进行
**Primary Dependencies**: 复用现有 Zod、React 和 Supabase 客户端；本阶段不安装新依赖。Store 候选为 Redux Toolkit + React-Redux，必须先完成 ADR 和测量证据
**Storage and Ownership**: 当前账号作用域 localStorage 保存文字状态；IndexedDB 保存账号隔离的附件 Blob；Supabase 文档和增量表只做结构对齐，不参与第一阶段运行链路
**Testing**: Node test runner、TypeScript typecheck、Playwright 移动 E2E、PWA 离线/持久化检查、`npm run design:check`（仅当交互变化）、`npm run check`
**Target Platforms**: 已认证的移动优先浏览器/PWA 和桌面响应式页面
**Performance Goals**: 本地记录动作不等待网络；保存结果在一次 `commitData` 内可确定；刷新或重启后读取最近一次有效保存点
**Constraints**: local-first、账号隔离、原始正文不静默改写、备份兼容、附件不进文字云同步、失败不以默认空状态覆盖原数据
**Scale/Scope**: 现有 `AccountDataPayload`（domains、categories、templates、markdownSettings、entries、planBlocks、goals）；只涉及契约/本地恢复边界和对应测试，不改路由、SQL 或产品字段

## Source-of-Truth and Readiness Check

- [x] `LN-013` 已存在；本包明确把第一阶段结构治理作为兼容映射，不更改看板状态。
- [ ] 本包的范围扩展、Store 是否接入、本地封套和多标签页范围仍需产品负责人确认。
- [x] 本轮无视觉或交互实现；若实现阶段改变状态文案或恢复面板，再读取 `DESIGN.md` 和设计规范。
- [x] 已检查当前 dirty working tree；本包只写 feature 文档，不触碰现有用户改动。
- [x] 当前没有第二个写入者；不创建 worktree、不提交、不推送、不部署。

## Core-Chain Change Contract

本计划触及记录保存、恢复、备份和持久化边界；以下是本 feature 对全局门禁的具体落实：

- **Canonical path**：普通记录/编辑/删除暂沿用 `LogNoteDataProvider.commitData`，目标收敛到 `local-recovery` 用例和浏览器存储适配器；整包恢复的 `replaceData` 路径待 review 后收敛。
- **Reuse**：复用 `AccountDataPayload`、`normalizeState/restoreState`、账号 generation、现有 localStorage/IndexedDB 账号隔离和备份格式。
- **Replacement / deletion**：迁移调用方、测试和结构检查通过后删除核心旧 `src/lib` 入口；删除条件未满足时保留明确的迁移证据。
- **State writers**：当前可见 `commitData` 和设置页 `replaceData`；目标是一个受控本地持久化边界。
- **Public contract**：纯 TypeScript `AccountDataPayload`、`LocalSnapshotEnvelope`、恢复结果和版本迁移规则；云端 revision/cursor 仅做对齐，不进入第一阶段本地 payload。
- **Invariants**：本地成功先于云端、账号隔离、失败不以空状态覆盖、原始记录可恢复、旧备份可读、附件不进入文字云同步。
- **Verification**：本地保存/读取/损坏/恢复/账号隔离/备份回归，结构引用检查和最终 `npm run check`；本阶段无真实云端证据。
- **Unresolved evidence**：本地封套是否启用、有限快照和多标签页范围、`replaceData` 最终命令语义、Store ADR 门槛仍待产品负责人确认。
- **Discussion status**：Pending owner discussion。

## Constitution Check

*GATE: 本计划满足治理约束；进入实现前必须在产品决策和 Phase 0/1 证据补齐后重查。*

- [x] 记录仍先本地保存，首页核心记录步骤不增加。
- [x] 认证离线使用、账号归属、revision 隔离和附件 owner 保持原边界。
- [x] 原始记录正文和旧备份不被静默重写；恢复失败保留原状态和证据。
- [x] 第一阶段不发送网络数据，不新增凭证或云端写入。
- [x] 计划要求契约、恢复失败和账号隔离测试，最终通过 `npm run check`。
- [x] 方案优先复用 `commitData`、`normalizeState/restoreState` 和现有存储结果，不建立平行写路径。
- [x] 未授权的代码、依赖、SQL、看板、提交、推送、部署和历史改写均明确排除。

## Existing System Investigation

### Relevant Code and Contracts

- `src/lib/data.mjs`：当前 `LocalState`、默认数据、版本迁移、归一化、恢复和导出。
- `src/lib/storage-state.mjs`：localStorage 读取/写入、`new / ready / recovery-needed` 和写入失败结果。
- `src/lib/attachment-store.mjs`、`src/lib/attachment-model.mjs`：附件 Blob 和引用的账号隔离。
- `src/app/_providers/log-note-data-provider.js`：账号 generation、hydration、`commitData`、恢复和同步编排。
- `src/app/settings/settings-page.js`：备份导入当前调用 `replaceData`，这是第一阶段必须收敛的整包替换入口。
- `src/lib/account-sync.mjs`、`src/lib/cloud-document.mjs`、`src/lib/incremental-sync.mjs`：后续云端/增量边界，第一阶段只记录迁移目标。
- `supabase/migrations/20260816090000_log_note_documents.sql`、`20260907120000_incremental_sync.sql` 及后续修复：云端结构对齐事实，不在本阶段执行。
- 相关测试：`tests/cloud-load-recovery.test.mjs`、`tests/cloud-document.test.mjs`、`tests/account-sync.test.mjs`、`tests/project-structure.test.mjs`，以及现有备份/附件/首页回归。

### Reuse and Compatibility Decisions

| 责任 | 继续复用 | 迁移后归属 | 退出条件 |
|---|---|---|---|
| 业务保存 | `commitData` | Provider 调用 local-recovery | 不得出现第二个业务写命令 |
| 备份恢复 | 当前 `replaceData` | 受控恢复命令与普通保存共享持久化边界 | 不保留未审计的平行写入者 |
| 业务 payload | 当前 `LocalState` 的序列化形状 | `modules/log-note-data/contract` 的 `AccountDataPayload` | contract/SQL 对齐和旧备份回归通过 |
| 版本迁移 | `normalizeState/restoreState` 的语义 | TypeScript contract 内显式迁移 | 旧入口调用方全部迁移 |
| 浏览器读写 | 当前 localStorage/IndexedDB 行为 | `infrastructure/browser` adapter | 恢复和附件回归通过 |
| 旧 `src/lib` | 仅迁移期转发（如确有必要） | 删除核心旧文件 | 结构测试无旧路径引用、`npm run check` 通过 |

## Proposed Design

### Data and Control Flow

第一阶段写入：

```text
页面动作
  → LogNoteDataProvider.commitData
  → local-recovery.commitLocalSnapshot
  → browser storage adapter.write
  → 写成功后更新内存数据/Store 投影
```

写入失败时，内存中的未保存草稿不能被标记为已保存；上一次有效保存点和错误证据继续可读。读取时先识别新 key、旧裸 payload、封套和损坏数据，再调用 contract 的 `restoreState`。恢复或导入必须先解析、归一化、校验，再一次性替换；失败不清空当前有效状态。

当前 `replaceData` 是设置页整包导入的公开命令，不能在迁移中被忽略。实现任务必须先决定它是 `commitData` 的显式 replace 语义，还是 local-recovery 的受控恢复命令；两者都只能通过一个底层持久化边界写入。

业务契约与本地封套分离：`AccountDataPayload` 只表达用户数据；`LocalSnapshotEnvelope` 只表达本地保存序号、操作标识、时间和完整性校验。云端 revision、cursor、item version 和冲突集合不进入这两个第一阶段对象。

### Store Decision Gate

本阶段先测量：Provider Context 的无关重渲染次数、跨页面订阅需求、恢复/保存异步状态跳转和测试可观察性。只有测量结果显示当前 Context 阻碍核心链路维护，并且 ADR 比较社区方案后通过，才接入 Redux Toolkit + React-Redux（或 ADR 选定的社区库）。

Store 只投影客户端全局可变状态和生命周期；不持有 token、Supabase client、数据库行、附件 Blob、AI proposal、页面草稿或请求控制器；不直接写任何存储。

### Trust and Privacy Boundaries

第一阶段没有网络接收方。浏览器只访问当前账号作用域的 localStorage 和 IndexedDB；损坏 payload 原文仅作为恢复证据供用户导出，不上传、不写日志正文。云端字段、表名和 RPC 仅在后续 adapter/SQL 对齐测试中出现。

### UI and Interaction Contract

本阶段默认不改 UI。若实现中需要增加保存/恢复状态提示，必须保持记录动作步骤不增加、键盘/触控目标不退化、移动端无横向溢出，并补充设计与移动回归。恢复保护必须明确说明当前数据是否可用、最近一次保存是否成功、可下载的原始证据和可执行的恢复动作。

## Project Structure and Write Set

```text
本轮允许修改：
specs/REQ-20260911-01-core-record-sync-review/spec.md
specs/REQ-20260911-01-core-record-sync-review/plan.md
specs/REQ-20260911-01-core-record-sync-review/data-model.md
specs/REQ-20260911-01-core-record-sync-review/contracts/**
specs/REQ-20260911-01-core-record-sync-review/quickstart.md
specs/REQ-20260911-01-core-record-sync-review/research/**

本轮明确排除：
src/**、supabase/**、package.json/package-lock.json、PROJECT_BOARD.md、
PROJECT_CONTEXT.md、product.md、ARCHITECTURE.md、.specify/memory/**、提交/推送/部署
```

**Integration Order**: 先由产品负责人 review `spec.md`、研究稿和本计划；确认后再生成 `tasks.md`。实现阶段遵循“契约 → 本地恢复 → 可选 Store ADR → 旧入口删除”的单写者顺序。

## Test and Evidence Plan

### Automated Regression

- **Contract**：实体字段、版本、旧数据迁移、重复 ID/非法结构、云端 payload 形状保持一致。
- **Local recovery**：空 key、有效读取、写入失败、配额/异常、损坏 JSON、封套校验、导入失败、成功恢复和恢复后重启。
- **Ownership**：匿名、账号 A、账号 B 的文字 key、附件 owner 和恢复证据互不交叉。
- **Canonical path**：普通记录/计划/结构写入继续经 `commitData`；恢复整包写入必须与其共享唯一受控持久化边界；结构测试禁止新增旧 `src/lib` 引用。
- **Browser/PWA**：若实现状态面板或恢复操作，补移动端聚焦回归、离线刷新和持久化；否则不新增视觉测试。
- **Full gate**：实现完成后运行 `npm run check`，并按交互变更情况运行 `npm run design:check`。

### Real-Environment or Manual Evidence

本阶段不需要真实云端凭证、跨设备账号或部署证据。需要产品负责人确认：本地封套是否启用、是否保留有限快照、是否纳入多标签页同步、Store 是否满足 ADR 门槛。

### Acceptance Evidence Handoff

实现返回时必须提供：变更文件清单、canonical path、旧入口删除清单、状态写入者数量、公共导出差异、聚焦测试命令及结果、`npm run check` 结果和未验证证据。由总控独立对照 `LN-013` 映射和本 spec 验收，不能以 tasks 完成为 Accepted。

## Rollback, Removal, and Migration

本阶段优先保持现有裸 `LocalState` 可读；若启用封套，读取必须双格式兼容，写回策略单独确认。任何契约迁移失败都回退到旧调用方，不清理用户缓存。旧 `src/lib` 文件只有在调用方、测试和结构检查全部迁移后才删除；若删除条件未满足，任务保持 Returned 并列出阻塞证据，不把兼容入口永久化。

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
|---|---|---|
| 纯 TypeScript contract | 前后端需要同一份可校验业务结构，用户已明确要求 TS | 继续用 MJS 无法提供稳定的类型边界 |
| local-recovery 与 browser adapter 分层 | 需要在无浏览器/无云端环境独立验证恢复规则 | 继续让 Provider 直接解析 JSON 会保持责任混合 |
| 社区 Store ADR（可选） | 只有测量证明 Context 影响核心链路时才需要 | 自研 Store 会新增状态实现和维护负担 |
| 删除旧 `src/lib` 核心入口 | 避免历史逻辑继续成为活跃主路径 | 永久兼容层会保留重复入口和隐式依赖 |
