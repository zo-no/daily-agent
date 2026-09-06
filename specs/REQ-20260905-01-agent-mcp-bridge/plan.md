# Implementation Plan: 账号绑定的 Agent MCP/Skill 桥接

**Requirement**: `REQ-20260905-01` | **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)

> The plan describes how to satisfy the feature spec. `AGENTS.md`, the Constitution, `product.md`,
> and `PROJECT_BOARD.md` remain authoritative for governance, product truth, and task state.

## Summary

为 Codex/Claude 提供一个账号绑定的 Log Note MCP/Skill 桥接，使 Agent 能读取当前账号的有界计划、记录和分类，生成单目标变更提案，并在明确确认后由已登录浏览器复读状态、通过现有 `commitData` 本地优先链路提交一次、读回验证。MCP server 只做 stdio 与 loopback 转发；瞬态配对、请求和 proposal 不进入产品数据。第一阶段不改变 `entries` schema，不处理记录 `endTime`，不实现 Google Calendar 近实时同步。

## Technical Context

**Runtime**: Node.js 22, Next.js 15, React 19, browser/PWA
**Primary Dependencies**: 复用 Zod、现有数据规范化与 Supabase/Auth Provider；新增 `@modelcontextprotocol/sdk` 仅用于标准 MCP handshake、resources、tools 和 stdio transport，不能代替业务校验。
**Storage and Ownership**: 记录和计划仍由当前账号浏览器 localStorage/Supabase 文档拥有；图片 Blob 仍在账号隔离 IndexedDB；MCP pairing/request/proposal 只存在于 loopback bridge 内存和当前浏览器会话。
**Testing**: Node test runner、MCP protocol contract tests、Playwright mobile/browser、PWA offline checks、design validation、`npm run check`。
**Target Platforms**: 已认证的 Log Note 浏览器标签页、支持 stdio MCP 的 Codex/Claude 客户端、移动优先浏览器和桌面响应式布局。
**Performance Goals**: 读取请求在本地 bridge 可用时一秒内返回；单次请求最多 50 条记录、30 个计划、7 天范围、256 KiB 响应；bridge 空闲时不轮询产品数据，不增加普通首页启动成本。
**Constraints**: local-first、account isolated、revision safe、offline capable、backup compatible；确认前零写入；一 proposal 一个目标；Google 来源计划只读；不暴露 token/service key/图片 Blob/完整文档。
**Scale/Scope**: 一个本地 bridge 进程、一个已配对浏览器会话、计划/记录/分类三类 resources 与有限 tools；不支持无界批量、后台服务、多账号共享或生产公开 MCP endpoint。

## Source-of-Truth and Readiness Check

- [x] The board item exists and its intended outcome, dependencies, permissions, acceptance, and
      verification method are clear.
- [x] `product.md` contains or will receive the durable product-admission decision when behavior or
      scope changes.
- [x] Visual or interaction work has read `DESIGN.md` and `docs/设计规范/AGENTS.md`.
- [x] The current dirty working tree was inspected and the write set avoids unrelated user changes.
- [x] No second writer owns overlapping files or state.

## Constitution Check

*GATE: Must pass before implementation design and be re-checked after the design is complete.*

- [x] Core recording steps and the home page's primary job are preserved or improved.
- [x] Authenticated offline use, account ownership, and stale-revision safety are preserved.
- [x] Raw notes are not silently rewritten; all changes are explicit and reversible.
- [x] Privacy, network payloads, credentials, backups, restore, and removal are fully specified.
- [x] Tests are mandatory and cover the acceptance scenarios and relevant failure paths.
- [x] The change is the smallest independently testable vertical slice with no speculative breadth.
- [x] Implementation does not require unauthorized commit, push, publish, deploy, deletion, reset,
      history rewrite, OKR change, or worktree merge.

## Existing System Investigation

### Relevant Code and Contracts

- `src/lib/data.mjs`：`normalizeState`、`restoreState`、`entries` 和备份/Markdown 兼容。
- `src/lib/plan-model.mjs`：`normalizePlanBlock`、`normalizePlanBlocks` 和 Google 来源只读语义。
- `src/lib/account-sync.mjs`：账号作用域 key、文本文档 fingerprint 和 CAS reconciliation。
- `src/app/log-note-data-provider.js`：当前账号 hydration、本地持久化、`commitData`、revision/CAS 同步和冲突状态。
- `src/app/auth-provider.js`：当前 Supabase 身份和 session generation。
- `src/app/cloud-document-client.js`、`src/lib/cloud-document.mjs`：云文档读、写 RPC、revision conflict。
- `src/modules/agent-bridge/daily-log/`：已验证的严格 schema、指纹和 `preview-required` 模式。
- `src/mastra/tools/daily-log/`、`src/mastra/agents/daily-log/`：Mastra Tool/Agent 适配器，仅作复用契约的参考，不作为 MCP transport。
- `src/app/google-calendar-provider.js`：只作为边界参考；Calendar 近实时变化属于 LN-086。

### Reuse and Compatibility Decisions

- 业务读取和写入复用既有 `entries`、`planBlocks`、分类 allowlist、`normalizeState` 和 `commitData`，不新建平行状态。
- MCP 传输对象、pairing、proposal、confirmation 和 request result 不加入账号文档、JSON backup、Markdown export 或 Service Worker cache。
- 记录保留现有 `date/time/content/categoryId`；不把 `time` 改名为 `startTime`，不新增 `endTime`。
- MCP 返回附件存在摘要时不暴露 Blob/URL；Google token、完整事件对象和普通 Google 事件不进入桥接。

## Proposed Design

### Data and Control Flow

```text
Codex/Claude stdio MCP client
  → local MCP server (loopback URL + pairing secret)
  → transient bridge queue (memory, TTL, one request/result)
  → browser Agent Bridge surface polls pending request
  → current account snapshot read / proposal validation
  → explicit confirmation
  → browser re-read + target/fingerprint/revision check
  → one commitData update
  → local persistence + existing CAS sync
  → browser read-back
  → bridge result → MCP client
```

Reads return only allowlisted, bounded fields. Proposal creation never writes. Commit re-reads the
current browser state, rejects stale/expired/revoked/Google-read-only/unknown-field requests, then
applies one normalized target update. The bridge does not retry business operations. If the browser
surface is closed, offline without a safe local commit path, or on another account, the result is a
stable non-applied error.

### Trust and Privacy Boundaries

| Boundary | Allowed data | Authentication / safety |
| --- | --- | --- |
| Codex/Claude → MCP | resource/tool arguments, request ID, explicit confirmation | stdio process receives only loopback URL and short-lived pairing secret |
| MCP → loopback bridge | bounded request envelope, no account ID from caller | pairing secret, session TTL, request size/operation limits |
| Bridge → browser | pending read/proposal/commit request | browser checks pairing, current account generation and proposal TTL |
| Browser → product state | allowlisted plan/record fields only | existing `commitData`, local-first persistence, revision/CAS, read-back |
| Browser → cloud | existing text payload and revision RPC | current Supabase session; no MCP secret, Google token or Blob |

Logs must omit record content, plan titles when not needed for diagnostics, pairing secrets, access
tokens and user IDs. The bridge listens on loopback only and is not a public unauthenticated service.

### UI and Interaction Contract *(when applicable)*

The Agent Bridge surface is secondary and lives in settings or a dedicated local bridge panel. It
has no home-page control and does not alter quick-record steps. Pairing shows a one-time secret,
current account label without exposing the account ID, expiry and revoke action. Pending proposals
show target, date, time, category and before/after diff; the user must explicitly confirm or reject.
All controls remain keyboard reachable with at least 44px targets; no new persistent rail or modal is
added to the recording surface. Closing the panel revokes or pauses the pairing according to the
session policy and never writes an unconfirmed proposal.

## Project Structure and Write Set

```text
Read-only context:
  AGENTS.md, PROJECT_CONTEXT.md, PROJECT_BOARD.md, product.md, ARCHITECTURE.md
  src/lib/data.mjs, src/lib/plan-model.mjs, src/lib/account-sync.mjs
  src/app/log-note-data-provider.js, src/app/auth-provider.js
  src/app/cloud-document-client.js, src/lib/cloud-document.mjs
  src/modules/agent-bridge/**, existing specs/tests

Allowed implementation write set:
  src/modules/agent-bridge/mcp/**          # pure envelope, allowlist, fingerprint, validation
  src/infrastructure/mcp/**                # stdio server and loopback bridge client/queue adapter
  src/app/api/mcp/**                       # loopback pairing/request/result handlers only
  src/app/settings/_components/agent-bridge/**  # secondary pairing/proposal confirmation surface
  src/app/layout.js or settings composition # only to mount the isolated surface when needed
  scripts/log-note-mcp.mjs                  # local MCP stdio entrypoint
  .agents/skills/log-note-agent/SKILL.md    # project-discoverable semantic Skill
  tests/mcp-*.test.mjs, tests/agent-bridge-*.test.mjs
  e2e/run-mobile.mjs (only focused bridge scenarios, if needed)
  package.json, package-lock.json            # only approved MCP SDK and script
  specs/REQ-20260905-01-agent-mcp-bridge/**              # derived artifacts

Explicit exclusions:
  src/lib/data.mjs schema changes, entries endTime, Google Calendar implementation,
  Supabase service-role access, new database tables, image storage, homepage redesign,
  existing LN-081/082/083 behavior, unrelated dirty UI files, commits/push/deploy.
```

**Integration Order**: one writer in the main checkout. First implement pure protocol/normalizer and
tests, then loopback queue and MCP handshake, then browser pairing/read/proposal/commit adapter and
focused E2E. Run the full gate only after all isolated files are integrated. Do not start LN-085 until
LN-084 is independently accepted.

## Test and Evidence Plan *(mandatory)*

### Automated Regression

- Unit/model/contract tests: strict envelope, unknown fields, date/range/size limits, allowlisted
  plan/record fields, Google read-only rejection, target fingerprints, TTL, request idempotency,
  stale revision, account generation, cancellation and zero-write behavior.
- MCP protocol tests: initialize/handshake, resource discovery, tool schemas, stdio entrypoint,
  malformed request rejection and bounded result serialization.
- Browser/mobile tests: create/revoke pairing, read plan/records/categories, preview proposal,
  explicit confirm/reject, read-back, duplicate commit, account switch, browser close and pending
  request expiry at 320/390/426/768/1280px where the isolated panel is visible.
- PWA/offline/account tests: authenticated offline read, no false “cloud saved” claim, existing
  manual offline CRUD, old backup/Markdown export unchanged, two-account cache isolation.
- Design validation: secondary-panel layout, 44px targets, keyboard focus, reduced motion, no
  homepage or quick-record geometry changes; run `npm run design:check` if UI files change.
- Full gate: `npm run check`.

### Real-Environment or Manual Evidence

- A real Codex or Claude client must discover the MCP server, read a real test account's plan/record,
  create a proposal, require explicit confirmation, commit one change and read it back.
- Real account A/B pairing, logout/login, browser refresh, multiple tabs, revoked pairing and offline
  behavior must be checked manually. Remove secrets and private text from evidence.
- Production deployment, Google Calendar changes and long-term usage are not evidence for LN-084 and
  remain assigned to LN-086/LN-021.

### Acceptance Evidence Handoff

Record in `PROJECT_BOARD.md`: focused test counts, full `npm run check` output, MCP handshake/resource
discovery result, one redacted real-client read/propose/confirm/read-back trace, account isolation and
revocation results, and unresolved real-environment or deployment evidence. Keep the board item
`Returned` until the controller independently verifies the evidence.

## Rollback, Removal, and Migration

Disable the Agent Bridge surface and remove the MCP stdio entrypoint, loopback routes, Skill and
focused tests. Revoke any active in-memory pairing sessions. No account document, `entries`,
`planBlocks`, backup, export, image Blob or Google event migration is needed. If a proposal or commit
fails, discard only the transient request/proposal and leave current state untouched.

## Complexity Tracking

| Added Complexity | Why It Is Required Now | Simpler Alternative Rejected Because |
| --- | --- | --- |
| MCP SDK and stdio entrypoint | Codex/Claude need a standard discoverable tool/resource surface | Skill-only instructions cannot read live account data or execute controlled actions |
| Loopback queue and browser pump | Browser owns local state and `commitData`; server cannot read localStorage or React state | Direct Supabase/service-role writes would bypass local-first and account boundaries |
| Proposal/confirmation envelope and target fingerprint | External Agent output is untrusted and must not overwrite newer data | One-step write tools cannot prove explicit approval or stale safety |
| Secondary pairing/proposal panel | User needs visible pairing/revoke/confirm state without changing quick recording | Always-on homepage controls would add complexity and a required decision |
