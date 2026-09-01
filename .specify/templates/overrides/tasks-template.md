---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: [FEATURE NAME]

**Board Item**: `[LN-###]`
**Input**: Feature artifacts from `/specs/[###-feature-name]/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task MUST name exact paths, verification, and any relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [ ] T001 Reconcile the board item, active feature, working tree, dependencies, permissions, and
  current validation evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`
- [ ] T002 Confirm the plan's exact write set, exclusions, one-writer ownership, and acceptance
  evidence before editing any application file
- [ ] T003 [P] Add or update durable product-admission wording in `product.md` when behavior or scope
  changes; skip only when the plan proves no product truth changes

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define the user-visible behavior and safety boundary before implementation.

- [ ] T004 [P] Add focused unit/model/contract regression in `[exact tests/*.test.mjs paths]`
- [ ] T005 [P] Add browser/mobile/PWA regression in `[exact e2e path]` for applicable acceptance
  scenarios, failure paths, and responsive boundaries
- [ ] T006 Run the focused tests and record the expected pre-implementation failure without changing
  unrelated snapshots or evidence

## Phase 3: User Story 1 - [Title] (Priority: P1)

**Goal**: [Smallest independently valuable behavior]

**Independent Test**: [Observable journey and safe failure result]

- [ ] T007 [US1] Implement the narrow model/data behavior in `[exact source path]`
- [ ] T008 [US1] Implement the UI/API/integration behavior in `[exact source path]`
- [ ] T009 [US1] Verify raw-note, account, offline, privacy, backup, and rollback invariants with the
  focused tests in `[exact test paths]`

---

[Add one phase for each additional independently testable user story. Tests MUST precede or
accompany its implementation tasks.]

## Final Phase: Integration, Evidence, and Return

- [ ] TXXX [P] Update `README.md`, `docs/`, `DESIGN.md`, or `docs/设计规范/` only where the shipped contract
  changed
- [ ] TXXX Run all focused regression and inspect failure output for false positives or stale
  snapshots
- [ ] TXXX Run `npm run design:check` and complete responsive mobile/visual review for interaction
  changes
- [ ] TXXX Run the complete `npm run check` quality gate and `git diff --check`
- [ ] TXXX Review the final diff against the declared write set, spec, plan, Constitution, and board
  acceptance criteria; preserve all unrelated dirty changes
- [ ] TXXX Record returned evidence and remaining real-environment/manual checks in
  `PROJECT_BOARD.md`; do not mark Accepted without independent controller verification

## Dependencies and Execution Order

- Reconciliation and write ownership block every edit.
- Regression/contract tasks run before their corresponding implementation.
- User stories run in priority order unless the plan proves independent isolated-worktree execution.
- Documentation describes the verified contract, not intended or unverified behavior.
- Full-gate and diff review block return to the controller.

## Implementation Strategy

1. Deliver the smallest P1 vertical slice.
2. Validate it independently, including its safe failure and offline behavior.
3. Add later stories only when each remains independently useful and within the admitted scope.
4. Stop and return to the same task for rework on failure; do not create duplicate board items.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- New dependencies, migrations, network data boundaries, homepage controls, required recording
  fields, or broad refactors not admitted by the spec and plan.
