---
description: "Dependency-ordered tasks for personal OKR period alignment review"
---

# Tasks: personal OKR period alignment review

**Requirement**: `REQ-20260906-03`
**Inputs**: `spec.md`, `plan.md`, `data-model.md`, `contracts/alignment-review.md`, `quickstart.md`
**Status**: Design candidate. Owner discussion and board admission block implementation.

Every task names a concrete path and verification. Tests are mandatory for implementation. A checkbox is execution evidence only; `PROJECT_BOARD.md` remains the status source.

## Phase 1 — Setup and gate

- [ ] T001 Reconcile the feature package, current branch, dirty tree, existing Goals implementation, and board mapping in `specs/REQ-20260906-03-okr-progress-review/` and `PROJECT_BOARD.md`; do not create a second board item.
- [ ] T002 Record owner decisions for optional KR, 366-day review limit, over-limit behavior, provider/retention policy, and the one-button disclosure in `specs/REQ-20260906-03-okr-progress-review/spec.md`; keep implementation blocked until the core-chain gate is confirmed.
- [ ] T003 Confirm the one-writer Change Contract and exact application write set in `specs/REQ-20260906-03-okr-progress-review/plan.md`; exclude quick-record persistence, migrations, new stores, deployment, commits, and board changes.

## Phase 2 — Contract-first foundation

- [ ] T004 [P] Add deterministic period snapshot fixtures and model regressions in `tests/okr-progress-model.test.mjs`; cover inclusive dates, future plans, invalid dates, legacy associations not excluding sources, stable ordering, 366-day bound, 100-plan/200-record/360-character limits, and fingerprints.
- [ ] T005 [P] Add alignment request/response contract fixtures in `tests/okr-progress-route.test.mjs`; cover disclosure fields, source allowlist, strict enums, citations, coverage, unknown fields, duplicate/unbound sources, body/timeout limits, and zero writes.
- [ ] T006 [P] Add the one-button, no-source-picker, no-quick-record-friction journeys to `e2e/run-mobile.mjs`; cover no-data, plan-only, record-only, irrelevant/conflicting sources, over-limit state, cancellation, stale response, keyboard focus, and five widths.

## Phase 3 — User Story 1: personal Goal and KR (P1)

**Covers**: FR-001, FR-002, SC-001.

**Independent test**: Existing Goal/KR editor accepts a goal with or without KR and old backups remain readable; no new required quick-record decision appears.

- [ ] T007 [US1] Reuse and, only where failing tests require it, extend canonical Goal/KR normalization in `src/lib/goal-model.mjs`; preserve existing fields, old payloads, legacy extra KRs, and numeric invalid-value semantics; do not add work/life partitions or new persistence fields.
- [ ] T008 [US1] Update the existing Goal editor/index in `src/app/_components/goals-workspace.js`, `src/app/goals/goals-page.js`, and `src/app/goals/goals.css` only to expose the agreed natural-language Goal/period/KR behavior; verify 44px targets, focus, English/Chinese copy, and no required capture step.
- [ ] T009 [US1] Add focused Goal/backup compatibility assertions in `tests/goal-model.test.mjs` and the existing backup test paths; verify no silent truncation or raw-field loss.

## Phase 4 — User Story 2: automatic period snapshot (P1)

**Covers**: FR-003, FR-004, FR-005, FR-010, SC-002.

**Independent test**: A Goal detail snapshot includes only current-account local plans and business-date records in the valid period, regardless of old association fields; sources outside the period remain unchanged.

- [ ] T010 [US2] Implement the deterministic period snapshot and local facts in `src/modules/goals/okr-progress/model.mjs`; reuse the existing plan-record review bounds and define future plan/record, invalid-date, empty, over-limit, ordering, and fingerprint behavior.
- [ ] T011 [US2] Extend the Goal detail facts/view model in `src/app/goals/goal-detail-page.js` to show period, checked-at date, plan/record counts, omitted state, and excerpt policy before any provider request; do not add a source picker or write path.
- [ ] T012 [US2] Remove or isolate the existing per-record association control from the current Goal alignment review surface in `src/app/goals/goal-detail-page.js` and `src/app/goals/goal-detail.css` without deleting persisted legacy associations; verify raw content and `commitData` behavior remain unchanged elsewhere.
- [ ] T013 [US2] Add plan/record automatic-snapshot regression coverage in `tests/okr-progress-model.test.mjs`, `tests/plan-record-review.test.mjs`, and relevant account/offline fixtures; verify no Google events, attachments, other-account data, or period-external sources enter the snapshot.

## Phase 5 — User Story 3: one-button alignment review (P1)

**Covers**: FR-006, FR-007, FR-008, SC-003.

**Independent test**: With a disclosed valid bounded snapshot, one click sends one request, renders cited multi-state output, and persists nothing.

- [ ] T014 [US3] Define the runtime-neutral alignment schema and deterministic normalizer in `src/modules/goals/okr-progress/model.mjs` and `src/modules/goals/okr-progress/server.mjs`; validate request binding, source allowlist, state enums, confidence, coverage, and complete-response rejection.
- [ ] T015 [US3] Reuse existing authenticated same-origin AI infrastructure in the canonical goals route `src/app/api/goals/alignment/route.js`; enforce Node runtime, body/rate/timeout limits, one model call, no retry, no raw-content logs, and route-level zero writes.
- [ ] T016 [US3] Add the single `检查目标对齐` action, pending/safe/error states, result hierarchy, source citations, and stale cancellation in `src/app/goals/goal-detail-page.js` and `src/app/goals/goal-detail.css`; preserve existing page/content/action axes and do not add a chat panel or acceptance-association flow.
- [ ] T017 [US3] Add focused route/model/browser coverage in `tests/okr-progress-route.test.mjs` and `e2e/run-mobile.mjs`; verify `toward`, `activity-only`, `drifting`, `blocked`, `insufficient`, plan-only, missing-evidence, conflict, offline, account-change, invalid-output, and late-response paths.

## Phase 6 — User Story 4: safe failure and removal behavior (P1)

**Independent test**: Invalid, cancelled, stale, offline, over-limit and account-change review paths explain the state and preserve every persisted value.

**Covers**: FR-009, FR-010, FR-011, SC-004.

- [ ] T018 [US4] Add failure-path browser and persistence regression coverage in `e2e/run-mobile.mjs`, account/offline fixtures, and backup tests; verify zero writes, old-data compatibility, keyboard/reduced-motion behavior, and safe removal.

## Phase 7 — Polish and independent return

- [ ] T019 [P] Update `specs/REQ-20260906-03-okr-progress-review/quickstart.md`, `research.md`, and `contracts/alignment-review.md` only after the implementation contract is verified; keep research facts, decisions, and open evidence distinct.
- [ ] T020 Run focused Goal, snapshot, route, browser, offline/account, backup, and raw-note regressions; record the first relevant failure and distinguish pre-existing dirty-tree failures.
- [ ] T021 Run `npm run design:check`, responsive review, PWA/authenticated-offline checks, and `git diff --check`; store evidence in the feature package without claiming real-provider success from synthetic fixtures.
- [ ] T022 Run `npm run check`, compare the result against `spec.md`, `plan.md`, the Constitution and the board, and return evidence to the controller. Do not commit, push, deploy, merge, mark Accepted, or modify OKRs.

## Dependencies and execution order

- T001–T003 block all implementation until the core-chain discussion gate is confirmed.
- T004–T006 are contract-first regressions and may be prepared independently in isolated files.
- T007–T009 precede T010–T013; T010 is the only source of period facts.
- T014–T017 depend on the local snapshot contract and existing AI boundary.
- T018 runs after the review contract; T019–T022 run after implementation and focused fixes.

## MVP recommendation

The smallest useful vertical slice is T004–T013: a personal Goal period that automatically explains local plan/record coverage without AI. Add T014–T017 only after the local view is understandable and the owner approves the disclosed provider boundary.

## Explicitly prohibited in this task package

No autonomous AI writes, background monitoring, new persistence writer, source picker, manual relationship editor, enterprise OKR workflow, external connector, commit, push, deployment, deletion, reset, history rewrite, board/OKR change, or worktree merge.
