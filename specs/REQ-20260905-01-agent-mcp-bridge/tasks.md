---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: 账号绑定的 Agent MCP/Skill 桥接

**Requirement**: `REQ-20260905-01`
**Input**: Feature artifacts from `/specs/REQ-20260905-01-agent-mcp-bridge/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [ ] T001 Reconcile `LN-084` in `PROJECT_BOARD.md` with `specs/REQ-20260905-01-agent-mcp-bridge/spec.md`, the
  active `.specify/feature.json`, current `git status`, dependency state, and real-client evidence;
  record unresolved evidence without marking the board item Accepted.
- [ ] T002 Confirm the one-writer ownership, exact write set, exclusions, and integration order in
  `specs/REQ-20260905-01-agent-mcp-bridge/plan.md`; verify that `src/lib/data.mjs`, `src/lib/plan-model.mjs`,
  Google Calendar code, Supabase schema, homepage controls, and unrelated dirty files remain out
  of scope before application edits, and do not start transport-dependent work until
  `docs/decisions/0006-agent-bridge-transport-boundary.md` is explicitly accepted or replaced by
  the project owner.
- [ ] T003 [P] Add the durable `LN-084` product-admission entry to `product.md`, including core-loop
  contribution, explicit confirmation cost, offline/account/privacy/backup boundary, removal path,
  exit condition, and the requirement that unverified real Codex/Claude evidence remains open.

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define the protocol, data boundary, and zero-write behavior before implementation.

- [ ] T004 [P] Add strict protocol/model regressions in `tests/agent-bridge-contract.test.mjs` for
  versioned envelopes, unknown-field rejection, date/range/count/character/256KiB limits,
  allowlisted plan/record/category fields, stable fingerprints, proposal TTL, idempotency keys,
  Google read-only plans, and omission of tokens, blobs, and full account documents.
- [ ] T005 [P] Add core proposal and commit regressions in `tests/agent-bridge-core.test.mjs` for
  create/update/delete of one local plan or record, preview-only zero-write, explicit confirmation,
  stale revision/fingerprint rejection, normalized read-back, one atomic commit, and repeated
  commit returning the same result or `alreadyApplied`.
- [ ] T006 [P] Add account/offline/revocation regressions in `tests/agent-bridge-security.test.mjs`
  for logout, account switch, session-generation changes, revoked/expired pairing, browser
  unavailability, cancellation, offline write refusal, late responses, concurrent stale commits,
  backup/export immutability, and two-account cache isolation.
- [ ] T007 [P] Add MCP handshake/resource/tool contract coverage in `tests/agent-bridge-mcp.test.mjs`
  for stdio initialization, resource discovery, tool schemas, malformed requests, bounded result
  serialization, request-ID replay rules, and stable safe error codes.
- [ ] T008 [P] Add browser/mobile/PWA acceptance scaffolding in `e2e/run-mobile.mjs` for
  pairing/revocation, bounded reads, proposal diff, confirmation/read-back, account replacement,
  offline state, keyboard focus, 44px targets, and 320/390/426/768/1280px isolated-panel checks;
  keep the home quick-record flow and existing Calendar UI outside this scenario.
- [ ] T009 Run the focused tests from `tests/agent-bridge-contract.test.mjs`,
  `tests/agent-bridge-core.test.mjs`, `tests/agent-bridge-security.test.mjs`,
  `tests/agent-bridge-mcp.test.mjs`, and `e2e/run-mobile.mjs`; record expected
  pre-implementation failures in the feature evidence without weakening unrelated snapshots.

## Phase 3: User Story 1 - Agent 读取我的计划和记录 (Priority: P1)

**Goal**: A paired Codex/Claude client can read only the current account's bounded plans, records,
and existing categories, with revision/fingerprint, freshness, truncation, and offline state.

**Independent Test**: With two synthetic accounts and local fixtures, complete MCP handshake and
read resources/tools for one date, a range of at most seven days, and categories; verify allowlisted
fields, account isolation, limits, offline labeling, and safe rejection of invalid requests.

- [x] T010 [P] [US1] Implement versioned read/envelope schemas, field allowlists, request limits,
  stable target fingerprints, and safe serialization in `src/modules/agent-bridge/mcp/schema.mjs`.
- [x] T011 [P] [US1] Implement bounded account-scoped plan/record/category snapshot projection by
  reusing `normalizeState`, `normalizePlanBlock`, and existing account ownership rules in
  `src/modules/agent-bridge/mcp/read-snapshot.mjs`; exclude attachment blobs, URLs, Google private
  fields, credentials, and unrelated document fields.
- [ ] T012 [US1] Implement transient loopback request/result queue with pairing-token checks,
  request-size limits, 30-minute inactivity expiry, cancellation, and no product persistence in
  `src/infrastructure/mcp/bridge-queue.mjs`.
- [ ] T013 [US1] Implement standard MCP stdio initialization, resources (`lognote://categories`,
  `lognote://plans`, `lognote://records`) and read tools in `src/infrastructure/mcp/server.mjs`, plus
  the loopback-only request/result handlers in `src/app/api/mcp/route.js`; forward only validated
  envelopes to the loopback queue and never read Supabase directly.
- [ ] T014 [US1] Implement the local MCP entrypoint and non-secret configuration validation in
  `scripts/log-note-mcp.mjs`, including loopback-only URL checks and redacted diagnostics.
- [ ] T015 [US1] Add the browser-side Agent Bridge pairing/request pump in
  `src/app/settings/_components/agent-bridge/agent-bridge-provider.js`, binding every request to
  the current authenticated account/session generation and returning local snapshots with explicit
  `offline`/`updatedAt`/`truncated` metadata.
- [ ] T016 [US1] Add the isolated settings surface in
  `src/app/settings/_components/agent-bridge/agent-bridge-panel.js` and
  `src/app/settings/_components/agent-bridge/agent-bridge-panel.css`, mount it only through
  `src/app/settings/settings-page.js`, and provide one-time pairing display, expiry, revoke,
  connection state, and keyboard-accessible status; do not add a homepage control or quick-record
  step.
- [ ] T017 [US1] Add the read-only semantic Skill in `.agents/skills/log-note-agent/SKILL.md` and update
  `docs/2026-09-05-Agent计划记录日历三能力拆解.md` with the verified plan-versus-record meaning,
  bounded-read boundary, current-account language, and prohibition on hidden writes or credential
  handling; leave client-specific startup/configuration details to T032.
- [ ] T018 [US1] Run `tests/agent-bridge-contract.test.mjs`, `tests/agent-bridge-mcp.test.mjs`,
  `tests/agent-bridge-security.test.mjs`, and `e2e/run-mobile.mjs` for the read journey;
  verify two-account isolation, offline labels, response caps, and no changes to backups or the
  existing home flow before moving to User Story 2.

## Phase 4: User Story 2 - Agent 提出并确认修改 (Priority: P1)

**Goal**: A user can review and explicitly confirm one plan or record create/update/delete proposal;
  the browser re-reads current state, commits once through `commitData`, and returns read-back proof.

**Independent Test**: For local plans and records, verify preview-only state stability, exact before/
after diff, explicit confirmation, normalized read-back, stale/expired/invalid zero-write, Google
read-only rejection, and duplicate-commit idempotency.

- [x] T019 [P] [US2] Implement normalized single-target proposal schemas and lifecycle state
  transitions (`proposed`, `confirmed`, `applied`, `cancelled`, `expired`, `rejected`, `conflict`)
  in `src/modules/agent-bridge/mcp/change-proposal.mjs`; bind request ID, target, fingerprint,
  expected revision, TTL, and `preview-required`.
- [x] T020 [P] [US2] Implement plan/record allowlist validation and diff construction in
  `src/modules/agent-bridge/mcp/change-validation.mjs`; reuse existing category IDs, reject Google
  source writes and attachments, preserve raw record content unless explicitly included, and keep
  the existing `entries.date/time` schema without `endTime`.
- [ ] T021 [US2] Implement `propose_plan_change` and `propose_record_change` dispatch in
  `src/infrastructure/mcp/server.mjs` and `src/infrastructure/mcp/bridge-queue.mjs`; prove proposal
  creation has zero writes to local state, cloud state, backups, Google, and ordinary drafts.
- [ ] T022 [US2] Implement the proposal review/confirm/reject UI in
  `src/app/settings/_components/agent-bridge/agent-bridge-proposal.js` and
  `src/app/settings/_components/agent-bridge/agent-bridge-proposal.css`, showing target, date,
  time, category, before/after diff, expiry, and explicit confirmation without changing quick-record
  geometry.
- [ ] T023 [US2] Implement browser-side commit re-read, account/target/fingerprint/revision/TTL/
  category checks, one normalized `commitData` call, and read-back response in
  `src/app/settings/_components/agent-bridge/agent-bridge-commit.js`; ensure all failures are
  zero-write and repeated proposal IDs are idempotent.
- [ ] T024 [US2] Wire `commit_change` to the browser commit adapter in
  `src/infrastructure/mcp/server.mjs` and `src/infrastructure/mcp/bridge-queue.mjs`, returning
  actual revision/fingerprint and a bounded read-back object only after persistence evidence exists.
- [ ] T025 [US2] Expand `.agents/skills/log-note-agent/SKILL.md` with the required read → propose → show
  exact diff → ask confirmation → commit → read-back sequence, plan/record semantic distinction,
  existing-category rule, and safe wording for conflict/offline/unsaved states.
- [ ] T026 [US2] Run `tests/agent-bridge-core.test.mjs`, `tests/agent-bridge-contract.test.mjs`,
  and `e2e/run-mobile.mjs` for local plan and record create/update/delete; compare state and
  backup bytes before confirmation, verify read-back after confirmation, and verify Google-origin
  plans remain read-only.

## Phase 5: User Story 3 - 外部 Agent 不破坏 Log Note 的账户和离线边界 (Priority: P1)

**Goal**: Pairing and pending operations become unusable across account/session changes, revocation,
  browser loss, cancellation, offline conditions, and stale concurrent writes without harming normal
  authenticated offline CRUD.

**Independent Test**: Pair account A, create pending reads/proposals, then logout/switch to account B,
  revoke/close/offline the browser, and race two commits; every old operation is rejected or invalid,
  account B remains isolated, and manual offline recording still works.

- [ ] T027 [US3] Implement pairing lifecycle, session-generation binding, revoke/expire transitions,
  late-response invalidation, and in-memory secret cleanup in
  `src/infrastructure/mcp/pairing-session.mjs` and `src/app/settings/_components/agent-bridge/agent-bridge-provider.js`.
- [ ] T028 [US3] Add browser lifecycle and account replacement handling in
  `src/app/settings/_components/agent-bridge/agent-bridge-panel.js` and
  `src/app/settings/_components/agent-bridge/agent-bridge-commit.js`, ensuring refresh, logout,
  account switch, closed surface, and cancelled request cannot write to a new account.
- [ ] T029 [US3] Add explicit safe error codes and redacted bridge logging in
  `src/infrastructure/mcp/errors.mjs` and `src/infrastructure/mcp/bridge-queue.mjs`; omit content,
  titles when unnecessary, pairing secrets, tokens, user IDs, and service keys from diagnostics.
- [ ] T030 [US3] Add focused account/offline/PWA/browser regressions in
  `tests/agent-bridge-security.test.mjs` and `e2e/run-mobile.mjs` covering revocation,
  account switch, browser close, network loss, stale race, no false cloud-saved claim, existing
  offline manual CRUD, and unchanged JSON/Markdown/attachment backup behavior.
- [ ] T031 [US3] Verify the isolated Agent Bridge panel meets the existing responsive and accessibility
  contracts in `src/app/settings/_components/agent-bridge/agent-bridge-panel.css`, including 44px
  targets, keyboard focus, reduced motion, no new page inset, and no changed home/Plan alignment
  axis; run the relevant design assertions in `e2e/run-mobile.mjs`.

## Final Phase: Integration, Evidence, and Return

- [ ] T032 [P] Add the verified Codex stdio configuration path, Claude invocation notes, start/pair/
  revoke/restart/troubleshooting instructions, and explicit confirmation language to
  `docs/2026-09-05-Agent计划记录日历三能力拆解.md`; do not document unverified production OAuth,
  remote endpoints, or millisecond-level realtime behavior.
- [ ] T033 [P] Add only the approved MCP SDK and `log-note:mcp` script in `package.json` and
  `package-lock.json`; confirm no service-key, Google-token, database, migration, or unrelated
  dependency is introduced.
- [ ] T034 Run all focused Agent Bridge tests and inspect failures for false positives, stale
  snapshots, leaked secrets, unbounded payloads, or accidental writes; retain sanitized evidence in
  `specs/REQ-20260905-01-agent-mcp-bridge/quickstart.md` and the board evidence field.
- [ ] T035 Run `npm run design:check` and complete responsive mobile/visual review for the isolated
  settings panel; verify the home quick-record and existing Calendar/Plan geometry is unchanged.
- [ ] T036 Execute one real Codex or Claude client against a synthetic test account using the shipped
  stdio configuration: handshake, discover, read, propose, obtain explicit confirmation, commit one
  local target, read it back, then record sanitized evidence plus account-switch/revocation results
  in `specs/REQ-20260905-01-agent-mcp-bridge/quickstart.md` and `PROJECT_BOARD.md`; do not claim success when
  credentials, browser pairing, or client discovery is unavailable.
- [ ] T037 Run `npm run check` and `git diff --check`; include the exact output and any real-client or
  deployment evidence still missing in `PROJECT_BOARD.md` without marking `LN-084` Accepted.
- [ ] T038 Review the final diff against `spec.md`, `plan.md`, `data-model.md`,
  `contracts/mcp-contract.md`, Constitution, declared write set, and unrelated dirty changes;
  return the feature for independent controller verification, not acceptance.

## Dependencies and Execution Order

- T001–T003 reconcile product truth and write ownership before application edits.
- T004–T009 define failing contract, browser, and safety coverage before implementation.
- User Story 1 (T010–T018) establishes transport and bounded reads; User Story 2 (T019–T026)
  depends on its pairing/read adapter; User Story 3 (T027–T031) hardens both flows.
- T032–T038 integrate documentation, dependency checks, design review, real-client evidence, full quality gate, and
  independent acceptance evidence. LN-085 cannot start until `LN-084` is independently Accepted.
- LN-086 remains a separate work package and must not share Google Calendar write or token paths with
  this feature.

## Parallel Opportunities

- After T003, T004–T008 can be prepared in separate files, but the main checkout still has one writer.
- During User Story 1, T010–T011, T012–T014, and T016–T017 are file-isolated groups after their
  shared contracts are agreed; integrate serially before T018.
- During User Story 2, T019–T020 and T022 can be prepared independently of the server wiring, then
  T021, T023, and T024 integrate through the single browser commit path.
- During the final phase, T032–T033 are independent documentation/dependency checks; T034–T038 remain
  sequential because each consumes the previous validation evidence.

## Implementation Strategy

1. Deliver the smallest P1 vertical slice: pair one browser session and read bounded plans/records.
2. Add proposal/confirmation/read-back for one local target, then test stale and duplicate behavior.
3. Harden account, offline, revocation, browser lifecycle, and backup invariants.
4. Run the full quality gate and record real Codex/Claude evidence separately; do not infer acceptance
   from local tests or from Mastra Studio.
5. Keep LN-085 (Agent plan/record authoring semantics) and LN-086 (Calendar near-realtime sync) in
   their own sessions and specs; neither may silently expand this bridge.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- New migrations, service-role access, public MCP endpoints, broad batch writes, record `endTime`,
  homepage controls, required recording fields, Google token exposure, or parallel persistence paths.
