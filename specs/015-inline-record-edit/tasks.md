---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Inline Record Editing

**Board Item**: `LN-080`
**Input**: Feature artifacts from `/specs/015-inline-record-edit/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-080`, `specs/015-inline-record-edit/`, the dirty tree, dependencies, permissions, and current evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`
- [x] T002 Confirm the write set and exclusions in `specs/015-inline-record-edit/plan.md`; preserve existing LN-079, Agent extraction, package, deployment, and generated-evidence changes
- [x] T003 [P] Add the durable LN-080 admission and removal boundary to `product.md` without changing other feature decisions

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Lock time-only mutation, row-local interaction, zero-write paths, and responsive/accessibility boundaries before implementation.

- [x] T004 [P] Add failing pure time validation/merge coverage in `tests/record-inline-edit-model.test.mjs`, including exact preservation of all non-time fields
- [x] T005 [P] Add a focused `LN-080 inline record editing` journey in `e2e/run-mobile.mjs` for no existing-record modal, text Done/Cancel/Escape, time-only save/cancel/outside/focus/order, one active surface, structured/details/attachment/delete preservation, Agent stop, both record views, localization, 44px targets, and 320/390/426/768/1280px geometry
- [x] T006 Run the focused Node and browser filters and record the expected pre-implementation failures without changing unrelated snapshots or `output/playwright/**`

## Phase 3: User Story 1 - Edit record text in its row (Priority: P1)

**Goal**: Existing ordinary record text and structured fields edit in the source row with explicit Done/Cancel and no modal.

**Independent Test**: In Time and Category views, activate one content control, save an exact edit, then repeat with Cancel/Escape and prove zero write while adjacent records remain visible.

- [x] T007 [US1] Add inline presentation support to the canonical form in `src/app/record-composer.js` and scoped open-paper geometry in `src/app/entry-composer.css`, preserving Hero, Markdown, structured validation, details, attachment staging, delete, and the new-record modal
- [x] T008 [US1] Split ordinary rows into semantic time/content controls and mount the active inline form in both views in `src/app/home-record-views.js` and `src/app/home-timeline.css`, preserving `data-entry-id`, Agent anchoring, Markdown/tags/attachments, separators, and no nested interactive content
- [x] T009 [US1] Reconcile draft mutual exclusion, Agent stop, Escape/cancel/focus, search/deep-link selection, new-record modal isolation, and context invalidation in `src/app/page.js`
- [x] T010 [US1] Run the focused inline text/structured/Markdown/Hero/details/attachment/delete cases in `e2e/run-mobile.mjs` and verify exact save plus zero-write discard paths

## Phase 4: User Story 2 - Fine-tune a record time in context (Priority: P1)

**Goal**: The leading time opens one narrow anchored editor that can change only `time`.

**Independent Test**: Save a valid time and observe reordering with all other fields exact; cancel, Escape, outside activation, invalid input, or context replacement and observe no write plus trigger-focus return.

- [x] T011 [US2] Implement strict local-time validation and immutable time-only merge in `src/lib/record-inline-edit-model.mjs`
- [x] T012 [US2] Implement the non-modal anchored time surface and focus/dismissal contract in `src/app/record-time-editor.js`
- [x] T013 [US2] Connect time-surface state and the canonical `commitData` boundary in `src/app/page.js`, and render it from both row variants in `src/app/home-record-views.js`
- [x] T014 [US2] Add localized time-adjustment names/errors in `src/lib/i18n.mjs` and contained time-surface geometry in `src/app/home-timeline.css`
- [x] T015 [US2] Run `tests/record-inline-edit-model.test.mjs` and focused time browser cases in `e2e/run-mobile.mjs`; verify time-only mutation, ordering, zero-write dismissal, and focus restoration

## Phase 5: User Story 3 - Reach advanced record details without a modal (Priority: P2)

**Goal**: Existing category, tags, attachments, template/format controls, and confirmed delete remain progressively reachable inside the active row.

**Independent Test**: Expand More inside one row and exercise each existing detail, staged attachment, and delete confirmation without a modal or regression to account/offline/backup semantics.

- [x] T016 [US3] Refine inline details hierarchy and time-field exclusion in `src/app/record-composer.js` and `src/app/entry-composer.css` while preserving the same callbacks and validation
- [x] T017 [US3] Run the focused category/tag/attachment/template/format/delete regression in `e2e/run-mobile.mjs` and confirm Cancel discards staged attachment changes

## Final Phase: Integration, Evidence, and Return

- [x] T018 [P] Add the verified LN-080 interaction decision to `DESIGN.md` and update only the canonical ordinary-record rule in `docs/设计规范/规范/页面/记录与结构管理页面规范.md`
- [x] T019 [P] Add the narrow existing-record inline-edit call chain to `ARCHITECTURE.md` only if implementation changes the documented composer runtime boundary; otherwise record the justified no-change result in `specs/015-inline-record-edit/plan.md`
- [x] T020 Run all LN-080 focused Node/browser regressions and inspect failure output for false positives or stale screenshots
- [x] T021 Run `npm run design:check` and inspect 390px Time/Category inline-edit and time-surface evidence plus 320/426/768/1280 geometry
- [x] T022 Run the complete `npm run check` quality gate and `git diff --check` with Node 22
- [x] T023 Review the final diff against the declared write set, spec, plan, Constitution, and LN-080 acceptance; preserve every unrelated dirty change and generated evidence exclusion
- [x] T024 Record exact returned evidence and remaining real-mobile/product-owner checks in `PROJECT_BOARD.md`; do not mark LN-080 Accepted

## Rework Phase: Owner 390px Density Feedback

- [x] T025 Reconcile the marked 390px feedback into `product.md`, the LN-080 spec/plan, `DESIGN.md`, and the canonical record-page rule before code changes
- [x] T026 Add a focused browser assertion for one localized secondary stream-add action, its existing-composer behavior, no ordinary row background rule, compact `44px+` row geometry, and 320/390/426/768/1280px overflow
- [x] T027 Add the secondary stream action through the existing `openNewEntry` callback and apply scoped rule-free compact ordinary-row styles without changing fixed records, the lower dock, or persistence
- [x] T028 Run the focused LN-080 journey, `npm run design:check`, `npm run check`, and `git diff --check`; inspect the same 390px state and record only verified evidence
- [x] T029 Reconcile the marked 390px short-dash removal into the LN-080 product, design, spec, plan, board, and canonical page rule without changing time/content behavior
- [x] T030 Extend the focused browser evidence to require no time/content pseudo-element or raster asset and a reclaimed `4–10px` content inset at 320/390/426/768/1280px in Time and Category views
- [x] T031 Remove the ordinary-row time/content dash and narrow only the released content inset while retaining separate `44px+` time/content targets and focus treatment
- [x] T032 Re-run focused LN-080, design validation, complete quality gate, 390px visual comparison, and `git diff --check`; record exact evidence without marking Accepted
- [x] T033 Reconcile the marked pencil/blur-save interaction into LN-080 product, design, spec, plan, board, and canonical page rules before final verification
- [x] T034 Add one `44px+` localized pencil for free-text ordinary records; swap only the content cell for a focused textarea, autosave a content-only patch on blur, cancel on Escape, and retain the input on empty/failed save
- [x] T035 Preserve the detailed inline editor from content activation, structured-record safety, the independent time popup, Agent/account boundaries, and add focused Time/Category plus five-width regression evidence
- [x] T036 Inspect the 390px read/input states, run design validation, focused LN-080, the complete quality gate, and `git diff --check`, then update design QA and Returned evidence without marking Accepted

## Rework Phase: Owner Inline Quick-Add and Second Precision

- [x] T037 Reconcile the supplied compact-row reference into LN-080 product, design, spec, plan, data model, UI contract, checklist, and board boundaries while preserving the unrelated active Spec Kit pointer
- [x] T038 Add failing model/browser coverage for legacy `HH:mm`, new `HH:mm:ss`, live-unfocused/frozen-focused time, explicit refresh, blur/Enter one-write, empty/Escape/failure zero-write, and no standalone add button
- [x] T039 Replace the stream add button with the compact time/input row, add a dedicated second-precision local formatter, and keep the lower full composer path unchanged
- [x] T040 Extend only affected time validators and the existing time fine-tuning input for second precision without migrating old records or changing record shape
- [x] T041 Run focused model/browser checks, design validation, the complete quality gate, `git diff --check`, and 390px source-versus-implementation visual QA; record Returned evidence without marking Accepted

## Dependencies and Execution Order

- T001–T003 block application edits.
- T004–T006 establish failing behavior before T007–T017.
- US1 establishes inline form ownership before US2 mounts the independent time surface; US3 verifies the less-frequent preserved capabilities after the shared form is stable.
- T018–T019 describe only verified behavior. T020–T024 block Return.
- The main checkout has one writer; `[P]` marks dependency independence only.

## Parallel Opportunities

- T003, T004, and T005 touch separate files after reconciliation, but remain serialized under the one-writer rule.
- T018 and the conditional T019 are documentation-only and may be reasoned independently after implementation, but one writer applies them.

## Implementation Strategy

1. Deliver US1 as the smallest visible improvement while preserving the new-record modal.
2. Add US2's time-only surface with a pure invariant and no additional persistence path.
3. Complete US3 so the simplification does not remove current edit/delete capabilities.
4. Return only after focused and full gates pass; keep subjective real-mobile preference pending.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite, OKR modification, or worktree merge.
- New dependencies, migrations, network boundaries, autosave, new metadata, Plan/fixed-record redesign, right-rail changes, or broad cleanup.
