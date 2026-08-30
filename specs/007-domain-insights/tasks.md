---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Local Domain Insights

**Board Item**: `LN-010 Phase 1`
**Input**: Feature artifacts from `/specs/007-domain-insights/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile the active board item, dirty working tree, dependencies, permissions, and current validation evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`
- [x] T002 Split `LN-010` into the admitted local Phase 1 and dependency-gated persisted Phase 2 in `PROJECT_BOARD.md` without creating a competing backlog item
- [x] T003 [P] Add the local-domain-insights feature admission, financial-safety boundary, reversibility, and non-adoption condition to `product.md`
- [x] T004 Confirm the exact write set, exclusions, one-writer ownership, and acceptance evidence in `specs/007-domain-insights/plan.md` before editing application files
- [x] T005 [P] Register the feature package and its board mapping in `specs/README.md` and `.specify/feature.json`

## Phase 2: Failing Regression and Shared Contracts

**Purpose**: Define local aggregation, navigation, accessibility, investment safety, and offline behavior before implementation.

- [x] T006 [P] Add failing unit coverage for date boundaries, domain mapping, unresolved records, periodic split, evidence thresholds, source excerpts, immutability, and 5,000-record cost in `tests/analytics-model.test.mjs`
- [x] T007 [P] Add failing browser coverage for the current-domain entry, query fallback, domain switching, chart alternative, investment boundary, recovery/empty state, and responsive targets in `e2e/run-mobile.mjs`
- [x] T008 [P] Add failing direct-offline route and cache-version assertions for `/insights` and its local icon in `e2e/run-pwa.mjs`
- [ ] T009 Run the focused model, browser, and PWA tests and record their expected pre-implementation failures in `PROJECT_BOARD.md`
- [x] T010 Generate and visually inspect the transparent hand-drawn rail asset at `public/ui/diary/rail-insights.png`; do not substitute text, emoji, inline SVG, or CSS-drawn art
- [x] T011 Add the complete localized entry, loading, empty, trend, evidence, investment, and accessibility copy contract to `src/lib/i18n.mjs`

## Phase 3: User Story 1 - Open a Focused Domain Review (Priority: P1)

**Goal**: Reach a secondary page focused on the currently active mobile domain in one action, with a safe desktop entry and one-action return.

**Independent Test**: At 390 px, changing the current scroll-spy domain moves one separate 44 px analysis link beside that domain; the domain mark still scrolls, the link opens `/insights?domain=<id>`, and return reaches the Diary. Desktop exposes one secondary entry without changing the mobile upper-rail order.

- [x] T012 [US1] Implement the current-domain-only analysis link and accessible domain label in `src/app/home-domain-rail.js`
- [x] T013 [US1] Preserve binding-axis geometry, non-overlap, focus visibility, and 44 px target sizing in `src/app/home-timeline.css`
- [x] T014 [US1] Add the desktop-only secondary Insights entry without changing mobile rocker ordering in `src/app/home-header.js` and `src/app/home-header.css`
- [x] T015 [US1] Create the protected route shell, management-header return, query selection fallback, and safe hydration/recovery/empty states in `src/app/insights/page.js`, `src/app/insights/insights-page.js`, and `src/app/insights/insights.css`
- [x] T016 [US1] Add `/insights` and `public/ui/diary/rail-insights.png` to the versioned offline shell in `public/sw.js`, update `src/app/service-worker-registration.js`, and align assertions in `e2e/run-pwa.mjs`
- [x] T017 [US1] Run the focused User Story 1 browser and PWA regressions in `e2e/run-mobile.mjs` and `e2e/run-pwa.mjs`, including 320/390/426/768/1280 px geometry

## Phase 4: User Story 2 - Understand the Last 30 Days by Domain (Priority: P1)

**Goal**: Show deterministic, source-linked 30-day domain activity without modifying or persisting source data.

**Independent Test**: Given fixtures across both date boundaries, all totals, active days, ordinary/periodic counts, unresolved records, 30 points, evidence states, and recent excerpts reconcile exactly; the page remains useful with zero or insufficient data.

- [x] T018 [US2] Implement the pure bounded 30-day aggregation and validation model in `src/lib/analytics-model.mjs`
- [x] T019 [US2] Implement the Canvas line chart, non-color trend label, ResizeObserver sizing, and equivalent text summary in `src/app/insights/trend-chart.js`
- [x] T020 [US2] Integrate domain selection, sparse metrics, recent source evidence, unresolved notice, and neutral empty/insufficient prompts in `src/app/insights/insights-page.js`
- [x] T021 [US2] Implement the responsive open-paper field-report visual hierarchy and reduced-motion behavior in `src/app/insights/insights.css`
- [x] T022 [US2] Run `tests/analytics-model.test.mjs` and the focused User Story 2 browser cases in `e2e/run-mobile.mjs`, asserting source-payload equality before and after review

## Phase 5: User Story 3 - Receive a Cautious Investment Review Prompt (Priority: P2)

**Goal**: Help the author notice missing rationale, outcome, or risk-boundary notes without producing financial advice.

**Independent Test**: Synthetic investment-like domains show deterministic coverage facts, one source-linked recording prompt, and the non-advice boundary in all evidence states; generated output contains no transaction, security, price, timing, allocation, or return recommendation.

- [x] T023 [P] [US3] Extend failing safety coverage for localized investment-domain recognition, deterministic least-covered selection, every evidence state, and prohibited wording in `tests/analytics-model.test.mjs`
- [x] T024 [US3] Implement narrow investment-domain recognition and note-coverage derivation in `src/lib/analytics-model.mjs`
- [x] T025 [US3] Implement the evidence-first coverage rows, one fixed recording prompt, and always-visible non-advice boundary in `src/app/insights/insights-page.js` and `src/app/insights/insights.css`
- [x] T026 [US3] Run the focused model and browser financial-safety regressions in `tests/analytics-model.test.mjs` and `e2e/run-mobile.mjs`

## Final Phase: Integration, Evidence, and Return

- [x] T027 [P] Update verified product/design truth in `DESIGN.md`, `设计规范/index.md`, `设计规范/规范/页面/记录与结构管理页面规范.md`, and `设计规范/规范/页面/领域复盘页面规范.md`
- [x] T028 Run all focused regressions and inspect failure output for false positives, stale snapshots, prohibited wording, source mutation, and account leakage
- [x] T029 Run `npm run design:check`, inspect the feature in the in-app browser, and capture same-viewport home/reference plus 390/1280 px insights evidence under `output/playwright/`
- [x] T030 Complete the repository-root `design-qa.md` and require its final result to be `passed`
- [x] T031 Run the complete `npm run check` quality gate and `git diff --check`
- [x] T032 Review the final diff against the declared write set, spec, plan, Constitution, and board criteria while preserving unrelated dirty changes
- [x] T033 Record returned evidence, exact commands, screenshots, and pending 14-day real-use acceptance in `PROJECT_BOARD.md`; do not mark Accepted without independent controller verification

## Dependencies and Execution Order

- Reconciliation and write ownership (T001–T005) block application edits.
- Failing contracts (T006–T009) precede the corresponding implementation.
- The inspected local image asset and complete copy contract (T010–T011) precede UI integration.
- User Story 1 provides navigation and route states required by User Stories 2 and 3.
- User Story 2 provides the source-linked model and evidence surface required by User Story 3.
- Documentation records verified behavior only; final gate and diff review block return.

## Parallel Opportunities

- T003 and T005 are documentation-only and independent after T001, but one-writer ownership still serializes main-checkout edits.
- T006, T007, and T008 touch independent test files and can be designed in parallel before implementation.
- T023 can be designed against the stable model contract while responsive visual review for User Story 2 is prepared, but code edits remain serialized.
- Final durable-design updates in distinct documents can be drafted in parallel and integrated by the controller after verification.

## Implementation Strategy

1. Deliver the P1 navigation shell and current-domain context first.
2. Add the deterministic 30-day model and chart as the P1 useful vertical slice.
3. Add the P2 investment note-coverage review only after source-linked evidence and insufficient-data behavior pass.
4. Keep real-use acceptance pending for 14 days; implementation success alone cannot close the board item.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite, OKR modification, or worktree merge.
- New dependencies, migrations, market/AI/network boundaries, required recording fields, raw-note rewriting, persisted derived analysis, broad refactors, or financial action recommendations.
