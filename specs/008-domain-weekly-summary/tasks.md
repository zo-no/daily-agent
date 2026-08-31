---
description: "Log Note dependency-ordered implementation task list"
---

# Tasks: Confirmed Seven-Day Domain Summary

**Board Item**: `LN-074 Rework 16`
**Input**: Feature artifacts from `/specs/008-domain-weekly-summary/`
**Prerequisites**: `spec.md`, `plan.md`, Constitution check, clear board readiness and permissions

> Tests are mandatory. Checkboxes track feature-package execution evidence only;
> `PROJECT_BOARD.md` remains the sole task-status and acceptance source.

## Format: `[ID] [P?] [Story?] Description with exact path`

- **[P]** means dependency-independent work in different files. It does not authorize concurrent
  writers in the main checkout.
- **[Story]** maps implementation and tests to one independently testable user story.
- Every task names exact paths, verification, and relevant exclusions.

## Phase 1: Reconcile and Guard the Work

- [x] T001 Reconcile `LN-074 Rework 16`, the completed LN-010 line dependency, dirty working tree,
  permissions, one-writer scope, and current evidence in `PROJECT_BOARD.md`, `product.md`, and `git status`
- [x] T002 Confirm the exact write set, exclusions, integration order, privacy boundary, manual
  evidence, and removal path in `specs/008-domain-weekly-summary/plan.md`
- [x] T003 [P] Add the isolated-experiment product admission and exit condition to `product.md`
- [x] T004 [P] Register `specs/008-domain-weekly-summary/` in `specs/README.md` and switch
  `.specify/feature.json` only after the LN-010 interactive line implementation passes focused tests

## Phase 2: Failing Regression and Contract Coverage

**Purpose**: Lock the seven-day selector, strict API, safety rejection, and two-step UI before implementation.

- [x] T005 [P] Add failing selector/model tests for cross-month/year windows, domain/type filtering,
  unassigned/other-domain exclusion, Unicode 4000 bound, newest-80 truncation, request whitelist,
  fabricated IDs, duplicate/overlong themes, and investment rejection in `tests/domain-review-model.test.mjs`
- [x] T006 [P] Add failing route/provider tests for origin, JSON, Bearer/Supabase verification,
  per-user rate limit, 256 KiB, 20s server/25s client timeout, strict keys, Abort, private/no-store,
  and no local fallback in `tests/ai-domain-review-route.test.mjs`
- [x] T007 [P] Extend the existing domain-insights browser scenario with first-click zero request,
  cancel, confirm exactly one whitelist request, limited/zero/result/error/reconfirm/abort/context
  clearing, no writes/index/chat, focus, and supported widths in `e2e/run-mobile.mjs`
- [x] T008 Run the focused tests and record their expected pre-implementation failures without
  changing unrelated snapshots or evidence

## Phase 3: User Story 1 - Review the Data Boundary (Priority: P1)

**Goal**: Build the exact current-domain seven-day selection and request-free disclosure.

**Independent Test**: Synthetic ordinary/periodic records produce exact disclosure totals and a
strict newest-80 payload; opening/canceling disclosure creates zero requests and zero writes.

- [x] T009 [US1] Implement pure local date validation, current-domain/category/template filtering,
  subtype counts, deterministic Unicode bounds, and disclosure/truncation facts in
  `src/lib/domain-review-model.mjs`
- [x] T010 [US1] Implement the idle/disclosure/zero-state markup and localized copy in
  `src/app/insights/weekly-summary.js`, `src/app/insights/insights-page.js`, and `src/lib/i18n.mjs`
- [x] T011 [US1] Implement the ruled secondary-action/disclosure hierarchy, 44px targets, wrapping,
  focus, live status, and reduced-motion behavior in `src/app/insights/insights.css`
- [x] T012 [US1] Run selector and request-free disclosure regressions and confirm the account payload
  remains byte-identical

## Phase 4: User Story 2 - Receive One Bounded Summary (Priority: P1)

**Goal**: Send one confirmed strict request and show one concise validated result.

**Independent Test**: A confirmed synthetic request hits the independent route once and displays
only a bounded overview and up to three themes, with no IDs/index/chat/persistence.

- [x] T013 [US2] Implement strict input/output normalization, response ID allowlisting, duplicate/
  length rejection, limited-sample facts, and investment safety in `src/lib/domain-review-model.mjs`
- [x] T014 [US2] Implement structured DeepSeek generation, system constraints, 20s abort, route
  authentication/rate/body/no-store boundaries in `src/lib/domain-review-route.mjs` and
  `src/app/api/organize/domain-review/route.js`
- [x] T015 [US2] Implement the exact browser request, token handling, 25s timeout, Abort propagation,
  response validation, and typed no-fallback failures in `src/lib/domain-review-provider.mjs`
- [x] T016 [US2] Integrate confirm/loading/result/re-analysis states and generation-context checks in
  `src/app/insights/weekly-summary.js` and `src/app/insights/insights-page.js`
- [x] T017 [US2] Run model/route/provider/browser success regressions and inspect the captured JSON
  for forbidden fields and source-payload mutation

## Phase 5: User Story 3 - Fail Safely (Priority: P1)

**Goal**: Make every unavailable, abort, stale, invalid, and financial-safety path explicit without
weakening the local line.

**Independent Test**: Stop/offline/no-token/no-config/timeout/invalid/unsafe/context-switch fixtures
show short unavailable states, no late result, no local AI imitation, no writes, and an operable line.

- [x] T018 [US3] Complete strict unsafe-output and response-shape rejection plus typed failure mapping
  in `src/lib/domain-review-model.mjs`, `src/lib/domain-review-route.mjs`, and
  `src/lib/domain-review-provider.mjs`
- [x] T019 [US3] Abort and clear disclosure/loading/result on Stop, re-analysis, domain/account
  change, and unmount in `src/app/insights/weekly-summary.js` and `src/app/insights/insights-page.js`
- [x] T020 [US3] Preserve the visible investment non-advice boundary and render concise localized
  unavailable/limited states without provider text in `src/app/insights/weekly-summary.js`,
  `src/app/insights/insights.css`, and `src/lib/i18n.mjs`
- [x] T021 [US3] Run all failure/cancellation/late-response/offline tests and verify the local chart
  remains interactive in every remote-failure state

## Final Phase: Integration, Evidence, and Return

- [x] T022 [P] Update verified behavior in `DESIGN.md` and
  `设计规范/规范/页面/领域复盘页面规范.md`; keep LN-010 local-only and name AI as removable secondary
- [x] T023 Run all focused unit/route/provider/browser/PWA regressions and inspect failure output for
  false positives, stale screenshots, private text, IDs/index/chat, forbidden fields, or hidden writes
- [x] T024 Run same-state 390×844 reference/implementation comparison, supported-width review, and
  `npm run design:check`; update repository-root `design-qa.md` with `final result: passed`
- [x] T025 Run the complete `npm run check` quality gate and `git diff --check`
- [x] T026 Review the final diff against both 007/008 specs, Constitution, declared write set, and
  dirty-tree ownership; preserve all unrelated source/output changes
- [x] T027 Record exact returned evidence and remaining real-model Chinese/8-second/privacy/14-day
  checks in `PROJECT_BOARD.md` without marking Accepted; do not commit, push, publish, or deploy

## Dependencies and Execution Order

- T001–T004 and checked privacy/requirements lists block application implementation.
- LN-010's focused unit/browser/PWA/design checks and same-state comparison passed before this
  package became active. Its final repository-wide gate is shared after this overlapping page slice
  and has now passed with the corresponding 007/008 closure tasks complete.
- T005–T008 fail before T009–T021 implement the corresponding contracts.
- The browser selector/disclosure (US1) precedes route generation (US2); safe failure (US3) completes
  before documentation or full gates.
- Documentation describes verified behavior only; the full gate and diff review passed, while the
  real-model Chinese/latency/privacy and 14-day product observations remain pending.

## Implementation Strategy

1. Prove the exact local whitelist and request-free first click.
2. Add one authenticated request and smallest valid result.
3. Add cancellation/stale/unsafe failure closure.
4. Validate the integrated local line plus optional AI at all widths and offline.

## Prohibited Without Explicit Authorization

- Commit, push, PR creation, publication, deployment, destructive deletion, reset, history rewrite,
  OKR modification, or worktree merge.
- Database/sync/backup fields, persisted AI entities, attachments/images, market data, chat,
  background generation, new home controls, or broad refactors.
