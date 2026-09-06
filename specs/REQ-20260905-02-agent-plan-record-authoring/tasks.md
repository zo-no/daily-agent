---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Agent 计划与记录编写闭环

**Requirement**: `REQ-20260905-02`
**Input**: Feature artifacts from `/specs/REQ-20260905-02-agent-plan-record-authoring/`
**Prerequisites**: LN-084 independently Accepted, `spec.md`, `plan.md`, and owner permission

## Phase 1: Reconcile and Guard the Work

- [ ] T001 Reconcile `LN-085` with `PROJECT_BOARD.md`, `product.md`, `spec.md`, `plan.md`, LN-084
  acceptance evidence, current `git status`, and the real-client dependency in `PROJECT_BOARD.md`
- [ ] T002 Confirm the one-writer write set and exclusions in `plan.md`; keep `entries` interval schema,
  Google Calendar, transport, and unrelated dirty files out of scope
- [ ] T003 [P] Add or update durable product-admission wording only if the shipped semantics differ from
  the current `product.md` entry; record the decision in `product.md`

## Phase 2: Contract and Regression Coverage

- [x] T004 [P] Add plan authoring regressions in `tests/agent-plan-record-plan.test.mjs` for local CRUD,
  Google read-only, time-block validation, stale revision, expiry, and read-back
- [x] T005 [P] Add record authoring regressions in `tests/agent-plan-record-record.test.mjs` for CRUD,
  existing-category allowlist, exact Markdown/Unicode content, metadata preservation, and attachment
  reference immutability
- [x] T006 [P] Add account/offline/idempotency regressions in `tests/agent-plan-record-security.test.mjs`
  for confirmation, account replacement, revocation, cancellation, stale races, and backup immutability
- [ ] T007 [P] Add focused browser/PWA scenarios in `e2e/run-mobile.mjs` for proposal diff, confirmation,
  read-back, focus, offline status, account replacement, and unchanged quick recording
- [ ] T008 Run the focused tests and record expected failures without weakening unrelated regressions

## Phase 3: User Story 1 - Read Planning and Recording Context (Priority: P1)

- [ ] T009 [US1] Reuse and extend the bounded snapshot/allowlist contract in
  `src/modules/agent-bridge/mcp/read-snapshot.mjs` and `src/shared/agent-bridge/protocol.mjs` only
  where LN-085 fields are missing
- [ ] T010 [US1] Verify read journeys and category/source semantics in
  `tests/agent-plan-record-plan.test.mjs` and `tests/agent-plan-record-record.test.mjs`

## Phase 4: User Story 2 - Plan Authoring (Priority: P1)

- [ ] T011 [US2] Extend the canonical plan validation/proposal path in
  `src/modules/agent-bridge/mcp/change-validation.mjs` and `browser-controller.mjs` for explicit
  local plan create/update/delete and normalized read-back
- [ ] T012 [US2] Verify plan proposal/confirm/commit behavior and isolated settings presentation in
  `tests/agent-plan-record-plan.test.mjs` and `e2e/run-mobile.mjs`

## Phase 5: User Story 3 - Record Authoring (Priority: P1)

- [ ] T013 [US3] Extend the canonical record validation/proposal path in
  `src/modules/agent-bridge/mcp/change-validation.mjs` and `browser-controller.mjs` for explicit
  category-bound CRUD without `endTime` or implicit metadata changes
- [ ] T014 [US3] Verify record raw-text, Markdown, Unicode, template, field, tag, attachment-reference,
  and read-back behavior in `tests/agent-plan-record-record.test.mjs` and `e2e/run-mobile.mjs`

## Phase 6: User Story 4 - Account and Recovery Safety (Priority: P1)

- [ ] T015 [US4] Harden proposal/session invalidation and idempotent commit handling in the existing
  LN-084 browser controller and provider without adding a second writer
- [ ] T016 [US4] Verify account switch, logout, revocation, browser loss, offline refusal, stale races,
  backup immutability, and unchanged manual CRUD in `tests/agent-plan-record-security.test.mjs`

## Final Phase: Evidence and Return

- [ ] T017 [P] Update `specs/REQ-20260905-02-agent-plan-record-authoring/quickstart.md` with verified commands and
  redacted client evidence; do not document unverified cloud persistence
- [ ] T018 Run focused tests, `npm run design:check` when UI changes, `npm run check`, and
  `git diff --check`
- [ ] T019 Review the final diff against `spec.md`, `plan.md`, the declared write set, and unrelated
  dirty changes; return evidence for independent controller acceptance

## Dependencies and Execution Order

- T001–T003 block all edits; T004–T008 establish regressions.
- US1 establishes the read contract; US2 and US3 depend on it and LN-084; US4 hardens all three.
- LN-086 remains independent and must not be folded into these tasks.

## Implementation Strategy

Deliver read context first, then one-plan CRUD, then one-record CRUD, then lifecycle safety. Do not
introduce record intervals or batch writes while this package is in progress.
