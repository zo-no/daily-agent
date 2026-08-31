---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Book-page Ritual

**Board Item**: `LN-076`
**Input**: Feature artifacts from `/specs/005-book-page-ritual/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-076`, the active `specs/005-book-page-ritual/` package, the dirty working tree, dependencies, permissions, and current evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`
- [x] T002 Confirm the exact write set, exclusions, single-writer ownership, and acceptance evidence in `specs/005-book-page-ritual/plan.md` before editing application files
- [x] T003 [P] Add the durable `LN-076` admission, default-cost, offline/privacy, verification/removal, and exit-condition wording to `product.md` without changing existing feature decisions

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Define the visual, interaction, accessibility, and safety boundary before implementation.

- [x] T004 Add one focused `book-page ritual` browser journey to `e2e/run-mobile.mjs` covering home, populated timeline, composer, one-action open/save, local material assets, owned vertical gaps, binding gutter, note primacy, 44px targets, focus, reduced motion, and 320/390/426/768/1280px overflow
- [x] T005 Run `E2E_TEST_FILTER="book-page ritual" node e2e/run-mobile.mjs` and record the expected pre-implementation failure without changing unrelated screenshots or existing evidence

## Phase 3: User Story 1 - Enter a convincing private journal (Priority: P1)

**Goal**: Make the existing home shell read as one restrained archival journal with an owned first content boundary and meaningful binding gutter.

**Independent Test**: The empty and populated home states share one local paper/ink/binding system at all target widths, retain the current actions, and contain no dominant accidental blank band or overflow.

- [x] T006 [US1] Implement scoped journal material, page-depth, and binding-gutter presentation in `src/app/globals.css`, `src/app/home-header.css`, and `src/app/home-timeline.css` without adding JavaScript, network assets, controls, or routes
- [x] T007 [US1] Tighten the empty-day first content boundary and fixed-ledger introduction in `src/app/home-fixed-records.css` while preserving open-paper rows, hidden domain semantics, and inline inputs
- [x] T008 [US1] Run the focused `book-page ritual` journey in `e2e/run-mobile.mjs` and verify the home/material assertions pass before continuing

## Phase 4: User Story 2 - Read past entries as authored journal lines (Priority: P1)

**Goal**: Establish a compact editorial reading rhythm in which original records remain primary and every section gap has one meaning.

**Independent Test**: A day with multiple ordinary records, Agent entry, tags, and fixed records scans as one continuous page with correct time/record hierarchy, no card wall, no content overlap, and no rail collision.

- [x] T009 [US2] Refine timeline and grouped record spacing, ink hierarchy, rules, hover/focus feedback, and Agent interval isolation in `src/app/home-timeline.css` without changing the established 16px Sans authored-note role
- [x] T010 [US2] Refine fixed-record label/value rhythm and section proximity in `src/app/home-fixed-records.css` while retaining 44px inline controls, visible focus, and the current save behavior
- [x] T011 [US2] Run the focused `book-page ritual` journey plus the existing home-hierarchy and right-rail filters in `e2e/run-mobile.mjs` and resolve only regressions caused by LN-076

## Phase 5: User Story 3 - Make a note through a deliberate but still quick editor (Priority: P1)

**Goal**: Make the ordinary composer feel like a lifted leaf from the same journal while keeping writing and Done immediately obvious.

**Independent Test**: At every target width the existing record action opens the editor once, normal text saves once through Done unchanged, optional controls remain secondary, and the dialog has no overflow or target-size regression.

- [x] T012 [US3] Implement the page-leaf surface, book-like header, writing-area hierarchy, restrained ink actions, and compatible details treatment in `src/app/entry-composer.css` without changing `src/app/record-composer.js` behavior
- [x] T013 [US3] Run the focused `book-page ritual`, Markdown composer, formatting, and mobile-target regressions in `e2e/run-mobile.mjs` and confirm exact saved-text preservation

## Final Phase: Integration, Evidence, and Return

- [x] T014 [P] Update the durable LN-076 visual and interaction contract in `DESIGN.md`, `设计规范/规范/基础/视觉系统规范.md`, `设计规范/规范/页面/记录与结构管理页面规范.md`, and `设计规范/规范/交互/反馈与动效规范.md` only where the verified treatment changes the contract
- [x] T015 Run the complete focused regression, inspect output for false positives, and capture `output/playwright/ln-076-book-page-ritual/ln-076-home-390.png`, `output/playwright/ln-076-book-page-ritual/ln-076-timeline-390.png`, `output/playwright/ln-076-book-page-ritual/ln-076-composer-390.png`, and `output/playwright/ln-076-book-page-ritual/ln-076-visual-evidence.json`
- [x] T016 Run `npm run design:check` and visually review home, timeline, composer, keyboard focus, and reduced motion at 320/390/426/768/1280px against `specs/005-book-page-ritual/contracts/ui-contract.md`
- [x] T017 Run the complete `npm run check` quality gate and `git diff --check`
- [x] T018 Review the final diff against `specs/005-book-page-ritual/spec.md`, `specs/005-book-page-ritual/plan.md`, the Constitution, the declared write set, and unrelated dirty changes
- [x] T019 Record returned evidence and genuinely pending product-owner/14-day checks in `PROJECT_BOARD.md`; do not mark `LN-076` Accepted without independent verification

## Dependencies and Execution Order

- T001–T002 block every application edit; T003 can proceed after reconciliation.
- T004–T005 establish the failing regression before T006–T013.
- User Story 1 supplies the shared material and gutter contract used by User Stories 2 and 3.
- User Story 2 depends on the shared material but remains independently verifiable as a populated-day reading flow.
- User Story 3 depends only on the shared material tokens and remains independently verifiable through the composer journey.
- T014 documents verified behavior after story implementation; T015–T019 are ordered return gates.
- `[P]` markers identify file-independent work only; one writer remains active in the main checkout.

## Parallel Opportunities

- T003 may be drafted independently of the E2E assertion work after T001–T002, but the main-checkout writer executes them serially.
- T014's design-source files are independent of screenshot capture after the verified contract is stable, but remain serial in this checkout.
- No application CSS tasks are marked parallel because their cascade and shared visual tokens require ordered integration.

## Implementation Strategy

1. Land the User Story 1 journal shell and binding gutter as the smallest visible slice.
2. Validate it independently before changing record rhythm.
3. Add the populated reading flow, then the composer, preserving each story's focused evidence.
4. Stop and rework within `LN-076` on any regression; do not create a duplicate board item.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- New dependencies, migrations, network data boundaries, homepage controls, required recording
  fields, data-model changes, or broad refactors outside the admitted presentation scope.

## Rework 1: Agent Peeks From The Binding Edge

- [x] T020 Record the product-owner's marked 390px feedback in `spec.md` and
  `contracts/ui-contract.md`: the existing Agent must live primarily in the right binding gutter
  and leave the mobile writing plane free of idle copy.
- [x] T021 Add failing 320/390/426px geometry and visibility assertions to `e2e/run-mobile.mjs` for
  the outer-edge anchor, gutter-majority placement, limited page intrusion, hidden idle copy, zero
  content overlap, and the preserved 44px target.
- [x] T022 Implement the mobile-only placement in `src/app/home-timeline.css` using the existing
  local figure/path assets; do not change Agent behavior, data, routes, copy translations, or
  desktop layout.
- [x] T023 Run the focused book-page, Diary Agent, right-rail, design, and repository quality gates;
  capture same-size comparison evidence in `output/playwright/ln-076-agent-peek/`, update
  `design-qa.md`, and reconcile `PROJECT_BOARD.md` only after independent verification.

## Rework 2: Replace The Figure With A Generic Spine-line Spirit

- [x] T024 Reconcile the selected first ideation result, product-owner feedback, Rework 1 evidence,
  current dirty tree, and exact write set in `PROJECT_BOARD.md`, `spec.md`, `plan.md`, and
  `contracts/ui-contract.md`; keep user-facing customization, persistence, upload, remote assets,
  Plan Agent redesign, commit, push, and deploy out of scope.
- [x] T025 Add failing appearance-contract coverage in `tests/agent-appearance.test.mjs` and failing
  320/390/426px visual/geometry assertions in `e2e/run-mobile.mjs` for the stable default ID, local
  bounded state assets, unknown-ID fallback, page-edge occlusion, binding continuity, no idle copy,
  zero record overlap, and the unchanged 44px button.
- [x] T026 Generate and inspect the selected transparent graphite spirit asset at
  `public/ui/diary/agent-spine-spirit.png`, using the selected first ideation image as the art-direction
  truth; preserve a local reference capture for same-state QA and add the final asset to `public/sw.js`.
- [x] T027 Implement the frozen appearance definition and fallback resolver in
  `src/lib/agent-appearance.mjs`, plus the presentation-only renderer in
  `src/app/agent-appearance.js`; the renderer may receive status but must not own Agent behavior,
  copy, accessibility, storage, network, or writes.
- [x] T028 Replace the Diary page's hard-coded helper/path markup in `src/app/page.js` and implement
  the selected right-binding geometry, occlusion, focus/hit behavior, and reduced-motion treatment in
  `src/app/home-timeline.css` without changing Plan Agent or active review behavior.
- [x] T029 Run the focused appearance unit test and the book-page/Diary Agent/right-rail browser
  filters; capture 320/390/426px evidence in `output/playwright/ln-076-agent-spirit/` and fix only
  regressions caused by Rework 2.
- [x] T030 Compare the exact selected visual target and the same-state 390px implementation in one
  normalized comparison input, record each P0/P1/P2 iteration in `design-qa.md`, and stop before
  handoff unless its final result is `passed`.
- [x] T031 Update verified contracts in `DESIGN.md` and the applicable Chinese design sources, run
  `npm run design:check`, `npm run check`, and `git diff --check`, then record returned evidence in
  `PROJECT_BOARD.md`; independent acceptance remains separate from task checkbox completion.

## Rework 3: Persistent Multi-state Agent Activity Stage

- [x] T032 Reconcile the product owner's three marked screenshots and direct correction into
  `PROJECT_BOARD.md`, `product.md`, `spec.md`, `plan.md`, `data-model.md`, `research.md`, and
  `contracts/ui-contract.md`; preserve Plan/no-record visibility, behavior, data, and customization
  exclusions.
- [x] T033 Add failing unit coverage for distinct local `idle/scanning/reviewing/complete` assets and
  failing browser assertions for a non-collapsed reviewing stage, all-state visibility, stage/gutter
  containment, zero content/control overlap, and deterministic reduced-motion positions at
  320/390/426px.
- [x] T034 Generate, inspect, normalize, and cache transparent `scanning`, `reviewing`, and `complete`
  graphite-spirit assets that preserve the selected identity and stay within the raster budget.
- [x] T035 Implement the four-state appearance mapping and persistent activity-stage markup/CSS in
  `src/lib/agent-appearance.mjs`, `src/app/agent-appearance.js`, `src/app/page.js`, and
  `src/app/home-timeline.css` without moving Agent session behavior into the renderer.
- [x] T036 Run the focused appearance, book-page, Diary Agent, right-rail, and PWA checks; inspect
  320/390/426px idle, scanning, reviewing, complete, and reduced-motion captures, fixing only Rework 3
  regressions.
- [x] T037 Compare the marked owner references and the implementation states in one normalized input,
  update `design-qa.md`, and stop before handoff unless its final result is `passed`.
- [x] T038 Update verified durable design contracts, run `npm run design:check`, `npm run check`, and
  `git diff --check`, then return evidence to `PROJECT_BOARD.md` without marking Accepted.

## Rework 4: Compact Category Chapters And One Boundary Rule

- [x] T039 [US2] Reconcile the product owner's marked 390px Category screenshot into
  `PROJECT_BOARD.md`, `product.md`, `spec.md`, `plan.md`, `research.md`, `quickstart.md`, and
  `contracts/ui-contract.md`; preserve names, hierarchy data, fixed-record behavior, Time view,
  Agent, account, offline, sync, backup, and export boundaries.
- [x] T040 [US2] Add failing responsive assertions in `e2e/run-mobile.mjs` for distinct domain and
  first-category headings on one compact line, accessible periodic progress, safe wrapping, explicit
  later-category hierarchy, one visible adjacent-domain rule, 44px periodic inputs, and no overflow
  at 320/390/426/768/1280px.
- [x] T041 [US2] Implement the compact domain/first-category semantic presentation in
  `src/app/home-record-views.js` without changing the underlying group/category arrays, identifiers,
  ordering, entries, or save callbacks.
- [x] T042 [US2] Implement compact chapter-line typography/wrapping and remove the redundant next-
  domain top rule in `src/app/home-timeline.css`, keeping the last row divider and 24–32px section
  whitespace as the only visible transition.
- [x] T043 [US2] Capture the same seeded 390px Category state under
  `output/ln-076-category-chapters/`, combine it with the marked owner reference, and update
  `design-qa.md` through a passing same-viewport comparison.
- [x] T044 [US2] Update verified durable rules in `DESIGN.md` and the applicable Chinese design
  sources, run the focused Category regression, `npm run design:check`, `npm run check`, and
  `git diff --check`, then return evidence in `PROJECT_BOARD.md` without marking Accepted.

## Rework 5: Date-led Header, Rail View Toggle, And Flow-free Agent

- [x] T045 [US1] Reconcile the three marked 390px references into `PROJECT_BOARD.md`, `product.md`,
  `spec.md`, `plan.md`, `research.md`, `quickstart.md`, `contracts/ui-contract.md`, and the built-in
  requirements checklist; preserve the single LN-076 board identity and all data/network boundaries.
- [x] T046 [US1] Add a failing Rework 5 browser scenario in `e2e/run-mobile.mjs` for one primary date
  disclosure, no separate Calendar rail action, Diary Search/Settings/view/workspace and Plan
  Search/Settings/workspace order, 44px single toggles, one-action Time/Category and Diary/Plan
  switching, no lower workspace duplicate, picker Escape/focus behavior, and responsive overflow at
  320/390/426/768/1280px.
- [x] T047 [US2] Extend the failing scenario for a zero-height Agent mount after the shared date
  context, no overlap with collapsed/expanded calendar, one visible binding line, exactly one
  ordinary-to-fixed horizontal transition rule, no
  ordinary-to-fixed spacer, four-state and reduced-motion visibility, and zero overlap with records,
  inline review, fixed fields, directory labels, or rail/actions in `e2e/run-mobile.mjs`.
- [x] T048 [US1] Implement the date-led disclosure, Diary-only rail record-view toggle, and shared
  single-button rail workspace toggle in
  `src/app/home-header.js`, `src/app/home-header.css`, and `src/lib/i18n.mjs` without changing the
  picker kernel, swipe behavior, selected date, Search/Settings, or Diary/Plan semantics; remove the
  lower workspace duplicate from `src/app/page.js`.
- [x] T049 [US2] Compose the unchanged Agent action/state mount after shared date context in
  `src/app/page.js` and `src/app/home-record-views.js`, then implement zero-flow binding placement and
  single-spine optical alignment in `src/app/home-timeline.css` and remove the duplicate fixed-section
  top rule in `src/app/home-fixed-records.css` without changing Agent behavior,
  assets, inline review, record/fixed data, or Plan/empty-day rules.
- [x] T050 [US1] Capture collapsed and expanded 390px states plus all target widths under
  `output/ln-076-date-rail-agent/`, compare the six owner references and implementation in one
  normalized input, and update `design-qa.md` until `final result: passed`.
- [x] T051 [US1] Update verified durable design sources, run focused date/header/Agent regressions,
  `npm run design:check`, full `npm run check`, and `git diff --check`, then return evidence in
  `PROJECT_BOARD.md` without marking Accepted.

## Rework 6: Dual-label Rail Rockers

- [x] T052 [US1] Reconcile the product-owner's cropped 390px rail feedback into
  `PROJECT_BOARD.md`, `product.md`, `spec.md`, `plan.md`, `research.md`, `quickstart.md`, and
  `contracts/ui-contract.md`; retain the single LN-076 identity and all behavior/data exclusions.
- [x] T053 [US1] Extend the existing Rework 5 journey in `e2e/run-mobile.mjs` with failing
  assertions for two visible localized labels, one current option, one raised thumb, changed thumb
  position after one click, untruncated copy, 44px targets, focus/reduced-motion, Plan omission,
  narrow-picker clearance, and responsive overflow.
- [x] T054 [US1] Implement one shared presentation-only rocker in `src/app/home-header.js` and the
  archival-paper mobile/desktop treatment in `src/app/home-header.css`, adjusting only narrow picker
  clearance in `src/app/home-calendar.css` and post-stack directory clearance in
  `src/app/home-timeline.css` if geometry requires them; preserve callbacks, state, accessible action
  names, directory ownership, and one-button semantics while placing Settings after Search.
- [x] T055 [US1] Run the focused header/date journey, inspect 320/390/426/768/1280px and reduced
  motion, capture a 390px rocker screenshot under `output/ln-076-rail-rockers/`, and resolve only
  Rework 6 regressions.
- [ ] T056 [US1] Update verified durable design sources, run `npm run design:check`, full
  `npm run check`, and `git diff --check`, then return evidence in `PROJECT_BOARD.md` without marking
  LN-076 Accepted.

## Rework 7: Quiet Composer Details

- [x] T057 [US3] Reconcile the product owner's 2026-08-30 composer capture into
  `PROJECT_BOARD.md`, `product.md`, `spec.md`, `plan.md`, `research.md`, `quickstart.md`, and
  `contracts/ui-contract.md`; retain LN-076 and exclude behavior, field, data, sync, and backup work.
- [x] T058 [US3] Extend the focused composer journey in `e2e/run-mobile.mjs` with failing assertions
  for disclosure semantics, bounded details-open writing height, metadata/attachment/danger order,
  44px targets, focus, reduced motion, responsive overflow, and exact saved-text preservation.
- [x] T059 [US3] Add presentation-only semantic grouping in `src/app/record-composer.js`: one stable
  controlled details region, one metadata group, and one existing-record danger footer; preserve all
  fields, values, callbacks, conditions, confirmation, and dialog behavior.
- [x] T060 [US3] Implement the closed/open-details archival composition in
  `src/app/entry-composer.css` and only necessary attachment-section rules in
  `src/app/attachments.css`, preserving a dominant writing leaf, restrained field geometry, safe-area
  padding, 44px targets, visible focus, and reduced-motion behavior.
- [x] T061 [US3] Run focused composer, Markdown, formatting, attachment, delete, target, and
  responsive regressions; inspect 320/390/426/768/1280px and capture closed/expanded 390px evidence
  under `output/playwright/ln-076-composer-rework7/`.
- [ ] T062 [US3] Update verified durable design sources, run `npm run design:check`, full
  `npm run check`, and `git diff --check`, then return evidence in `PROJECT_BOARD.md` without marking
  LN-076 Accepted.

## Rework 8: Viewport-fixed Spine Companion

- [x] T063 [US2] Reconcile the approved viewport-fixed Agent plan into `PROJECT_BOARD.md`,
  `product.md`, `DESIGN.md`, the three routed design standards, and every relevant
  `specs/005-book-page-ritual/` artifact. Explicitly supersede Rework 5 only for Agent placement,
  empty-date visibility, and motion; preserve Rework 6 rockers and Rework 7 composer scope.
- [x] T064 [US2] Add failing appearance/PWA contracts in `tests/agent-appearance.test.mjs` and
  `e2e/run-pwa.mjs` for per-state static/motion/intrinsic fields, legacy alias fallback,
  character-only transparent assets, byte bounds, service-worker precache, and offline retrieval.
- [x] T065 [US2] Extend the focused Diary Agent journey in `e2e/run-mobile.mjs` with failing
  assertions for all-date Diary visibility, Plan/Search/Settings/composer hiding, top/middle/bottom
  viewport containment, upper/lower rail collision avoidance, calendar tuck, state timing, focus/
  press/background/reduced-motion pause, 44px co-located target, empty-date dismissal/no-write, and
  exactly one spine at 320/390/426/600/700/768/1280px.
- [x] T066 [US2] Generate and validate the bundled character-only static and motion frames under
  `public/ui/diary/`, update `src/lib/agent-appearance.mjs`, `src/app/agent-appearance.js`,
  `public/sw.js`, and PWA verification without adding a dependency, network request, preference,
  storage field, or backup member.
- [x] T067 [US2] Move the Diary Agent from `src/app/home-record-views.js` into one fixed
  application-shell layer in `src/app/page.js`; add only transient empty-date/document-visibility
  presentation state and preserve populated-date review behavior, writes, cancellation, and focus.
- [x] T068 [US2] Implement the collision-safe `320–700px` patrol, desktop still peek, four state
  rhythms, compact calendar pose, focus/press/background/reduced-motion pause, and localized
  empty-date margin note in `src/app/home-timeline.css` and `src/lib/i18n.mjs`.
- [x] T069 [US2] Run focused unit/PWA/browser regressions, inspect all target widths and states,
  build a same-viewport owner/implementation comparison, set `design-qa.md` only after visual
  evidence passes, run `npm run design:check`, full `npm run check`, and `git diff --check`, then
  record truthful evidence in `PROJECT_BOARD.md` without marking owner preference complete.
- [x] T070 [US2] Replace the four source-faithful motion APNGs in `public/ui/diary/` with visibly
  different six-frame local actions: idle grip/reach/body-follow, scanning stretch/retract,
  reviewing hand-to-chin thinking with gaze changes, and complete coil/re-grip/settle; keep every
  file RGBA, looped, `128×128`, under `100KB`, and on the existing real spine.
- [x] T071 [US2] Extend `src/lib/agent-appearance.mjs` and `src/app/agent-appearance.js` with frozen
  frame-count/cycle/pose/gaze metadata while preserving `staticAsset`, `motionAsset`,
  `intrinsicSize`, `motionMode`, legacy `asset`, unknown-ID fallback, and zero persistence.
- [x] T072 [US2] Keep the outer 28/20/32/30-second patrol slow while freezing focus, press, and
  background pauses at their current traveler position; keep Calendar and reduced motion at their
  deterministic compact/static positions and preserve the synchronized hit target.
- [ ] T073 [US2] Add APNG frame/delay/loop, browser motion-profile, and populated-idle hint
  regressions; inspect the live 390px idle/scanning/reviewing/complete movement and the localized
  tap-to-analyze hint in the selected in-app browser, update durable design/board/QA evidence, and
  rerun the full quality gate without marking owner preference done.
