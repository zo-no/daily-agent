---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Right Rail Visual Hierarchy

**Board Item**: `LN-075 Rework 8`
**Input**: Feature artifacts from `/specs/001-rail-hierarchy/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task MUST name exact paths, verification, and any relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-075 Rework 8` against `PROJECT_BOARD.md`, `product.md`, the dirty working tree, and current visual evidence
- [x] T002 Confirm the exact write set in `specs/001-rail-hierarchy/plan.md` and preserve unrelated changes
- [x] T003 [P] Confirm no durable product behavior or data contract change is needed in `product.md`

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define measurable visual hierarchy and responsive safety before styling.

- [x] T004 [P] Add rail group, type-role, spacing, shared-axis, and clearance assertions in `e2e/run-mobile.mjs`
- [x] T005 Run the focused mobile journey at 320/390/426/600/671/700/768/1280px and record the pre-style measurements in `output/playwright/ln-075-unified-rail-*.png`

## Phase 3: User Story 1 - Scan the rail without visual competition (Priority: P1)

**Goal**: Make utilities read as one compact executable group and directory labels read as a stronger but subordinate content index.

**Independent Test**: At 390px, assert no overlap or horizontal overflow, all real controls remain at least 44px, the shared axis remains within 1.5px, utility labels are 14px Sans with underline, and directory labels are 16px Serif without underline.

- [x] T006 [US1] Refine desktop and mobile utility group geometry, typography, spacing, and state contrast in `src/app/home-header.css`
- [x] T007 [US1] Refine mobile directory band, node label typography, and semantic separation from utilities in `src/app/home-timeline.css`
- [x] T008 [US1] Verify existing DOM semantics, focus order, calendar state, long-label clipping, and 44px targets in `src/app/home-header.js`, `src/app/home-domain-rail.js`, and `e2e/run-mobile.mjs`

## Final Phase: Integration, Evidence, and Return

- [x] T009 [P] Refresh only the focused visual evidence under `output/playwright/` for the supported widths
- [x] T010 Run `npm run design:check` and complete responsive mobile/visual review
- [x] T011 Run `npm run check` and `git diff --check`
- [x] T012 Review the final diff against `specs/001-rail-hierarchy/`, the declared write set, Constitution, and LN-075 acceptance criteria; preserve unrelated dirty changes
- [x] T013 Record returned evidence and remaining subjective 390px review in `PROJECT_BOARD.md`; do not mark Accepted automatically

## Dependencies and Execution Order

- Reconciliation and write ownership block every edit.
- Assertions precede CSS changes; focused evidence follows implementation.
- User Story 1 is the only story and is independently testable.
- Full-gate and diff review block return to the controller.

## Implementation Strategy

1. Deliver the single P1 visual slice.
2. Validate geometry and semantics at each responsive width.
3. Run the full quality gate and return evidence for independent acceptance.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- New dependencies, migrations, network data boundaries, homepage controls, required recording
  fields, or broad refactors not admitted by the spec and plan.
