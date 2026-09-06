# Implementation Plan: Google Calendar 近实时变化同步

**Requirement**: `REQ-20260905-03` | **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

在 LN-067 现有浏览器 Calendar client/provider 基础上，先加入可续接的增量同步、删除 tombstone、etag 冲突和可观测状态；以页面可见期间的有界轮询作为首版基线。只有部署具备安全长期授权、公网 HTTPS 和可靠 worker/queue 时，才接入 push channel/webhook。保持普通 Google 事件只读、本地计划一对一受管事件和现有本地优先计划数据边界。

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: 复用现有 Google Identity Services、Calendar API client、`google-calendar-model`、`google-calendar-provider`、`plan-model`、`account-sync` 和 `commitData`；不默认新增依赖。
**Storage and Ownership**: 本地计划与记录仍由当前账号 localStorage/Supabase 文档拥有；日历缓存和 sync metadata 按账号隔离；refresh token（若获批）只能进入独立、严格 RLS 的 secret storage，不进入主文档、备份或浏览器持久化。
**Testing**: Node test runner、Calendar model/provider/route contract tests、Playwright mobile/PWA、design validation、真实 OAuth/部署手工证据和 `npm run check`。
**Target Platforms**: 已认证的移动优先浏览器、桌面响应式 Settings/计划工作面；满足部署条件时的受控 webhook/worker。
**Performance Goals**: 页面可见且授权时 95% 远端变化在 120 秒内可见；正常本地计划变化 95% 在 5 秒内反映至受管事件；同步不增加首页快速记录启动成本。
**Constraints**: 账号隔离、local-first、revision/CAS、普通事件只读、令牌不进产品数据、备份兼容、失败不删除本地计划；push 不能被未验证的部署能力假设替代。
**Scale/Scope**: 当前主日历 `primary`、有界时间窗、单账号同步状态；不扩展共享日历、通用日历管理或无限历史重放。

## Source-of-Truth and Readiness Check

- [x] `LN-086` 已存在于 `PROJECT_BOARD.md`，依赖、验收和真实 OAuth/部署证据要求明确。
- [x] `product.md` 已记录 Calendar 能力的产品准入边界；本包不改变记录 schema 和快速记录成本。
- [x] 现有 dirty tree 已检查；不触碰用户已有首页、部署和治理文件改动。
- [x] 本包与 LN-084/LN-085 分离；不拥有 MCP bridge 或 Agent authoring 写入者。
- [x] 一名 writer 负责实现；并行标记只表示不同文件的依赖独立，不授权主 checkout 并发写入。

## Constitution Check

- [x] 核心记录循环和首页快速记录保持不变；同步位于次级设置/计划面。
- [x] 账号、离线、本地优先和 revision/CAS 边界保持不变；远端变化不会直接写主数据。
- [x] 原始记录不被 Calendar 派生数据改写；普通 Google 事件不会转成记录或计划。
- [x] 令牌、完整事件和内部同步状态的网络/存储/删除边界已明确。
- [x] 自动化测试、真实 OAuth、部署和合规证据分别记录，不能以本地测试代替。
- [x] 首版是最小的 syncToken + 轮询垂直切片；push 受部署门禁隔离。
- [x] 不需要 commit、push、发布、部署、删除、reset、历史改写或 worktree merge 授权。

## Existing System Investigation

### Relevant Code and Contracts

- `src/app/google-calendar-client.js`：GIS token、Calendar API 请求、分页、当前时间窗和受管事件查询。
- `src/app/google-calendar-provider.js`：账号缓存、token 生命周期、900ms 本地计划 debounce、受管事件 reconciliation 和状态。
- `src/lib/google-calendar-model.mjs`：受管标记、计划映射、全天/跨日展开、etag 引用和缓存归一化。
- `src/lib/plan-model.mjs`：计划块规范化和 Google 来源只读语义。
- `src/app/log-note-data-provider.js`、`src/lib/account-sync.mjs`：本地优先、账号命名空间、revision/CAS 和冲突路径。
- `src/app/settings/**`、`src/app/calendar-view.js`：同步设置、日历视图和状态展示。
- `tests/google-calendar-model.test.mjs`、`tests/calendar-model.test.mjs`、`tests/account-sync.test.mjs`：现有模型/账号回归。

### Reuse and Compatibility Decisions

- 复用现有 `logNoteManaged`、`logNotePlanId`、`externalRef` 和 `reconcileManagedGoogleEvents`，不新建计划身份或第二套写入路径。
- 增量同步与全量窗口共用同一个事件归一化、etag 比较、删除和账号 generation guard；失效游标才进入有界重建。
- 继续保持 `primary` 日历和当前 `planBlocks` 字段；不把完整 Google 事件、token 或 sync metadata 写入主备份。
- Calendar cache 是次级上下文；关闭/撤权/移除同步不会清空或改写本地计划、记录和 Supabase 文档。

## Proposed Design

### Data and Control Flow

```text
page visible / reconnect / manual refresh
  → current account + authorization generation guard
  → syncToken incremental list(showDeleted=true)
  → event ID/etag/tombstone normalization and reconciliation
  → update isolated Calendar cache + sync metadata
  → local plan dirty queue: managed event create/update/delete with known etag
  → If-Match / conflict classification
  → read-back event reference and visible sync status

optional deployment path:
  Google watch channel → fast webhook 2xx → durable sync job
  → same syncToken/etag reconciliation (webhook payload is only a hint)
```

Polling is the acceptance baseline: page-visible polling, foreground/network-recovery immediate sync,
and bounded backoff when hidden or failing. Push is an adapter over the same state machine, not a second
reconciliation implementation. A 410/invalid token clears the cursor, performs bounded full rebuild, and
creates a new channel only when the deployment prerequisites are approved.

Google 的 `syncToken` 请求必须保持首次同步的查询形状；不能在增量请求中临时追加与游标不兼容的
`timeMin`/`timeMax`/`orderBy`/`q` 等过滤。实现应将“有界”落实在本地缓存、UI 展示和返回数据裁剪，
并为超出展示窗口但可能影响受管事件的变化保留最小状态，避免用不同时间窗复用同一个游标。

### Trust and Privacy Boundaries

| Boundary | Allowed data | Safety |
| --- | --- | --- |
| Browser → Google | OAuth access token in memory; bounded calendar query; minimum managed event fields | GIS scope and current account; no token persistence in product data |
| Google → Browser/cache | Event ID, start/end/summary, status, private managed markers, etag, bounded metadata | ordinary events remain read-only; cache is account-scoped and disposable |
| Optional webhook → worker | channel ID, resource ID, headers and a trigger to re-read | verify channel/resource/expiry; do not trust payload as event truth; fast 2xx only |
| Worker → Google | Account-bound refresh authorization (only if separately approved), syncToken and event IDs | secret storage/RLS, rotation, revocation and generation guard |
| Calendar capability → Log Note | normalized cache, externalRef updates and sync status | no direct Supabase table write; plan changes use existing provider/commitData path |

Logs redact tokens, channel secrets, user IDs, full event titles and record content unless a test fixture explicitly uses synthetic values. Calendar-derived data must not enter remote AI until the LN-067 compliance gate is closed.

### UI and Interaction Contract *(when applicable)*

The existing Settings/Calendar status surface remains the secondary entry. It shows connected/disconnected,
syncing/synced/dirty/offline/error/conflict/revoked/rebuilding, last successful sync, current mode (foreground poll or
approved push), next retry and a recovery action. Conflict and remote-delete messages must identify the local
plan and remote event without dumping private event details. Controls remain keyboard reachable with 44px touch
targets and existing mobile alignment axes; no homepage quick-record geometry changes.

## Project Structure and Write Set

```text
Read-only context:
  AGENTS.md, PROJECT_CONTEXT.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md
  specs/REQ-20260905-01-agent-mcp-bridge/**, specs/REQ-20260905-02-agent-plan-record-authoring/**
  src/app/google-calendar-client.js, src/app/google-calendar-provider.js
  src/lib/google-calendar-model.mjs, src/lib/plan-model.mjs, src/lib/account-sync.mjs
  existing Calendar/settings files and tests

Allowed implementation write set:
  src/app/google-calendar-client.js          # incremental list, etag/precondition, bounded errors
  src/app/google-calendar-provider.js        # sync state machine, polling, generation guards
  src/lib/google-calendar-model.mjs          # metadata, tombstone, conflict and cache normalization
  src/modules/integrations/google-calendar/** # only if an existing canonical capability is established
  src/app/api/google-calendar/**             # webhook/watch/sync handlers only when deployment is approved
  src/app/settings/**, src/app/calendar-view.js # secondary status/recovery UI only
  tests/google-calendar-*.test.mjs, tests/calendar-*.test.mjs
  e2e/run-mobile.mjs, e2e/run-pwa.mjs       # focused Calendar/account/offline journeys
  specs/REQ-20260905-03-google-calendar-realtime/**

Explicit exclusions:
  entries schema, record endTime, MCP/Skill, Agent authoring, homepage quick recording,
  ordinary Google event writes, direct Supabase/service-role writes, unapproved refresh-token storage,
  production deploy configuration, real external account data, commits/pushes/history rewrite.
```

**Integration Order**: one writer; first add pure model/schema and failing regressions, then client incremental
requests and provider reconciliation, then isolated status UI and browser regressions. Add webhook/watch routes
only after explicit deployment/credential approval. Run full gate after isolated files are integrated.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Model/contract: syncToken continuation, pagination, showDeleted tombstones, 410 rebuild, etag mismatch,
  duplicate/乱序 events, all-day/cross-day/timezone mapping, orphan cleanup limits and metadata normalization.
- Provider: local plan create/update/delete, same event ID, account generation, revocation, offline queue,
  network recovery, hidden/visible polling, retry/backoff and concurrent sync serialization.
- Route (if approved): unauthenticated, forged/expired channel, duplicate webhook, oversized payload,
  fast-2xx and queue handoff; no event payload trust.
- Browser/PWA: local plan → Google, ordinary Google read-only, remote managed modification/deletion,
  conflict/recovery UI, disconnect, account switch, offline restore and unchanged quick recording at existing widths.
- Gate: `npm run design:check` for interaction changes, `npm run check`, and `git diff --check`.

### Real-Environment or Manual Evidence

- Google Cloud Calendar API enabled; OAuth origin/scope/test user and consent state verified.
- Real account: create/update/delete local plan, ordinary event read-only, remote managed event edit/delete,
  all-day/cross-day/timezone, revoke authorization, account A/B switch and offline recovery.
- If push is enabled: public HTTPS reachability, channel creation/renewal/expiry, duplicate/late notification,
  worker restart recovery, secure secret storage/RLS and no token in logs/build artifacts.
- LN-067 Calendar→DeepSeek compliance evidence must be resolved before any production AI path uses Calendar data.

### Acceptance Evidence Handoff

Record focused test counts, latency sample definition, state screenshots, redacted OAuth trace, account switch/
revocation results, deployment readiness and unresolved push/compliance evidence in `PROJECT_BOARD.md`. Keep
`LN-086` Returned until an independent controller verifies board criteria.

## Rollback, Removal, and Migration

Disable push/watch first, then disable incremental polling and clear only Calendar cache/sync metadata for the
current account. Preserve local plans, records, `externalRef` compatibility where still readable, backups,
Markdown and manual offline behavior. No main-data migration is needed; unknown or old sync metadata is ignored
or rebuilt without replacing the current account payload.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Incremental cursor and tombstone state | Full-window rereads cannot detect remote deletes or bound latency/cost | Continue full `showDeleted=false` reads would miss deletions and scale poorly |
| etag/precondition conflict state | Google and Log Note can edit the same managed event independently | Last-write-wins would silently overwrite user changes |
| Isolated sync metadata and generation guards | Async callbacks and account switching need explicit ownership | Shared cache or global flags can leak data across accounts |
| Optional webhook/worker adapter | Push can reduce delay when deployment supports it | Declaring browser-only polling as background real-time would be misleading |
