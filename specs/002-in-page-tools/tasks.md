---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: In-Page Settings Tool

**Board Item**: `LN-075 Rework 9`
**Input**: Feature artifacts from `/specs/002-in-page-tools/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-075 Rework 9` against `PROJECT_BOARD.md`, `product.md`, the dirty working tree, and current visual evidence
- [x] T002 Confirm the write set and exclusions in `specs/002-in-page-tools/plan.md` before editing application files

## Phase 2: Failing Regression and Contract Coverage

- [x] T003 [P] Add home Settings in-page journey assertions for URL stability, mounted diary context, mutual exclusion, focus restoration, scroll restoration, and responsive overflow in `e2e/run-mobile.mjs`
- [x] T004 Run the focused journey before implementation and record the expected failure without changing unrelated evidence

## Superseded First Pass: Viewport-Wide Settings Layer

**Goal**: Historical implementation evidence for the first interpretation, superseded by the user's left-workspace correction below.

**Independent Test**: Open Settings from `/`, switch panels, close through all supported paths, and verify URL, date, mode, scroll, focus, route compatibility, and no-overflow contracts.

- [x] T005 [US1] Add embedded/local-panel mode and explicit close behavior to `src/app/settings/settings-page.js` while preserving standalone hash navigation
- [x] T006 [US1] Wire Settings as a button, add mutually exclusive settings state, and mount the embedded layer in `src/app/home-header.js` and `src/app/page.js`
- [x] T007 [US1] Add continuous-paper embedded surface and responsive detail/index styling in `src/app/settings-dialog.css`
- [x] T008 [US1] Verify existing six-panel actions, direct `/settings` hashes, keyboard trap, reduced motion, and account/offline boundaries in `e2e/run-mobile.mjs`

## Final Phase: Integration, Evidence, and Return

- [x] T009 [P] Capture focused settings-layer evidence at 390px and 1280px under `output/playwright/`
- [x] T010 Run `npm run design:check` and complete responsive mobile/visual review
- [x] T011 Run `npm run check` and `git diff --check`
- [x] T012 Review the final diff against `specs/002-in-page-tools/`, Constitution, and LN-075 acceptance criteria; preserve unrelated dirty changes
- [x] T013 Record returned evidence and remaining subjective visual review in `PROJECT_BOARD.md`; do not mark Accepted automatically

## Rework Phase: Correct Tools to the Left Workspace

**Goal**: Replace the rejected viewport-wide Search/Settings surfaces with Calendar-like left-workspace tools while keeping the right side unchanged.

**Independent Test**: At every supported width, measure all persistent right-side controls before and after opening Search and Settings; each stays within 1px, tools remain left of the binding axis, no backdrop exists, and URL/date/mode/scroll/focus contracts pass.

- [x] T014 Add left-boundary, no-backdrop, persistent-right-geometry, toggle-close, and Escape assertions for Search and Settings in `e2e/run-mobile.mjs`
- [x] T015 [US1] Expose active Search and Settings states on the rail and make their controls toggle workspace modes in `src/app/home-header.js`
- [x] T016 [US1] Keep the diary mounted and inert under a left-only tool workspace while preserving the directory and bottom actions in `src/app/page.js`
- [x] T017 [US1] Convert Search from `DialogSurface` to a left-workspace region without changing query/result behavior in `src/app/search-dialog.js` and `src/app/search-dialog.css`
- [x] T018 [US1] Add a headerless embedded workspace presentation while preserving standalone route and mobile detail-back behavior in `src/app/settings/settings-page.js`
- [x] T019 [US1] Constrain Search and Settings to the paper-continuous left workspace at all supported widths in `src/app/home-timeline.css` and `src/app/settings-dialog.css`
- [x] T020 Update PWA install-prompt propagation to use the non-modal Settings workspace in `e2e/run-pwa.mjs`
- [x] T021 Capture corrected 390px and 1280px Search/Settings evidence under `output/playwright/`
- [ ] T022 Run full `npm run check`; current design check, unit suite, and production build pass, while the existing lifecycle test has an environment EPERM and the legacy browser suite still contains unrelated dev-overlay/date-picker failures
- [ ] T023 Run `$speckit-analyze` against the corrected artifacts and implementation evidence
- [x] T024 Update `product.md`, `DESIGN.md`, and `PROJECT_BOARD.md` with the corrected left-workspace contract and current evidence

## Dependencies and Execution Order

- Reconciliation blocks all edits.
- Focused assertions precede implementation; evidence and full gates follow implementation.
- User Story 1 is the only story and is independently testable.

## Implementation Strategy

1. Deliver the corrected single P1 left-workspace slice.
2. Validate stable right-side geometry, toggle/focus/scroll, and route compatibility paths.
3. Run the full quality gate and return evidence for independent acceptance.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, worktree merge, new dependencies, migrations, data-model changes, or unrelated cleanup.
