---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Google Calendar 近实时变化同步

**Requirement**: `REQ-20260905-03`
**Input**: Feature artifacts from `/specs/REQ-20260905-03-google-calendar-realtime/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, contract review, board readiness, deployment/credential decision

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [ ] T001 Reconcile `LN-086` with `PROJECT_BOARD.md`, `product.md`, `ARCHITECTURE.md`, LN-067 evidence, current `git status`, and OAuth/deployment constraints
- [ ] T002 Confirm one-writer ownership, exact Calendar write set, exclusions, and whether push prerequisites are approved before editing any route or storage file
- [ ] T003 [P] Record the final conflict policy and browser-polling definition in `spec.md`, `research.md`, and `PROJECT_BOARD.md` only when owner decisions change the current draft

## Phase 2: Failing Regression and Contract Coverage

- [ ] T004 [P] Add model contract regressions in `tests/google-calendar-realtime-model.test.mjs` for syncToken continuation, pagination, tombstones, 410 rebuild, duplicate/乱序 events, etag conflicts, all-day/cross-day mapping, and metadata normalization
- [ ] T005 [P] Add provider/account regressions in `tests/google-calendar-realtime-provider.test.mjs` for local managed CRUD, account generation, revocation, offline recovery, hidden/visible polling, retries, and concurrent sync serialization
- [ ] T006 [P] Add route contract regressions in `tests/google-calendar-realtime-route.test.mjs` only if webhook/watch deployment is approved; cover unauthenticated, forged/expired channel, duplicate notification, bounded payload, fast 2xx, and token non-disclosure
- [ ] T007 [P] Add focused browser/PWA scenarios in `e2e/run-mobile.mjs` and `e2e/run-pwa.mjs` for ordinary-event read-only, managed-plan sync, conflict/remote-delete status, account switch, revocation, offline recovery, and unchanged quick recording
- [ ] T008 Run the focused tests and record pre-implementation failures without weakening existing Calendar, mobile, or PWA assertions

## Phase 3: User Story 1 - 日历变化及时进入 Log Note (Priority: P1)

**Goal**: Use a bounded incremental cursor and shared reconciliation to reflect remote changes safely.

**Independent Test**: Synthetic Calendar changes, tombstones, duplicate/乱序 notifications, invalid cursor, and offline/foreground recovery produce correct cache and visible status with no cross-account writes.

- [ ] T009 [US1] Extend the canonical Calendar model in `src/lib/google-calendar-model.mjs` with versioned sync metadata, tombstone, conflict, and bounded cache normalization
- [ ] T010 [US1] Extend `src/app/google-calendar-client.js` with incremental list/showDeleted behavior, pagination, cursor-expiry classification, and bounded error mapping without exposing tokens
- [ ] T011 [US1] Extend `src/app/google-calendar-provider.js` with generation-bound incremental reconciliation, visible/hidden polling, immediate foreground/network recovery, retry state, and zero-write account guards
- [ ] T012 [US1] Verify User Story 1 against `tests/google-calendar-realtime-model.test.mjs`, `tests/google-calendar-realtime-provider.test.mjs`, and existing Calendar regressions

## Phase 4: User Story 2 - Log Note 计划可靠地同步为受管事件 (Priority: P1)

**Goal**: Preserve one-to-one local-plan/managed-event identity and safe local-first recovery.

**Independent Test**: Local plan create/update/delete maps to one managed event ID, retries are idempotent, known etag/precondition is respected, and offline edits recover after incremental pull.

- [ ] T013 [US2] Replace or extend the existing managed-event write path in `src/app/google-calendar-provider.js` and `src/app/google-calendar-client.js` to use known etag/precondition and return normalized read-back references
- [ ] T014 [US2] Preserve plan ownership and external reference compatibility in `src/lib/plan-model.mjs` only where required by the approved metadata contract; do not add record fields or a second writer
- [ ] T015 [US2] Add Settings/Calendar status and recovery presentation in `src/app/settings/settings-page.js`, `src/app/settings/settings.css`, and `src/app/calendar-view.js` using existing alignment axes and 44px controls
- [ ] T016 [US2] Verify User Story 2 in `tests/google-calendar-realtime-provider.test.mjs`, existing plan/calendar tests, and focused mobile/PWA journeys

## Phase 5: User Story 3 - 冲突、撤权和账号切换可恢复 (Priority: P1)

**Goal**: Make external mutation and authorization lifecycle explicit, recoverable, and account isolated.

**Independent Test**: Etag mismatch, remote deletion, 401/403/invalid_grant, stale callback, logout, account switch, and service restart preserve local data and expose the right state.

- [ ] T017 [US3] Implement conflict, remote-delete, revoke, and account-generation state transitions in the canonical Calendar provider/model without deleting local plans or records
- [ ] T018 [US3] Add webhook/watch/sync handlers under `src/app/api/google-calendar/**` only after deployment approval; otherwise document the browser-poll fallback and keep routes absent
- [ ] T019 [US3] If server authorization is approved, add isolated Calendar sync metadata storage/RLS and secret lifecycle tests; otherwise keep token memory-only and prove no persistence path was added
- [ ] T020 [US3] Verify User Story 3 in provider/route/security regressions and browser/PWA account, revocation, conflict, and offline scenarios

## Final Phase: Integration, Evidence, and Return

- [ ] T021 [P] Update `specs/REQ-20260905-03-google-calendar-realtime/quickstart.md`, contract docs, and `README.md` only with verified behavior; never document unverified production push or OAuth
- [ ] T022 Run all focused regressions and inspect duplicate/late/expired event output for false positives or stale fixtures
- [ ] T023 Run `npm run design:check` for interaction changes, complete responsive mobile and accessibility review, and preserve existing quick-record geometry
- [ ] T024 Run `npm run check` and `git diff --check`; report the first failure precisely and classify unrelated dirty-test failures
- [ ] T025 Review the final diff against `spec.md`, `plan.md`, Constitution, declared write set, and unrelated user changes; return evidence without marking `LN-086` Accepted
- [ ] T026 在 `PROJECT_BOARD.md` 记录聚焦测试数量、延迟口径、脱敏的真实 OAuth/部署证据、未解决的合规/部署决策和回滚状态

## Dependencies and Execution Order

- T001–T003 block all source changes; T004–T008 establish the contract and expected failures.
- User Story 1 establishes the incremental read/reconciliation state used by Stories 2 and 3.
- User Story 2 extends the existing managed write path after the incremental read is stable.
- User Story 3 hardens conflict and authorization lifecycle; webhook tasks are conditional and cannot block the polling baseline.
- LN-084 and LN-085 remain separate; this package must not add MCP actions or Agent writes.

## Parallel Opportunities

- T004 and T005 can be authored in different test files; T006 is independent but gated by deployment approval.
- T009/T010 can be prepared in separate modules after T008, but integration remains serialized in one checkout.
- T021 documentation updates can run after behavior verification; no writer may edit overlapping source files concurrently.

## Implementation Strategy

1. Deliver the syncToken + bounded polling baseline and its model/provider safety tests.
2. Preserve stable managed event identity and add etag-aware local-plan writes.
3. Add conflict/revocation/account recovery and only then consider approved push routes.
4. Validate real OAuth and deployment evidence separately; keep `server-push` disabled when prerequisites are absent.
